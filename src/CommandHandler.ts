import FChatLib from './FChatLib';
import { CommandHandlerHelper } from './CommandHandlerHelper';
import { IPlugin } from './Interfaces/IPlugin';
import { fchatServerCommandTypes, SchemaForCommand } from './FchatServerCommands';
import { z } from 'zod';
import { statusSchema } from './commonSchemas';

const gjoinchannelArgs = z.string().describe('The channel to join');
export const gstatusArgs = z
  .string()
  .describe('<Status> <Status Message>')
  .min(1, 'Status is required')
  .transform((val) => {
    const [status, message] = val.split(' ');
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedStatus.success) {
      throw new Error('Invalid status: ' + parsedStatus.error.message);
    }

    return { status: parsedStatus.data, message };
  });

const loadpluginArgs = z
  .string()
  .describe('The plugin to load')
  .regex(/^[a-zA-Z0-9_-]+$/)
  .min(1, 'Plugin name is required')
  .max(255, 'Plugin name is too long');

export default class CommandHandler {
  channelName: string = '';
  privCharName: string = '';
  fChatLibInstance: FChatLib;
  pluginsLoaded: Array<IPlugin> = [];
  commandHandlerHelper: CommandHandlerHelper;

  constructor(parent: FChatLib, channel: string) {
    this.channelName = channel;
    this.fChatLibInstance = parent;
    this.commandHandlerHelper = new CommandHandlerHelper(this);

    const plugins = this.fChatLibInstance.channels[channel];
    if (Array.isArray(plugins)) {
      this.pluginsLoaded = plugins;
      if (this.pluginsLoaded.length > 0) {
        this.commandHandlerHelper.internalLoadPluginOnStart(this.pluginsLoaded);
      }
    }
  }

  processCommand(data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (data && data.message && data.message.length > 2 && data.message[0] == '!') {
      let opts = {
        command: String(data.message.split(' ')[0]).replace('!', '').trim(),
        argument: data.message.substring(String(data.message.split(' ')[0]).length).trim(),
      };

      if (opts.command != 'processCommand') {
        let found = false;

        for (let plugin of this.pluginsLoaded) {
          for (let command of this.commandHandlerHelper.internalGetAllFuncs(plugin.instanciatedPlugin)) {
            if (command === opts.command) {
              plugin.instanciatedPlugin[opts.command](opts.argument, data);
              found = true;
            }
          }
        }

        if (!found && typeof (this as any)[opts.command] === 'function') {
          this.fChatLibInstance.infoLog('Plugin Command Received:', opts.command, opts.argument, data);
          (this as any)[opts.command](opts.argument, data);
        }
      }
    }
  }

  help(_args: any, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    let commandsHelp = '';
    let cmdArrSorted = [];
    for (let method of this.commandHandlerHelper.internalGetAllFuncs(this)) {
      if (method != 'processCommand' && cmdArrSorted.indexOf(method) == -1) {
        cmdArrSorted.push(method);
      }
    }
    for (let plugin of this.pluginsLoaded) {
      for (let method of this.commandHandlerHelper.internalGetAllFuncs(plugin.instanciatedPlugin)) {
        if (method != 'processCommand' && cmdArrSorted.indexOf(method) == -1) {
          cmdArrSorted.push(method);
        }
      }
    }
    cmdArrSorted.sort();
    for (let i in cmdArrSorted) {
      commandsHelp += ', !' + cmdArrSorted[i];
    }
    commandsHelp = commandsHelp.substr(1);
    this.fChatLibInstance.sendMessage('Here are the available commands:' + commandsHelp, data.channel);
  }

