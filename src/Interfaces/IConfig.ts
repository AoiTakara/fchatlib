export type LogLevel = "debug" | "info" | "error" | "none";
export interface IConfig{
    username:string;
    password:string;
    character:string
    master:string;
    cname:string;
    cversion:string;
    room:string;
    autoJoinOnInvite:boolean;
    /** The absolute file path to the folder where the bot will save its runtime data.
     * @default process.cwd()+"/config"
     */
    saveFolder?:string;
    /** The name of the file where the bot will save its runtime data.
     * @default "config.rooms.js"
     */
    saveFileName?:string;
    logLevel?:LogLevel;
}