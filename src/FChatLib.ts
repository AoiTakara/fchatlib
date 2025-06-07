'use strict';
import { writeFileSync, statSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import request from 'request';
import ws, { WebSocket } from 'ws';
import { z } from 'zod';
import CommandHandler from './CommandHandler';
import { CharacterGender, CharacterStatus } from './commonSchemas';
import {
  ClientCommandSchema,
  FChatClientCommandType,
  fchatClientCommandTypes,
  getClientCommand,
} from './fchatClientCommands';
import {
  FChatServerCommandType,
  fchatServerCommandTypes,
  getCommandObjectForCommand,
  type SchemaForCommand,
} from './FchatServerCommands';
import { configSchema, IConfig } from './Interfaces/IConfig';
import { IPlugin } from './Interfaces/IPlugin';

// eslint-disable-next-line no-undef
type Timeout = NodeJS.Timeout;

interface SavePlugin {
  name: string;
}

interface SavePluginMap {
  [channel: string]: SavePlugin[];
}

const savePluginMapSchema = z.record(
  z.string().describe('Channel name'),
  z.array(
    z
      .object({ name: z.string().describe('Plugin name') })
      .transform<IPlugin>((data) => ({ name: data.name, instanciatedPlugin: null }))
  )
);

interface Ticket {
  method: 'ticket';
  account: string;
  ticket: string;
  character: string;
  cname: string;
  cversion: string;
}

export type FChatListener<T> = (args: T) => void | Promise<void>;

const FCHAT_SOCKET_URL = 'wss://chat.f-list.net/chat2';

/** These are messages that we will always log when receiving. */
export const IMPORTANT_SERVER_MESSAGES = [
  fchatServerCommandTypes.ERROR,
  fchatServerCommandTypes.SYSTEM_MESSAGE,
  fchatServerCommandTypes.ADMIN_BROADCAST,
] as const;
export default class FChatLib {
  /** Listeners for events that aren't caught by any other listener. */
  private readonly genericEventListeners: FChatListener<unknown>[] = [];

  /** Listeners for events that are caught by a specific command. */
  private readonly commandListeners = Object.fromEntries(
    Object.values(fchatServerCommandTypes).map((command) => [command, []]) as [
      FChatServerCommandType,
      FChatListener<SchemaForCommand<FChatServerCommandType>>[],
    ][]
  ) as Record<FChatServerCommandType, FChatListener<SchemaForCommand<FChatServerCommandType>>[]>;

  addCommandListener<T extends FChatServerCommandType>(command: T, fn: FChatListener<SchemaForCommand<T>>): void {
    const listeners = this.commandListeners[command];
    if (!listeners) {
      throw new Error(`Command ${command} not found`);
    }
    listeners.push(fn);
  }

  removeCommandListener<T extends FChatServerCommandType>(command: T, fn: FChatListener<SchemaForCommand<T>>): void {
    const listeners = this.commandListeners[command];
    if (!listeners) {
      throw new Error(`Command ${command} not found`);
    }
    const index = listeners.indexOf(fn);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /** Listeners for events that aren't caught by any other listener. */
  addGenericEventListener(fn: FChatListener<unknown>): void {
    this.genericEventListeners.push(fn);
  }

  removeGenericEventListener(fn: FChatListener<unknown>): void {
    const index = this.genericEventListeners.indexOf(fn);
    if (index !== -1) {
      this.genericEventListeners.splice(index, 1);
    }
  }

  readonly config: Required<IConfig>;

  private usersInChannel: Record<string, string[]> = {};
  private chatOPsInChannel: Record<string, string[]> = {};
  private commandHandlers: Record<string, CommandHandler> = {};
  private users: Record<
    string,
    SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_ONLINE_LIST>['characters'][number]
  > = {};

  channels: Record<string, Array<IPlugin>> = {};
  private channelNames: Record<string, string> = {};

  private ws: WebSocket | null = null;

  private pingInterval: Timeout | null = null;

  floodLimit: number = 2.0;
  private lastTimeCommandReceived: number = Number.MAX_VALUE;
  private commandsInQueue: number = 0;

  private timeout(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendData<T extends FChatClientCommandType>(command: T, content?: ClientCommandSchema<T>): Promise<void> {
    this.commandsInQueue++;
    const currentTime = parseInt(process.uptime().toString(), 10);

    if (currentTime - this.lastTimeCommandReceived < this.floodLimit) {
      const timeElapsedSinceLastCommand = currentTime - this.lastTimeCommandReceived;
      const timeToWait = this.commandsInQueue * this.floodLimit - timeElapsedSinceLastCommand;
      await this.timeout(timeToWait * 1000);
    }

    this.lastTimeCommandReceived = parseInt(process.uptime().toString(), 10);
    this.commandsInQueue--;
    this.sendCommand(command, content);
  }

  constructor(configuration: IConfig) {
    const parsedConfig = configSchema.safeParse(configuration);
    if (!parsedConfig.success) {
      console.error('Invalid configuration passed, cannot start.', parsedConfig.error);
      process.exit();
    }
    this.config = parsedConfig.data;

    try {
      if (statSync(this.config.saveFolder + this.config.saveFileName)) {
        const savePluginMap: unknown = JSON.parse(
          readFileSync(this.config.saveFolder + this.config.saveFileName, 'utf8')
        );
        const parsed = savePluginMapSchema.safeParse(savePluginMap);
        if (parsed.success) {
          this.channels = parsed.data;
        } else {
          this.errorLog('Invalid save file format, ignoring');
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      //Swallow the error
    }

    // initial empty room from config
    const room = this.config.room.toLowerCase();
    if (this.config.room !== undefined && this.channels[room] === null) {
      this.channels[room] = [];
      this.updateRoomsConfig();
    }
  }

  //create one commandHandler per room
  generateCommandHandlers(): void {
    for (const room of Object.keys(this.channels)) {
      this.commandHandlers[room.toLowerCase()] = new CommandHandler(this, room);
    }
  }

  setFloodLimit(delay: number): void {
    this.floodLimit = delay;
  }

  async connect(): Promise<void> {
    this.ws = null;
    this.setFloodLimit(2);

    this.generateCommandHandlers();
    this.addCommandListener(fchatServerCommandTypes.MESSAGE_RECEIVED, this.commandListener.bind(this)); // basic commands + plugins loader, one instance for one bot
    this.addCommandListener(fchatServerCommandTypes.CONNECTED, this.joinChannelOnConnect.bind(this));

    if (this.config.autoJoinOnInvite) {
      this.addCommandListener(
        fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED,
        this.joinChannelsWhereInvited.bind(this)
      );
    }

    this.addCommandListener(fchatServerCommandTypes.SERVER_VARIABLES, this.variableChangeHandler.bind(this));

    //user handling
    this.addCommandListener(fchatServerCommandTypes.INITIAL_CHANNEL_DATA, this.addUsersToList.bind(this));
    this.addCommandListener(fchatServerCommandTypes.CHARACTER_WENT_OFFLINE, this.removeUserFromChannels.bind(this));
    this.addCommandListener(fchatServerCommandTypes.CHARACTER_LEFT_CHANNEL, this.removeUserFromList.bind(this));
    this.addCommandListener(fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL, this.addSingleUserToList.bind(this));
    this.addCommandListener(fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL, this.saveChannelNames.bind(this));

    //global user state management
    this.addCommandListener(fchatServerCommandTypes.CHARACTER_ONLINE_LIST, this.addUserListToGlobalState.bind(this));
    this.addCommandListener(
      fchatServerCommandTypes.STATUS_CHANGED_FOR_CHARACTER,
      this.onChangeUpdateUserState.bind(this)
    );
    this.addCommandListener(fchatServerCommandTypes.CHARACTER_WENT_OFFLINE, this.onChangeUpdateUserState.bind(this));
    this.addCommandListener(
      fchatServerCommandTypes.STATUS_CHANGED_FOR_CHARACTER,
      this.onChangeUpdateUserState.bind(this)
    );

    //permissions handling
    this.addCommandListener(fchatServerCommandTypes.CHANNEL_OPERATOR_LIST, this.addChatOPsToList.bind(this));
    this.addCommandListener(fchatServerCommandTypes.CHANNEL_OPERATOR_ADD, this.addChatOPToList.bind(this));
    this.addCommandListener(fchatServerCommandTypes.CHANNEL_OPERATOR_REMOVE, this.removeChatOPFromList.bind(this));

    const ticket = await this.getTicket();
    void this.startWebsockets(ticket);
  }

  public debugLog(...args: unknown[]): void {
    if (this.config.logLevel === 'debug') {
      console.log(...args);
    }
  }

  // TODO: Add a proper logging system
  public infoLog(...args: unknown[]): void {
    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
      console.info(...args);
    }
  }

  public alwaysLog(...args: unknown[]): void {
    console.info(...args);
  }

  public errorLog(...args: unknown[]): void {
    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info' || this.config.logLevel === 'error') {
      console.error(...args);
    }
  }

  joinChannelsWhereInvited(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED>): void {
    this.joinNewChannel(args.name);
  }

  private joinChannelOnConnect(): void {
    for (const room of Object.keys(this.channels)) {
      this.sendCommand(fchatClientCommandTypes.JOIN_CHANNEL, {
        channel: room.toLowerCase(),
      });
    }
  }

  setStatus(status: CharacterStatus, message = ''): void {
    this.sendCommand(fchatClientCommandTypes.STATUS, {
      status,
      statusmsg: message,
    });
    this.infoLog('Set status to:', status, 'with message:', message);
  }

  joinNewChannel(channel: string): void {
    const sanitizedChannel = channel.toLowerCase();
    if (!this.channels[sanitizedChannel] || this.channels[sanitizedChannel].length === 0) {
      this.channels[sanitizedChannel] = [];
    }
    this.sendCommand(fchatClientCommandTypes.JOIN_CHANNEL, {
      channel: sanitizedChannel,
    });
    this.commandHandlers[sanitizedChannel] = new CommandHandler(this, sanitizedChannel);
    this.infoLog('Joined new channel:', sanitizedChannel);

    //save file for rooms
    this.updateRoomsConfig();
  }

  private commandListener(args: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.commandHandlers[channel] !== 'undefined') {
      try {
        this.commandHandlers[channel].processCommand(args);
      } catch (ex) {
        console.log(ex);
        this.throwError(args, String(ex), channel);
      }
    }
  }

  throwError(args: unknown, error: unknown, chan: string): void {
    console.log(
      `Error: Please message ${
        this.config.master
      } with the following content:\n Error at ${new Date().toLocaleString()} on command ${JSON.stringify(
        args
      )} in channel ${chan} with error: ${JSON.stringify(error)}`
    );
    void this.sendMessage(
      `Error: Please message ${
        this.config.master
      } with the following content:\n Error at ${new Date().toLocaleString()} on command ${JSON.stringify(
        args
      )} in channel ${chan} with error: ${JSON.stringify(error)}`,
      chan
    );
  }

  //user management
  private addUsersToList(args: SchemaForCommand<typeof fchatServerCommandTypes.INITIAL_CHANNEL_DATA>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.usersInChannel[channel] !== 'object') {
      this.usersInChannel[channel] = [];
    }
    for (const user of args.users) {
      if (this.usersInChannel[channel].indexOf(user.identity) === -1) {
        this.usersInChannel[channel].push(user.identity);
      }
    }
    this.debugLog(
      'Added users to list:',
      channel,
      args.users.map((user) => user.identity)
    );
  }

  private addSingleUserToList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.usersInChannel[channel] !== 'object') {
      this.usersInChannel[channel] = [];
    }
    if (this.usersInChannel[channel].indexOf(args.character.identity) === -1) {
      this.usersInChannel[channel].push(args.character.identity);
    }
    this.debugLog('Added user to list:', channel, args.character.identity);
  }

  private removeUserFromList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_LEFT_CHANNEL>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.usersInChannel[channel] !== 'object') {
      return;
    }
    if (this.usersInChannel[channel].indexOf(args.character) !== -1) {
      this.usersInChannel[channel].splice(this.usersInChannel[channel].indexOf(args.character), 1);
    }
    this.infoLog('Removed user from list:', channel, args.character);
  }

  private removeUserFromChannels(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_WENT_OFFLINE>): void {
    //remove if offline
    for (const i in this.usersInChannel) {
      if (typeof this.usersInChannel[i] !== 'object') {
        continue;
      }
      if (this.usersInChannel[i].indexOf(args.character) !== -1) {
        this.usersInChannel[i].splice(this.usersInChannel[i].indexOf(args.character), 1);
      }
    }
    this.debugLog('Removed user from all channels:', args.character);
  }

  private saveChannelNames(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL>): void {
    const channel = args.channel.toLowerCase();
    this.channelNames[channel] = args.title;
  }

  private addUserListToGlobalState(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_ONLINE_LIST>): void {
    args.characters.forEach((character) => {
      const name = character[0];
      this.users[name] = character;
    });
    this.debugLog(
      'Added user list to global state:',
      args.characters.map((character) => character[0])
    );
  }

  private onChangeUpdateUserState(args: {
    identity?: string;
    character?: string;
    gender?: CharacterGender;
    status?: CharacterStatus;
    statusmsg?: string;
  }): void {
    let character = '';
    let gender = '';
    let status = '';
    let statusmsg = '';

    if (args.identity) {
      character = args.identity;
    }
    if (args.character) {
      character = args.character;
    }

    if (args.gender) {
      gender = args.gender;
    }

    if (args.status) {
      status = args.status;
    }

    if (args.statusmsg) {
      statusmsg = args.statusmsg;
    }

    if (character !== '') {
      this.users[character] ??= [character, 'None', 'online', ''];
      const user = this.users[character]!;

      if (gender !== '') {
        user[1] = gender as CharacterGender;
      }

      if (status !== '') {
        user[2] = status as CharacterStatus;
      }

      if (statusmsg !== '') {
        user[3] = statusmsg;
      }

      this.debugLog('Updated user state:', character, gender, status, statusmsg);
    }
  }

  //permissions
  private addChatOPsToList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_OPERATOR_LIST>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.chatOPsInChannel[channel] !== 'object') {
      this.chatOPsInChannel[channel] = [];
    }
    for (const op of args.oplist) {
      if (op && this.chatOPsInChannel[channel].indexOf(op) === -1) {
        this.chatOPsInChannel[channel].push(op);
        this.infoLog('Added chatOP to list:', channel, op);
      }
    }
  }

  private addChatOPToList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_OPERATOR_ADD>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.chatOPsInChannel[channel] !== 'object') {
      this.chatOPsInChannel[channel] = [];
    }
    if (this.chatOPsInChannel[channel].indexOf(args.character) === -1) {
      this.chatOPsInChannel[channel].push(args.character);
      this.infoLog('Added chatOP to list:', channel, args.character);
    }
  }

  private removeChatOPFromList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_OPERATOR_REMOVE>): void {
    const channel = args.channel.toLowerCase();
    if (typeof this.chatOPsInChannel[channel] !== 'object') {
      return;
    }
    if (this.chatOPsInChannel[channel].indexOf(args.character) !== -1) {
      this.chatOPsInChannel[channel].splice(this.chatOPsInChannel[channel].indexOf(args.character), 1);
      this.infoLog('Removed chatOP from list:', channel, args.character);
    }
  }

  private variableChangeHandler(args: SchemaForCommand<typeof fchatServerCommandTypes.SERVER_VARIABLES>): void {
    switch (args.variable) {
      case 'msg_flood':
        this.infoLog('Flood limit changed to:', args.value);
        this.floodLimit = Number(args.value);
        break;
      default:
        break;
    }
  }

  private async getTicket(): Promise<Ticket> {
    this.debugLog('Getting a ticket from fchat...');
    return new Promise<Ticket>((resolve, reject) => {
      request.post(
        {
          url: 'https://www.f-list.net/json/getApiTicket.php',
          form: {
            account: this.config.username,
            password: this.config.password,
          },
        },
        (err, httpResponse, body) => {
          if (err) {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject(err);
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const response = JSON.parse(body) as { ticket: string };
          const ticket = response.ticket;
          const json: Ticket = {
            method: 'ticket',
            account: this.config.username,
            ticket,
            character: this.config.character,
            cname: this.config.cname,
            cversion: this.config.cversion,
          };
          resolve(json);
        }
      );
    });
  }

  sendCommand(command: FChatClientCommandType, object?: ClientCommandSchema<FChatClientCommandType>): boolean {
    const schema = getClientCommand(command).schema;
    if (!schema) {
      this.errorLog('Command not found:', command);
      return false;
    }

    const parsed = schema.safeParse(object);
    if (!parsed.success) {
      this.errorLog('Error parsing command:', command, 'with argument:', object);
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        const issueMessage = issue.message;
        this.errorLog(`Issue: ${issueMessage}, Path: ${path}, Code: ${issue.code}`);
      }
      return false;
    }

    const message = `${command} ${JSON.stringify(parsed.data)}`;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.errorLog('Websocket not connected, skipping message |', message);
      return false;
    }

    this.infoLog('fchat>> ', message);
    this.ws.send(message);
    return true;
  }

  async sendMessage(message: string, channel: string): Promise<void> {
    return this.sendData(fchatClientCommandTypes.MESSAGE, { channel, message });
  }

  async sendPrivMessage(message: string, character: string): Promise<void> {
    return this.sendData(fchatClientCommandTypes.PRIVATE_MESSAGE, {
      message,
      recipient: character,
    });
  }

  async getProfileData(character: string): Promise<void> {
    return this.sendData(fchatClientCommandTypes.PROFILE_REQUEST, { character });
  }

  async setIsTyping(): Promise<void> {
    return this.sendData(fchatClientCommandTypes.TYPING_STATUS, {
      character: this.config.character,
      status: 'typing',
    });
  }

  async setIsTypingPaused(): Promise<void> {
    return this.sendData(fchatClientCommandTypes.TYPING_STATUS, {
      character: this.config.character,
      status: 'paused',
    });
  }

  async setIsNotTyping(): Promise<void> {
    return this.sendData(fchatClientCommandTypes.TYPING_STATUS, {
      character: this.config.character,
      status: 'clear',
    });
  }

  getUserList(channel: string): string[] {
    const sanitizedChannel = channel.toLowerCase();
    if (this.usersInChannel[sanitizedChannel] === undefined) {
      return [];
    }
    return this.usersInChannel[sanitizedChannel];
  }

  getAllUsersList(): string[] {
    return Object.values(this.usersInChannel).flat();
  }

  getChatOPList(channel: string): string[] {
    const sanitizedChannel = channel.toLowerCase();
    const chatOPs = this.chatOPsInChannel[sanitizedChannel];
    if (!chatOPs) {
      this.infoLog('No chatOPs found for channel:', sanitizedChannel);
      return [];
    }
    return chatOPs;
  }

  isUserChatOP(username: string, channel: string): boolean {
    const sanitizedChannel = channel.toLowerCase();
    return this.getChatOPList(sanitizedChannel).indexOf(username) !== -1 || username === this.config.master;
  }

  isUserMaster(username: string): boolean {
    return username.toLowerCase() === this.config.master.toLowerCase();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  restart(): void {
    this.disconnect();
    setTimeout(() => {
      void this.connect();
    }, 2000);
  }

  softRestart(channel: string): void {
    this.commandHandlers[channel] = new CommandHandler(this, channel);
  }

  async roll(channel: string, customDice: string): Promise<void> {
    return this.sendData(fchatClientCommandTypes.ROLL_DICE, {
      channel,
      dice: customDice || '1d10',
    });
  }

  async spinBottle(channel: string): Promise<void> {
    return this.sendData(fchatClientCommandTypes.ROLL_DICE, {
      channel,
      dice: 'bottle',
    });
  }

  updateRoomsConfig(): void {
    if (!existsSync(this.config.saveFolder)) {
      mkdirSync(this.config.saveFolder);
    }

    const savePluginMap: SavePluginMap = {};
    for (const channel of Object.entries(this.channels)) {
      savePluginMap[channel[0]] = channel[1].map((plugin) => ({
        name: plugin.name,
      }));
    }

    writeFileSync(this.config.saveFolder + this.config.saveFileName, JSON.stringify(savePluginMap));
  }

  private startWebsockets(idnObject: Ticket): void {
    this.ws = new ws(FCHAT_SOCKET_URL);

    this.ws.on('open', (_data: unknown) => {
      this.infoLog('Websocket opened, sending IDN with ticket', idnObject);
      if (!this.sendCommand(fchatClientCommandTypes.IDENTIFY, idnObject)) {
        this.infoLog('Websocket not ready, retrying in 1 second');
        setTimeout(() => {
          this.startWebsockets(idnObject);
        }, 1000);
        return;
      }
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
      this.pingInterval = setInterval(() => {
        this.sendCommand(fchatClientCommandTypes.PING);
      }, 25000);
    });

    this.ws.on('close', () => {
      this.infoLog('Websocket closed');
      process.exit();
    });

    this.ws.on('error', (error) => {
      this.errorLog('Websocket error:', error);
      setTimeout(() => {
        void this.connect();
      }, 4000);
    });

    // TODO: Decide on if we need a message queue
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.ws.on('message', async (data: Buffer) => {
      let command: string;
      let argumentString: string;

      if (data !== null) {
        const dataString = data.toString('utf-8');
        this.debugLog('fchat<< ', dataString);

        const split = this.splitOnce(dataString, ' ');
        command = split[0]?.trim() ?? '';
        argumentString = split[1]?.trim() ?? '';

        try {
          let argument: unknown;

          if (argumentString.length > 0) {
            argument = JSON.parse(argumentString) as unknown;
          }

          // @ts-expect-error - command is a string, but we want to check if it's in the importantMessages array
          if (IMPORTANT_SERVER_MESSAGES.includes(command)) {
            this.alwaysLog('Important message received:', command, argument);
          }

          // Handle all listeners in parallel for better performance
          const listenerPromises: (void | Promise<void>)[] = [];

          const commandObject = getCommandObjectForCommand(command as FChatServerCommandType);
          if (!commandObject) {
            this.infoLog('Unknown command, calling generic event listeners:', command);
            listenerPromises.push(...this.genericEventListeners.map((listener) => listener.call(this, dataString)));
            await Promise.allSettled(listenerPromises);
            return;
          }

          // Safely handle empty arguments
          const parsed = argument
            ? commandObject.schema.safeParse(argument)
            : { success: true, data: undefined, error: undefined };

          // Log errors and skip processing if not successful
          if (!parsed.success) {
            this.errorLog('Error parsing command:', command, 'with argument:', argument);
            for (const issue of parsed.error?.issues ?? []) {
              const path = issue.path.join('.');
              const issueMessage = issue.message;
              this.errorLog(`Issue: ${issueMessage}, Path: ${path}, Code: ${issue.code}`);
            }
            return;
          }

          const commandListener = this.commandListeners[commandObject.type];
          if (commandListener) {
            this.debugLog('Calling command listener:', command, parsed.data, commandListener);
            listenerPromises.push(...commandListener.map((listener) => listener.call(this, parsed.data)));
          }

          // Wait for all listeners to complete
          await Promise.allSettled(listenerPromises);
        } catch (error: unknown) {
          const errMessage = error instanceof Error ? error.message : String(error);
          this.errorLog('Error processing message:', error);

          // Optionally notify about the error, do not notify about errors from the ERROR command which would result in a loop
          if (this.config.master && command !== fchatServerCommandTypes.ERROR) {
            void this.sendPrivMessage(`Error processing message: ${errMessage}`, this.config.master);
          }
        }
      }
    });
  }

  private splitOnce(str: string, delim: string): string[] {
    const components = str.split(delim);
    const result = [components.shift() ?? ''];
    if (components.length) {
      result.push(components.join(delim));
    }
    return result;
  }

  public sendParseMessage(
    commandName: string,
    zodSchema: z.ZodType<unknown>,
    zodError: z.ZodError,
    channel: string
  ): Promise<void> {
    const schemaDescription = zodSchema.description ? `\nSchema Description: ${zodSchema.description}` : '';
    const errorMessage = zodError.issues.map((issue) => `-> ${issue.message || issue.code}`).join('\n');

    return this.sendMessage(`Invalid Arguments for !${commandName}.${schemaDescription}\n${errorMessage}`, channel);
  }
}

export * from './Interfaces/IConfig';
export * from './Interfaces/IPlugin';
export * from './Interfaces/IChannel';
export * from './Interfaces/IMsgEvent';
export * from './CommandHandler';
export * from './CommandHandlerHelper';
export * from './FchatServerCommands';
export * from './bbCode';
