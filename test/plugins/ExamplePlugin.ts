import { v4 as uuidv4 } from 'uuid';
import FChatLib from '../../src/FChatLib';
import { fchatServerCommandTypes, SchemaForCommand } from '../../src/FchatServerCommands';

export class ExamplePluginfsf {
  fChatLibInstance: FChatLib;
  channel: string;
  randomId: string;

  constructor(fChatLib: FChatLib, chan: string) {
    this.fChatLibInstance = fChatLib;
    this.fChatLibInstance.addCommandListener(fchatServerCommandTypes.ROLL_RESULT, (data) => {
      this.fChatLibInstance.sendMessage(`Random seed: ${this.randomId.toString()}`, data.channel);
    });
    this.channel = chan;
    this.randomId = uuidv4();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  hello(args: string, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const word = args ?? 'everyone';
    this.fChatLibInstance.sendMessage(`${data.character} wishes Bonjour! to ${word} in ${data.channel}`, data.channel);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  rng(_args: string, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    this.fChatLibInstance.sendMessage(`Random seed: ${this.randomId.toString()}`, data.channel);
  }
}