  flood(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserChatOP(data.character, data.channel)) {
      this.fChatLibInstance.sendMessage('Current flood limit set: ' + this.fChatLibInstance.floodLimit, data.channel);
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  reloadplugins(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserChatOP(data.character, data.channel)) {
      this.fChatLibInstance.softRestart(data.channel);
      this.fChatLibInstance.sendMessage('All plugins have been reloaded!', data.channel);
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  greload(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserMaster(data.character)) {
      for (const channel of Object.keys(this.fChatLibInstance.channels)) {
        this.fChatLibInstance.softRestart(channel);
      }
      this.fChatLibInstance.sendMessage('All plugins have been reloaded!', data.channel);
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  grestart(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserMaster(data.character)) {
      this.fChatLibInstance.restart();
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  gdisableinvites(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserMaster(data.character)) {
      this.fChatLibInstance.removeCommandListener(
        fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED,
        this.fChatLibInstance.joinChannelsWhereInvited
      );
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  genableinvites(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserMaster(data.character)) {
      this.fChatLibInstance.removeCommandListener(
        fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED,
        this.fChatLibInstance.joinChannelsWhereInvited
      );
      this.fChatLibInstance.addCommandListener(
        fchatServerCommandTypes.CHANNEL_INVITE_RECEIVED,
        this.fChatLibInstance.joinChannelsWhereInvited
      );
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  gjoinchannel(args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const parsedArgs = gjoinchannelArgs.safeParse(args);
    if (parsedArgs.success) {
      if (this.fChatLibInstance.isUserMaster(data.character)) {
        this.fChatLibInstance.joinNewChannel(parsedArgs.data);
      } else {
        this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
      }
    } else {
      this.fChatLibInstance.sendMessage('Invalid channel name.', data.channel);
    }
  }

  gstatus(args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const parsedArgs = gstatusArgs.safeParse(args);
    if (parsedArgs.success) {
      if (this.fChatLibInstance.isUserMaster(data.character)) {
        this.fChatLibInstance.setStatus(parsedArgs.data.status, parsedArgs.data.message);
      } else {
        this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
      }
    } else {
      this.fChatLibInstance.sendMessage('Invalid status: ' + parsedArgs.error.message, data.channel);
    }
  }

  list(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const userList = this.fChatLibInstance.getUserList(data.channel);
    const users = userList.join(', ').trim();
    this.fChatLibInstance.sendMessage('Here are the current characters in the room: ' + users, data.channel);
  }

  listops(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const chatOPList = this.fChatLibInstance.getChatOPList(data.channel);
    const ops = chatOPList.join(', ').trim();
    this.fChatLibInstance.sendMessage('Here are the current operators in the room: ' + ops, data.channel);
  }

  loadplugin(args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const parsedArgs = loadpluginArgs.safeParse(args);
    if (this.fChatLibInstance.isUserMaster(data.character)) {
      if (parsedArgs.success) {
        this.commandHandlerHelper.internalLoadPlugin(parsedArgs.data, this);
      } else {
        this.fChatLibInstance.sendMessage('Invalid plugin name: ' + parsedArgs.error.message, data.channel);
      }
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  loadedplugins(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserChatOP(data.character, data.channel)) {
      this.fChatLibInstance.sendMessage(
        'The following plugins are loaded: ' +
          this.pluginsLoaded
            .map((x) => {
              return x.name;
            })
            .join(', '),
        data.channel
      );
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  unloadplugin(args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const parsedArgs = loadpluginArgs.safeParse(args);
    if (this.fChatLibInstance.isUserMaster(data.character)) {
      if (parsedArgs.success) {
        this.commandHandlerHelper.internalUnloadPlugin(parsedArgs.data);
      } else {
        this.fChatLibInstance.sendMessage('Invalid plugin name: ' + parsedArgs.error.message, data.channel);
      }
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  updateplugins(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserChatOP(data.character, data.channel)) {
      this.commandHandlerHelper.internalUpdatePlugins();
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }

  uptime(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    this.fChatLibInstance.sendMessage(
      'The bot has been running for ' + this.commandHandlerHelper.internalGetUptime(),
      data.channel
    );
  }

  flushpluginslist(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    if (this.fChatLibInstance.isUserChatOP(data.character, data.channel)) {
      this.fChatLibInstance.channels[data.channel] = [];
      this.fChatLibInstance.sendMessage('Removed all plugins, the bot will restart.', data.channel);
      this.fChatLibInstance.softRestart(data.channel);
    } else {
      this.fChatLibInstance.sendMessage("You don't have sufficient rights.", data.channel);
    }
  }
}
