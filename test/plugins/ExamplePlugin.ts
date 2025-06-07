import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import FChatLib from '../../src/FChatLib';
import { fchatServerCommandTypes, SchemaForCommand } from '../../src/FchatServerCommands';

const helloArgs = z
  .string()
  .max(255, '<word> is too long')
  .describe('!hello <word>')
  .optional()
  .default('everyone')
  .transform((val) => (val || 'everyone').trim());

export class ExamplePlugin {
  fChatLibInstance: FChatLib;
  channel: string;
  randomId: string;

  constructor(fChatLib: FChatLib, chan: string) {
    this.fChatLibInstance = fChatLib;
    this.fChatLibInstance.addCommandListener(fchatServerCommandTypes.ROLL_RESULT, (data) => {
      return this.fChatLibInstance.sendMessage(`Random seed: ${this.randomId.toString()}`, data.channel);
    });
    this.channel = chan;
    this.randomId = uuidv4();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  hello(args: string, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    const parsedArgs = helloArgs.safeParse(args);
    if (!parsedArgs.success) {
      return this.fChatLibInstance.sendParseMessage('hello', helloArgs, parsedArgs.error, data.channel);
    }
    const word = parsedArgs.data;
    return this.fChatLibInstance.sendMessage(
      `${data.character} wishes Bonjour! to ${word} in ${data.channel}`,
      data.channel
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  rng(_args: string, data: SchemaForCommand<typeof fchatServerCommandTypes.MESSAGE_RECEIVED>) {
    return this.fChatLibInstance.sendMessage(`Random seed: ${this.randomId.toString()}`, data.channel);
  }
}
