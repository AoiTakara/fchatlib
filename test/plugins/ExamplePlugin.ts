import FChatLib from "../../src/FChatLib";
import { fchatServerCommandTypes, SchemaForCommand } from "../../src/FchatServerCommands";

import { v4 as uuidv4 } from 'uuid';

export class ExamplePluginfsf {
  fChatLibInstance: FChatLib;
  channel: string;
  randomId: string;

  constructor(fChatLib: FChatLib, chan: string) {
    this.fChatLibInstance = fChatLib;
    this.fChatLibInstance.addCommandListener(fchatServerCommandTypes.ROLL_RESULT, (data) => {
      this.fChatLibInstance.sendMessage('Random seed: ' + this.randomId.toString(), data.channel);
    });
    this.channel = chan;
    this.randomId = uuidv4();
  }

  hello(args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const word = args || 'everyone';
    this.fChatLibInstance.sendMessage(
      data.character + ' wishes Bonjour! to ' + word + ' in ' + data.channel,
      data.channel
    );
  }

  rng(_args: unknown, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    this.fChatLibInstance.sendMessage('Random seed: ' + this.randomId.toString(), data.channel);
  }
}
