import { z } from 'zod';
import packageJson from '../../package.json';

export type LogLevel = 'debug' | 'info' | 'error' | 'none';
export interface IConfig {
  username: string;
  password: string;
  character: string;
  master: string;
  /** The bot client name that FChat admins can see.
   * @default "AoiBot"
   */
  cname?: string;
  /** The bot client version that FChat admins can see.
   * @default package.json version
   */
  cversion?: string;
  room: string;
  autoJoinOnInvite: boolean;
  /** The absolute file path to the folder where the bot will save its runtime data.
   * @default process.cwd()+"/config"
   */
  saveFolder?: string;
  /** The name of the file where the bot will save its runtime data.
   * @default "config.rooms.js"
   */
  saveFileName?: string;
  logLevel?: LogLevel;
  /** The folder where the bot will look for plugins.
   * @default "plugins/"
   */
  pluginFolder?: string;
}

export const configSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
  character: z.string().min(1).max(255),
  master: z.string().min(1).max(255),
  cname: z.string().optional().default('AoiBot'),
  cversion: z.string().optional().default(packageJson.version),
  room: z.string().min(1).max(255),
  autoJoinOnInvite: z.boolean().optional().default(false),
  saveFolder: z.string().optional().default(`${process.cwd()}/config/`),
  saveFileName: z.string().optional().default('config.rooms.json'),
  logLevel: z.enum(['debug', 'info', 'error', 'none']).optional().default('info'),
  pluginFolder: z.string().optional().default(`${process.cwd()}/plugins/`),
});
