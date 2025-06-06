'use strict';
import CommandHandler from "./CommandHandler";
import {IPlugin} from "./Interfaces/IPlugin";
import {IConfig, LogLevel} from "./Interfaces/IConfig";
import {IMsgEvent} from "./Interfaces/IMsgEvent";
import ws, { WebSocket } from 'ws';
import request from "request";
import { writeFileSync, statSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { CharacterStatus, FChatServerCommandType, fchatServerCommandTypes, getCommandObjectForCommand, type SchemaForCommand} from './FchatServerCommands'

export type FChatListener<T> = (args: T) => void | Promise<void>;

const FCHAT_SOCKET_URL = 'wss://chat.f-list.net/chat2';

export default class FChatLib {

    /** Listeners for events that aren't caught by any other listener. */
    private readonly genericEventListeners: FChatListener<unknown>[] = [];

    /** Listeners for events that are caught by a specific command. */
    private readonly commandListeners = Object.fromEntries(Object.values(fchatServerCommandTypes).map(command => [command, []])) as Record<FChatServerCommandType, FChatListener<SchemaForCommand<FChatServerCommandType>>[]>;

    addCommandListener(command: FChatServerCommandType, fn: FChatListener<SchemaForCommand<FChatServerCommandType>>):void{
      const listeners = this.commandListeners[command];
      if (!listeners) {
        throw new Error(`Command ${command} not found`);
      }
      listeners.push(fn);
    }

    removeCommandListener(command: FChatServerCommandType, fn: FChatListener<SchemaForCommand<FChatServerCommandType>>):void{
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
    addGenericEventListener(fn: FChatListener<unknown>):void{
      this.genericEventListeners.push(fn);
    }

    removeGenericEventListener(fn: FChatListener<unknown>):void{
      const index = this.genericEventListeners.indexOf(fn);
      if (index !== -1) {
        this.genericEventListeners.splice(index, 1);
      }
    }

    readonly config:IConfig = null;
    private logLevel: LogLevel;


    private usersInChannel: Record<string, string[]> = {};
    private chatOPsInChannel: Record<string, string[]> = {};
    private commandHandlers: CommandHandler[] = [];
    private users: Record<string, SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_ONLINE_LIST>["characters"][number]> = {};

    channels:Map<string, Array<IPlugin>> = new Map<string, Array<IPlugin>>();
    private channelNames:Map<string, string> = new Map<string, string>();

    private ws: WebSocket;

    private pingInterval:NodeJS.Timeout;

    floodLimit:number = 2.0;
    private lastTimeCommandReceived:number = Number.MAX_VALUE;
    private commandsInQueue:number = 0;
    private saveFolder:string
    private saveFileName:string

    private timeout(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendData(messageType: string, content: string):Promise<void>{
        this.commandsInQueue++;
        let currentTime = parseInt(process.uptime().toString(), 10);

        if((currentTime - this.lastTimeCommandReceived) < this.floodLimit){
            let timeElapsedSinceLastCommand = currentTime - this.lastTimeCommandReceived;
            let timeToWait = (this.commandsInQueue * this.floodLimit) - timeElapsedSinceLastCommand;
            await this.timeout(timeToWait * 1000);
        }

        this.lastTimeCommandReceived = parseInt(process.uptime().toString(), 10);
        this.commandsInQueue--;
        this.sendWS(messageType, content);
    }

    constructor(configuration:IConfig){


        if(configuration == null){
            console.log('No configuration passed, cannot start.');
            process.exit();
        }
        else{
            this.config = configuration;
            if(this.config.username == undefined || this.config.username == "" || this.config.password == undefined || this.config.password == "" || this.config.character == "" || this.config.character == "" || this.config.master == "" || this.config.master == ""){
                console.log('Wrong parameters passed. All the fields in the configuration file are required.');
                process.exit();
            }
        }

        this.logLevel = this.config.logLevel || "info";
        this.saveFolder = this.config.saveFolder || process.cwd()+"/config/";
        this.saveFileName = this.config.saveFileName || 'config.rooms.js';

        try {
            if (statSync(this.saveFolder+this.saveFileName)) {
                this.channels = new Map(JSON.parse(readFileSync(this.saveFolder+this.saveFileName, 'utf8')));
            }
        }
        catch(err){
            //Swallow the error
        }

        if(this.config.room !== undefined && this.channels.get(this.config.room.toLowerCase()) == null){
            this.channels.set(this.config.room.toLowerCase(), []);
            this.updateRoomsConfig();
        }
    }

    //create one commandHandler per room
    generateCommandHandlers():void{
        for(let room of this.channels.keys()){
            this.commandHandlers[room.toLowerCase()] = new CommandHandler(this, room);
        }
    }

    setFloodLimit(delay: number):void{
        this.floodLimit = delay;
    }

    async connect():Promise<void>{
        this.ws = null;
        this.setFloodLimit(2);

        this.generateCommandHandlers();
        this.addCommandListener(fchatServerCommandTypes.MESSAGE_RECEIVED, this.commandListener); // basic commands + plugins loader, one instance for one bot
        this.addCommandListener(fchatServerCommandTypes.CONNECTED, this.joinChannelOnConnect);

        if(this.config.autoJoinOnInvite){
            this.addCommandListener(fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED, this.joinChannelsWhereInvited);
        }

        this.addCommandListener(fchatServerCommandTypes.SERVER_VARIABLES, this.variableChangeHandler);

        //user handling
        this.addCommandListener(fchatServerCommandTypes.INITIAL_CHANNEL_DATA, this.addUsersToList);
        this.addCommandListener(fchatServerCommandTypes.CHARACTER_WENT_OFFLINE, this.removeUserFromChannels);
        this.addCommandListener(fchatServerCommandTypes.CHARACTER_LEFT_CHANNEL, this.removeUserFromList);
        this.addCommandListener(fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL, this.addSingleUserToList);
        this.addCommandListener(fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL, this.saveChannelNames);

        //global user state management
        this.addCommandListener(fchatServerCommandTypes.CHARACTER_ONLINE_LIST, this.addUserListToGlobalState);
        this.addCommandListener(fchatServerCommandTypes.STATUS_CHANGED_FOR_CHARACTER, this.onChangeUpdateUserState)
        this.addCommandListener(fchatServerCommandTypes.CHARACTER_WENT_OFFLINE, this.onChangeUpdateUserState);
        this.addCommandListener(fchatServerCommandTypes.STATUS_CHANGED_FOR_CHARACTER, this.onChangeUpdateUserState);
        
        

        //permissions handling
        this.addCommandListener(fchatServerCommandTypes.CHANNEL_OPERATOR_LIST, this.addChatOPsToList);
        this.addCommandListener(fchatServerCommandTypes.CHANNEL_OPERATOR_ADD, this.addChatOPToList);
        this.addCommandListener(fchatServerCommandTypes.CHANNEL_OPERATOR_REMOVE, this.removeChatOPFromList);

        const ticket = await this.getTicket();
        await this.startWebsockets(ticket);
    }

    public debugLog(...args:any[]):void{
        if (this.logLevel === "debug") {
            console.log(...args);
        }
    }

    // TODO: Add a proper logging system
    public infoLog(...args:any[]):void{
        if (this.logLevel === "debug" || this.logLevel === "info") {
            console.info(...args);
        }
    }

    public errorLog(...args:any[]):void{
        if (this.logLevel === "debug" || this.logLevel === "info" || this.logLevel === "error") {
            console.error(...args);
        }
    }

    joinChannelsWhereInvited(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED>){
        this.joinNewChannel(args.name);
    }

    private async joinChannelOnConnect() {
        for(let room of this.channels.keys()) {
            this.sendWS('JCH', { channel: room.toLowerCase() });
        }
    }

    setStatus(status:string, message:string){
        this.sendWS('STA', { status: status, statusmsg: message });
        this.infoLog("Set status to:", status, "with message:", message);
    }

    joinNewChannel(channel:string){
        if(this.channels.get(channel.toLowerCase()) == null){
            this.channels.set(channel.toLowerCase(), []);
        }
        this.sendWS('JCH', { channel: channel.toLowerCase() });
        this.commandHandlers[channel.toLowerCase()] = new CommandHandler(this, channel);
        this.infoLog("Joined new channel:", channel);

        //save file for rooms
        this.updateRoomsConfig();
    }

    private commandListener(args: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
        if(typeof this.commandHandlers[args.channel.toLowerCase()] !== "undefined")
        {
            try {
                this.commandHandlers[args.channel.toLowerCase()].processCommand(args);
            }
            catch(ex){
                console.log(ex);
                this.throwError(args, ex.toString(), args.channel);
            }
        }
    }

    throwError(args, error, chan){
        console.log("Error: Please message "+this.config.master+" with the following content:\n Error at "+new Date().toLocaleString()+" on command "+JSON.stringify(args)+" in channel "+chan+" with error: "+JSON.stringify(error));
        this.sendMessage("Error: Please message "+this.config.master+" with the following content:\n Error at "+new Date().toLocaleString()+" on command "+JSON.stringify(args)+" in channel "+chan+" with error: "+JSON.stringify(error), chan);
    }

    //user management
    private addUsersToList(args: SchemaForCommand<typeof fchatServerCommandTypes.INITIAL_CHANNEL_DATA>) {
        if(typeof this.usersInChannel[args.channel] !== "object"){this.usersInChannel[args.channel] = [];}
        for(let i in args.users){
            if(this.usersInChannel[args.channel].indexOf(args.users[i].identity) == -1){
                this.usersInChannel[args.channel].push(args.users[i].identity);
            }
        }
        this.debugLog("Added users to list:", args.channel, args.users.map(user => user.identity));
    }

    private addSingleUserToList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL>) {
        if(typeof this.usersInChannel[args.channel] !== "object"){this.usersInChannel[args.channel] = [];}
        if(this.usersInChannel[args.channel].indexOf(args.character.identity) == -1){
            this.usersInChannel[args.channel].push(args.character.identity);
        }
        this.debugLog("Added user to list:", args.channel, args.character.identity);
    }

    private removeUserFromList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_LEFT_CHANNEL>) {
        if(typeof this.usersInChannel[args.channel] !== "object"){ return; }
        if(this.usersInChannel[args.channel].indexOf(args.character) != -1){
            this.usersInChannel[args.channel].splice(this.usersInChannel[args.channel].indexOf(args.character),1);
        }
        this.infoLog("Removed user from list:", args.channel, args.character);
    }

    private removeUserFromChannels(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_WENT_OFFLINE>) { //remove if offline
        for(let i in this.usersInChannel){
            if(typeof this.usersInChannel[i] !== "object"){ continue; }
            if(this.usersInChannel[i].indexOf(args.character) != -1){
                this.usersInChannel[i].splice(this.usersInChannel[i].indexOf(args.character),1);
            }
        }
        this.debugLog("Removed user from all channels:", args.character);
    }

    private saveChannelNames(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_JOINED_CHANNEL>) {
        this.channelNames[args.channel] = args.title;
    }

    private addUserListToGlobalState(args: SchemaForCommand<typeof fchatServerCommandTypes.CHARACTER_ONLINE_LIST>) {
        args.characters.forEach(character => {
            const name = character[0];
            this.users[name] = character;
        });
        this.debugLog("Added user list to global state:", args.characters.map(character => character[0]));
    }

    private onChangeUpdateUserState(args) {
        let character = "";
        let gender = "";
        let status = "";
        let statusmsg = "";

        if(args.identity){
            character = args.identity;
        }
        if(args.character){
            character = args.character;
        }

        if(args.gender){
            gender = args.gender;
        }

        if(args.status){
            status = args.status;
        }

        if(args.statusmsg){
            statusmsg = args.statusmsg;
        }

        if(character != ""){
            if(this.users[character] === undefined){
                this.users[character] = [character, "", "online", ""];
            }
    
            if(gender != ""){
                this.users[character][1] = gender;
            }
            
            if(status != ""){
                this.users[character][2] = status as CharacterStatus;
            }
    
            if(statusmsg != ""){
                this.users[character][3] = statusmsg;
            }

            this.debugLog("Updated user state:", character, gender, status, statusmsg);
        }       
    }

    //permissions
    private addChatOPsToList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_OPERATOR_LIST>) {
        if(typeof this.chatOPsInChannel[args.channel] !== "object"){this.chatOPsInChannel[args.channel] = [];}
        for(let i in args.oplist){
            if(this.chatOPsInChannel[args.channel].indexOf(args.oplist[i]) == -1){
                this.chatOPsInChannel[args.channel].push(args.oplist[i]);
                this.infoLog("Added chatOP to list:", args.channel, args.oplist[i]);
            }
        }
    }

    private addChatOPToList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_OPERATOR_ADD>) {
        if(typeof this.chatOPsInChannel[args.channel] !== "object"){this.chatOPsInChannel[args.channel] = [];}
        if(this.chatOPsInChannel[args.channel].indexOf(args.character) == -1){
            this.chatOPsInChannel[args.channel].push(args.character);
            this.infoLog("Added chatOP to list:", args.channel, args.character);
        }
    }

    private removeChatOPFromList(args: SchemaForCommand<typeof fchatServerCommandTypes.CHANNEL_OPERATOR_REMOVE>) {
        if(typeof this.chatOPsInChannel[args.channel] !== "object"){ return; }
        if(this.chatOPsInChannel[args.channel].indexOf(args.character) != -1){
            this.chatOPsInChannel[args.channel].splice(this.chatOPsInChannel[args.channel].indexOf(args.character),1);
            this.infoLog("Removed chatOP from list:", args.channel, args.character);
        }
    }

    private variableChangeHandler(args: SchemaForCommand<typeof fchatServerCommandTypes.SERVER_VARIABLES>) {
      switch(args.variable){
          case "msg_flood":
              this.infoLog("Flood limit changed to:", args.value);
              this.floodLimit = Number(args.value);
              break;
          default:
              break;
          }
    }

    private async getTicket(){
        this.debugLog('Getting a ticket from fchat...');
        return new Promise<object>((resolve, reject) => {
            request.post({ url: 'https://www.f-list.net/json/getApiTicket.php', form: { account: this.config.username, password: this.config.password } }, (err, httpResponse, body) => {
                if(err){
                    reject(err);
                }
                let response = JSON.parse(body);
                let ticket = response.ticket;
                var json = { "method": "ticket", "account": this.config.username, "ticket": ticket, "character": this.config.character, "cname": this.config.cname, "cversion": this.config.cversion };
                resolve(json);
            });
        });
    }

    /** Returns true if the message was sent, false if the websocket is not ready */
    sendWS(command: string, object?: unknown): boolean {
        const message = command + ' ' + (object !== undefined ? JSON.stringify(object) : '');
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.debugLog("Websocket not connected, skipping message |", message);
            return false;
        }

        this.infoLog("fchat>> ", message);
        this.ws.send(message);
        return true;
    }

    sendMessage(message: string, channel: string):void{
        let json:any = {};
        json.channel = channel;
        json.message = message;
        this.sendData('MSG', json);
    }

    sendPrivMessage(message: string, character: string):void{
        let json:any = {};
        json.message = message;
        json.recipient = character;
        this.sendData('PRI', json);
    }

    getProfileData(character: string):void{
        let json:any = {};
        json.character = character;
        this.sendData('PRO', json);
    }

    setIsTyping(){
        let json:any = {};
        json.character = this.config.character;
        json.status = "typing"
        this.sendData('TPN', json);
    }

    setIsTypingPaused(){
        let json:any = {};
        json.character = this.config.character;
        json.status = "paused"
        this.sendData('TPN', json);
    }

    setIsNotTyping(){
        let json:any = {};
        json.character = this.config.character;
        json.status = "clear"
        this.sendData('TPN', json);
    }

    getUserList(channel: string):string[]{
        const sanitizedChannel = channel.toLowerCase();
        if(this.usersInChannel[sanitizedChannel] == undefined){ return [];}
        return this.usersInChannel[sanitizedChannel];
    }

    getAllUsersList():string[]{
        return Object.values(this.usersInChannel).flat();
    }

    getChatOPList(channel: string):string[]{
        const sanitizedChannel = channel.toLowerCase();
        const chatOPs = this.chatOPsInChannel[sanitizedChannel];
        if(!chatOPs){
            this.infoLog("No chatOPs found for channel:", sanitizedChannel);
            return [];
        }
        return chatOPs;
    }

    isUserChatOP(username: string, channel: string):boolean{
        const sanitizedChannel = channel.toLowerCase();
        return (this.getChatOPList(sanitizedChannel).indexOf(username) != -1 || username == this.config.master);
    }

    isUserMaster(username: string):boolean{
        return (username == this.config.master);
    }

    disconnect():void {
        if (this.ws) {
            this.ws.close();
        }
    }

    restart():void{
        this.disconnect();
        setTimeout(this.connect,2000);
    }

    softRestart(channel):void{
        this.commandHandlers[channel] = new CommandHandler(this, channel);
    }

    roll(customDice, channel):void{
        let json:any = {};
        json.dice = customDice || "1d10";
        json.channel = channel;
        this.sendData("RLL", json);
    }

    updateRoomsConfig():void{
        if (!existsSync(this.saveFolder)){
            mkdirSync(this.saveFolder);
        }

        let ignoredKeys = ["instanciatedPlugin"];
        let cache = [];
        let tempJson = JSON.stringify([...this.channels], function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1 || ignoredKeys.indexOf(key) !== -1) {
                    // Circular reference found, discard key
                    return;
                }
                // Store value in our collection
                cache.push(value);
            }
            return value;
        });

        writeFileSync(this.saveFolder+this.saveFileName, tempJson);
    }


    private startWebsockets(idnObject): void {
        
        this.ws = new ws(FCHAT_SOCKET_URL);

        this.ws.on('open', (data) => {
            this.infoLog("Websocket opened, sending IDN with ticket", idnObject);
            if (!this.sendWS('IDN', idnObject)) {
                this.infoLog("Websocket not ready, retrying in 1 second");
                setTimeout(() => { this.startWebsockets(idnObject); }, 1000);
                return;
            }
            clearInterval(this.pingInterval);
            this.pingInterval = setInterval(() => { this.sendWS('PIN'); }, 25000);
        });

        this.ws.on('close', () => {
            this.infoLog("Websocket closed");
            process.exit();
        });

        this.ws.on('error', (error) => {
            this.errorLog("Websocket error:", error);
            setTimeout(() => { this.connect(); }, 4000);
        });

        this.ws.on('message', async (data: Buffer) => {
            let command:string;
            let argument:any;

            if (data != null) {
                const dataString = data.toString('utf-8');
                this.debugLog("fchat<< ", dataString);

                try {
                    command = argument = "";
                    command = this.splitOnce(dataString, " ")[0].trim();

                    if(dataString.substring(command.length).trim() != ""){
                        argument = JSON.parse(dataString.substring(command.length).trim());
                    }

                    // Handle all listeners in parallel for better performance
                    const listenerPromises: Promise<void>[] = [];

                    const commandObject = getCommandObjectForCommand(command as FChatServerCommandType);
                    if (!commandObject){
                        this.infoLog("Unknown command, calling generic event listeners:", command);
                        listenerPromises.push(...this.genericEventListeners.map(listener => listener.call(this, dataString)));
                        await Promise.allSettled(listenerPromises);
                        return;
                    }

                    // Safely handle empty arguments
                    const parsed = Boolean(argument) ? commandObject.schema.safeParse(argument) : {success: true, data: undefined, error: undefined};
                    if(!parsed.success){
                        this.errorLog("Error parsing command:", command, "with argument:", argument);
                        for (const issue of parsed.error.issues) {
                          const path = issue.path.join('.');
                          const issueMessage = issue.message;
                          this.errorLog(`Issue: ${issueMessage}, Path: ${path}, Code: ${issue.code}`);
                        }
                        return;
                    }

                    const commandListener = this.commandListeners[commandObject.type];
                    if(commandListener){
                        this.debugLog("Calling command listener:", command, parsed.data, commandListener);
                        listenerPromises.push(...commandListener.map(listener => listener.call(this, parsed.data)));
                    }


                    // Wait for all listeners to complete
                    await Promise.allSettled(listenerPromises);
                } catch (error) {
                    this.errorLog('Error processing message:', error);

                    // Optionally notify about the error, do not notify about errors from the ERROR command which would result in a loop
                    if (this.config.master && command !== fchatServerCommandTypes.ERROR) {
                        this.sendPrivMessage(`Error processing message: ${error.message}`, this.config.master);
                    }
                }
            }
        });
    }

    private splitOnce(str: string, delim: string) {
        let components = str.split(delim);
        let result = [components.shift()];
        if (components.length) {
            result.push(components.join(delim));
        }
        return result;
    }

}

export * from './Interfaces/IConfig';
export * from './Interfaces/IPlugin';
export * from './Interfaces/IChannel';
export * from './Interfaces/IMsgEvent';
export * from './CommandHandler';
export * from './CommandHandlerHelper'
export * from './FchatServerCommands'