'use strict';
import CommandHandler from "./CommandHandler";
import {IPlugin} from "./Interfaces/IPlugin";
import {IConfig} from "./Interfaces/IConfig";
import {IMsgEvent} from "./Interfaces/IMsgEvent";
import { io, Socket } from 'socket.io-client';
import request from "request";
import { writeFileSync, statSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

// Type interfaces for event types
export interface ConnectionEvent {
    count: number;
}

export interface ChatOPListEvent {
    oplist: string[];
    channel: string;
}

export interface ChatOPAddedEvent {
    channel: string;
    character: string;
}

export interface ChatOPRemovedEvent {
    channel: string;
    character: string;
}

export interface OfflineEvent {
    character: string;
}

export interface InitialChannelDataEvent {
    users: { identity: string }[];
    channel: string;
    mode: 'chat';
}

export interface InviteEvent {
    channel: string;
    character: string;
}

export interface JoinEvent {
    title: string;
    channel: string;
    character: { identity: string };
}

export interface KickEvent {
    operator: string;
    channel: string;
    character: string;
}

export interface LeaveEvent {
    channel: string;
    character: string;
}

export interface MessageEvent {
    character: string;
    message: string;
    channel: string;
}

export interface VariableEvent {
    variable: string;
    value: number;
}

export interface ListEvent {
    characters: [string, string, string, string][];
}

export interface FriendsAndBookmarksEvent {
    characters: string[];
}

export interface IdentityEvent {
    character: string;
}

export interface TypingStatusEvent {
    character: string;
    status: string;
}

export interface SystemMessageEvent {
    message: string;
    channel: string;
}

export interface ProfileDataEvent {
    type: string;
    message: string;
    key: string;
    value: string;
}

export interface OnlineEvent {
    character: string;
}

export type PingEvent = undefined;

export interface PrivateMessageEvent {
    character: string;
    message: string;
}

export interface DescriptionChangeEvent {
    channel: string;
    description: string;
}

export interface RollEventRoll {
    channel: string;
    results: number[];
    type: string;
    message: string;
    rolls: string[];
    character: string;
    endresult: number;
}

export interface RollEventBottle {
    target: string;
    channel: string;
    message: string;
    type: 'bottle';
    character: string;
}

export type RollEvent = RollEventRoll | RollEventBottle;

export interface StatusEvent {
    status: string;
    character: string;
    statusmsg: string;
}

export interface BanEvent {
    operator: string;
    channel: string;
    character: string;
}

export type FChatListener<T> = (event: T) => Promise<void> | void;

// Zod schemas for event types
export const ConnectionEventSchema = z.object({
    count: z.number()
}).required();

export const ChatOPListEventSchema = z.object({
    oplist: z.array(z.string()),
    channel: z.string()
}).required();

export const ChatOPAddedEventSchema = z.object({
    channel: z.string(),
    character: z.string()
}).required();

export const ChatOPRemovedEventSchema = z.object({
    channel: z.string(),
    character: z.string()
}).required();

export const OfflineEventSchema = z.object({
    character: z.string()
}).required();

export const InitialChannelDataEventSchema = z.object({
    users: z.array(z.object({ identity: z.string() })),
    channel: z.string(),
    mode: z.literal('chat')
}).required();

export const InviteEventSchema = z.object({
    channel: z.string(),
    character: z.string()
}).required();

export const JoinEventSchema = z.object({
    title: z.string(),
    channel: z.string(),
    character: z.object({ identity: z.string() })
}).required();

export const KickEventSchema = z.object({
    operator: z.string(),
    channel: z.string(),
    character: z.string()
}).required();

export const LeaveEventSchema = z.object({
    channel: z.string(),
    character: z.string()
}).required();

export const MessageEventSchema = z.object({
    character: z.string(),
    message: z.string(),
    channel: z.string()
}).required();

export const VariableEventSchema = z.object({
    variable: z.string(),
    value: z.number()
}).required();

export const ListEventSchema = z.object({
    characters: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()]))
}).required();

export const FriendsAndBookmarksEventSchema = z.object({
    characters: z.array(z.string())
}).required();

export const IdentityEventSchema = z.object({
    character: z.string()
}).required();

export const TypingStatusEventSchema = z.object({
    character: z.string(),
    status: z.string()
}).required();

export const SystemMessageEventSchema = z.object({
    message: z.string(),
    channel: z.string()
}).required();

export const ProfileDataEventSchema = z.object({
    type: z.string(),
    message: z.string(),
    key: z.string(),
    value: z.string()
}).required();

export const OnlineEventSchema = z.object({
    character: z.string()
}).required();

export const PingEventSchema = z.undefined();

export const PrivateMessageEventSchema = z.object({
    character: z.string(),
    message: z.string()
}).required();

export const DescriptionChangeEventSchema = z.object({
    channel: z.string(),
    description: z.string()
}).required();

export const RollEventRollSchema = z.object({
    channel: z.string(),
    results: z.array(z.number()),
    type: z.string(),
    message: z.string(),
    rolls: z.array(z.string()),
    character: z.string(),
    endresult: z.number()
}).required();

export const RollEventBottleSchema = z.object({
    target: z.string(),
    channel: z.string(),
    message: z.string(),
    type: z.literal('bottle'),
    character: z.string()
}).required();

export const RollEventSchema = z.discriminatedUnion('type', [
    RollEventRollSchema,
    RollEventBottleSchema
]);

export const StatusEventSchema = z.object({
    status: z.string(),
    character: z.string(),
    statusmsg: z.string()
}).required();

export const BanEventSchema = z.object({
    operator: z.string(),
    channel: z.string(),
    character: z.string()
}).required();

export default class FChatLib {

    addConnectionListener(fn: FChatListener<ConnectionEvent>):void{
        this.removeConnectionListener(fn);
        this.connectionListeners.push(fn);
    }

    removeConnectionListener(fn: FChatListener<ConnectionEvent>):void{
        let id = this.connectionListeners.indexOf(fn);
        if(id != -1){
            this.connectionListeners.splice(id,1);
        }
    }

    addJoinListener(fn: FChatListener<JoinEvent>):void{
        this.removeJoinListener(fn);
        this.joinListeners.push(fn);
    }

    removeJoinListener(fn: FChatListener<JoinEvent>):void{
        let id = this.joinListeners.indexOf(fn);
        if(id != -1){
            this.joinListeners.splice(id,1);
        }
    }

    addLeaveListener(fn: FChatListener<LeaveEvent>):void{
        this.removeLeaveListener(fn);
        this.leaveListeners.push(fn);
    }

    removeLeaveListener(fn: FChatListener<LeaveEvent>):void{
        let id = this.leaveListeners.indexOf(fn);
        if(id != -1){
            this.leaveListeners.splice(id,1);
        }
    }

    addOnlineListener(fn: FChatListener<OnlineEvent>):void{
        this.removeOnlineListener(fn);
        this.onlineListeners.push(fn);
    }

    removeOnlineListener(fn: FChatListener<OnlineEvent>):void{
        let id = this.onlineListeners.indexOf(fn);
        if(id != -1){
            this.onlineListeners.splice(id,1);
        }
    }

    addOfflineListener(fn: FChatListener<OfflineEvent>):void{
        this.removeOfflineListener(fn);
        this.offlineListeners.push(fn);
    }

    removeOfflineListener(fn: FChatListener<OfflineEvent>):void{
        let id = this.offlineListeners.indexOf(fn);
        if(id != -1){
            this.offlineListeners.splice(id,1);
        }
    }

    addStatusListener(fn: FChatListener<StatusEvent>):void{
        this.removeStatusListener(fn);
        this.statusListeners.push(fn);
    }

    removeStatusListener(fn: FChatListener<StatusEvent>):void{
        let id = this.statusListeners.indexOf(fn);
        if(id != -1){
            this.statusListeners.splice(id,1);
        }
    }

    addChatOPListListener(fn: FChatListener<ChatOPListEvent>):void{
        this.removeChatOPListListener(fn);
        this.chatOPListListeners.push(fn);
    }

    removeChatOPListListener(fn: FChatListener<ChatOPListEvent>):void{
        let id = this.chatOPListListeners.indexOf(fn);
        if(id != -1){
            this.chatOPListListeners.splice(id,1);
        }
    }

    addChatOPAddedListener(fn: FChatListener<ChatOPAddedEvent>):void{
        this.removeChatOPAddedListener(fn);
        this.chatOPAddedListeners.push(fn);
    }

    removeChatOPAddedListener(fn: FChatListener<ChatOPAddedEvent>):void{
        let id = this.chatOPAddedListeners.indexOf(fn);
        if(id != -1){
            this.chatOPAddedListeners.splice(id,1);
        }
    }

    addChatOPRemovedListener(fn: FChatListener<ChatOPRemovedEvent>):void{
        this.removeChatOPRemovedListener(fn);
        this.chatOPRemovedListeners.push(fn);
    }

    removeChatOPRemovedListener(fn: FChatListener<ChatOPRemovedEvent>):void{
        let id = this.chatOPRemovedListeners.indexOf(fn);
        if(id != -1){
            this.chatOPRemovedListeners.splice(id,1);
        }
    }

    addInviteListener(fn: FChatListener<InviteEvent>):void{
        this.removeInviteListener(fn);
        this.inviteListeners.push(fn);
    }

    removeInviteListener(fn: FChatListener<InviteEvent>):void{
        let id = this.inviteListeners.indexOf(fn);
        if(id != -1){
            this.inviteListeners.splice(id,1);
        }
    }

    addKickListener(fn: FChatListener<KickEvent>):void{
        this.removeKickListener(fn);
        this.kickListeners.push(fn);
    }

    removeKickListener(fn: FChatListener<KickEvent>):void{
        let id = this.kickListeners.indexOf(fn);
        if(id != -1){
            this.kickListeners.splice(id,1);
        }
    }

    addBanListener(fn: FChatListener<BanEvent>):void{
        this.removeBanListener(fn);
        this.banListeners.push(fn);
    }

    removeBanListener(fn: FChatListener<BanEvent>):void{
        let id = this.banListeners.indexOf(fn);
        if(id != -1){
            this.banListeners.splice(id,1);
        }
    }

    addDescriptionChangeListener(fn: FChatListener<DescriptionChangeEvent>):void{
        this.removeDescriptionChangeListener(fn);
        this.descriptionChangeListeners.push(fn);
    }

    removeDescriptionChangeListener(fn: FChatListener<DescriptionChangeEvent>):void{
        let id = this.descriptionChangeListeners.indexOf(fn);
        if(id != -1){
            this.descriptionChangeListeners.splice(id,1);
        }
    }

    addPingListener(fn: FChatListener<PingEvent>):void{
        this.removePingListener(fn);
        this.pingListeners.push(fn);
    }

    removePingListener(fn: FChatListener<PingEvent>):void{
        let id = this.pingListeners.indexOf(fn);
        if(id != -1){
            this.pingListeners.splice(id,1);
        }
    }

    addInitialChannelDataListener(fn: FChatListener<InitialChannelDataEvent>):void{
        this.removeInitialChannelDataListener(fn);
        this.initialChannelDataListeners.push(fn);
    }

    removeInitialChannelDataListener(fn: FChatListener<InitialChannelDataEvent>):void{
        let id = this.initialChannelDataListeners.indexOf(fn);
        if(id != -1){
            this.initialChannelDataListeners.splice(id,1);
        }
    }

    addMessageListener(fn: FChatListener<MessageEvent>):void{
        this.removeMessageListener(fn);
        this.messageListeners.push(fn);
    }

    removeMessageListener(fn: FChatListener<MessageEvent>):void{
        let id = this.messageListeners.indexOf(fn);
        if(id != -1){
            this.messageListeners.splice(id,1);
        }
    }

    addPrivateMessageListener(fn: FChatListener<PrivateMessageEvent>):void{
        this.removePrivateMessageListener(fn);
        this.privateMessageListeners.push(fn);
    }

    removePrivateMessageListener(fn: FChatListener<PrivateMessageEvent>):void{
        let id = this.privateMessageListeners.indexOf(fn);
        if(id != -1){
            this.privateMessageListeners.splice(id,1);
        }
    }

    addRollListener(fn: FChatListener<RollEvent>):void{
        this.removeRollListener(fn);
        this.rollListeners.push(fn);
    }

    removeRollListener(fn: FChatListener<RollEvent>):void{
        let id = this.rollListeners.indexOf(fn);
        if(id != -1){
            this.rollListeners.splice(id,1);
        }
    }

    addVariableListener(fn: FChatListener<VariableEvent>):void{
        this.removeVariableListener(fn);
        this.variableListeners.push(fn);
    }

    removeVariableListener(fn: FChatListener<VariableEvent>):void{
        let id = this.variableListeners.indexOf(fn);
        if(id != -1){
            this.variableListeners.splice(id,1);
        }
    }

    addGenericEventListener(fn: FChatListener<unknown>):void{
        this.removeGenericEventListener(fn);
        this.genericEventListeners.push(fn);
    }

    removeGenericEventListener(fn: FChatListener<unknown>):void{
        let id = this.genericEventListeners.indexOf(fn);
        if(id != -1){
            this.genericEventListeners.splice(id,1);
        }
    }

    addListListener(fn: FChatListener<ListEvent>):void{
        this.removeListListener(fn);
        this.listListeners.push(fn);
    }

    removeListListener(fn: FChatListener<ListEvent>):void{
        let id = this.listListeners.indexOf(fn);
        if(id != -1){
            this.listListeners.splice(id,1);
        }
    }

    addFriendsAndBookmarksListener(fn: FChatListener<FriendsAndBookmarksEvent>):void{
        this.removeGenericEventListener(fn);
        this.friendsAndBookmarksListeners.push(fn);
    }

    removeFriendsAndBookmarksListener(fn: FChatListener<FriendsAndBookmarksEvent>):void{
        let id = this.friendsAndBookmarksListeners.indexOf(fn);
        if(id != -1){
            this.friendsAndBookmarksListeners.splice(id,1);
        }
    }

    addIdentityListener(fn: FChatListener<IdentityEvent>):void{
        this.removeIdentityListener(fn);
        this.identityListeners.push(fn);
    }

    removeIdentityListener(fn: FChatListener<IdentityEvent>):void{
        let id = this.identityListeners.indexOf(fn);
        if(id != -1){
            this.identityListeners.splice(id,1);
        }
    }

    addSystemMessagesListener(fn: FChatListener<SystemMessageEvent>):void{
        this.removeSystemMessagesListener(fn);
        this.systemMessageListeners.push(fn);
    }

    removeSystemMessagesListener(fn: FChatListener<SystemMessageEvent>):void{
        let id = this.systemMessageListeners.indexOf(fn);
        if(id != -1){
            this.systemMessageListeners.splice(id,1);
        }
    }

    addTypingStatusListener(fn: FChatListener<TypingStatusEvent>):void{
        this.removeTypingStatusListener(fn);
        this.typingStatusListeners.push(fn);
    }

    removeTypingStatusListener(fn: FChatListener<TypingStatusEvent>):void{
        let id = this.typingStatusListeners.indexOf(fn);
        if(id != -1){
            this.typingStatusListeners.splice(id,1);
        }
    }

    addProfileDataListener(fn: FChatListener<ProfileDataEvent>):void{
        this.removeProfileDataListener(fn);
        this.profileDataListeners.push(fn);
    }

    removeProfileDataListener(fn: FChatListener<ProfileDataEvent>):void{
        let id = this.profileDataListeners.indexOf(fn);
        if(id != -1){
            this.profileDataListeners.splice(id,1);
        }
    }

    readonly config:IConfig = null;

    private banListeners: FChatListener<BanEvent>[] = [];
    private chatOPAddedListeners: FChatListener<ChatOPAddedEvent>[] = [];
    private chatOPListListeners: FChatListener<ChatOPListEvent>[] = [];
    private chatOPRemovedListeners: FChatListener<ChatOPRemovedEvent>[] = [];
    private connectionListeners: FChatListener<ConnectionEvent>[] = [];
    private descriptionChangeListeners: FChatListener<DescriptionChangeEvent>[] = [];
    private initialChannelDataListeners: FChatListener<InitialChannelDataEvent>[] = [];
    private inviteListeners: FChatListener<InviteEvent>[] = [];
    private joinListeners: FChatListener<JoinEvent>[] = [];
    private kickListeners: FChatListener<KickEvent>[] = [];
    private leaveListeners: FChatListener<LeaveEvent>[] = [];
    private messageListeners: FChatListener<MessageEvent>[] = [];
    private offlineListeners: FChatListener<OfflineEvent>[] = [];
    private onlineListeners: FChatListener<OnlineEvent>[] = [];
    private pingListeners: FChatListener<PingEvent>[] = [];
    private privateMessageListeners: FChatListener<PrivateMessageEvent>[] = [];
    private rollListeners: FChatListener<RollEvent>[] = [];
    private statusListeners: FChatListener<StatusEvent>[] = [];
    private variableListeners: FChatListener<VariableEvent>[] = [];
    private genericEventListeners: FChatListener<unknown>[] = [];
    private listListeners: FChatListener<ListEvent>[] = [];
    private friendsAndBookmarksListeners: FChatListener<FriendsAndBookmarksEvent>[] = [];
    private identityListeners: FChatListener<IdentityEvent>[] = [];
    private typingStatusListeners: FChatListener<TypingStatusEvent>[] = [];
    private systemMessageListeners: FChatListener<SystemMessageEvent>[] = [];
    private profileDataListeners: FChatListener<ProfileDataEvent>[] = [];

    private usersInChannel:string[][] = [];
    private chatOPsInChannel:string[][] = [];
    private commandHandlers: CommandHandler[] = [];
    private users:string[][] = [];

    channels:Map<string, Array<IPlugin>> = new Map<string, Array<IPlugin>>();
    private channelNames:Map<string, string> = new Map<string, string>();

    private ws: Socket;

    private pingInterval:NodeJS.Timeout;

    floodLimit:number = 2.0;
    private lastTimeCommandReceived:number = Number.MAX_VALUE;
    private commandsInQueue:number = 0;
    private saveFolder:string
    private saveFileName:string

    timeout(ms) {
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

        this.saveFolder = this.config.saveFolder || process.cwd()+"/config";
        this.saveFileName = this.config.saveFileName || 'config.rooms.js';

        try {
            if (statSync(this.saveFolder+this.saveFileName)) {
                this.channels = new Map(JSON.parse(readFileSync(this.saveFolder+this.saveFileName, 'utf8')));
            }
        }
        catch(err){}

        if(this.config.room !== undefined && this.channels.get(this.config.room) == null){
            this.channels.set(this.config.room, []);
            this.updateRoomsConfig();
        }
    }

    //create one commandHandler per room
    generateCommandHandlers():void{
        for(let room of this.channels.keys()){
            this.commandHandlers[room] = new CommandHandler(this, room);
        }
    }

    setFloodLimit(delay):void{
        this.floodLimit = delay;
    }

    async connect():Promise<void>{
        this.ws = null;
        this.setFloodLimit(2);

        this.generateCommandHandlers();
        this.addMessageListener(this.commandListener); //basic commands + plugins loader, one instance for one bot

        this.addConnectionListener(this.joinChannelOnConnect);
        if(this.config.autoJoinOnInvite){
            this.addInviteListener(this.joinChannelsWhereInvited);
        }

        this.addVariableListener(this.variableChangeHandler);

        //user handling
        this.addInitialChannelDataListener(this.addUsersToList);
        this.addOfflineListener(this.removeUserFromChannels);
        this.addLeaveListener(this.removeUserFromList);
        this.addJoinListener(this.addUserToList);
        this.addJoinListener(this.saveChannelNames);

        //global user state management
        this.addListListener(this.addUserListToGlobalState);
        this.addOnlineListener(this.onChangeUpdateUserState);
        this.addOfflineListener(this.onChangeUpdateUserState);
        this.addStatusListener(this.onChangeUpdateUserState);
        

        //permissions handling
        this.addChatOPListListener(this.addChatOPsToList);
        this.addChatOPAddedListener(this.addChatOPToList);
        this.addChatOPRemovedListener(this.removeChatOPFromList);

        let ticket = await this.getTicket();
        await this.startWebsockets(ticket);
    }

    joinChannelsWhereInvited(args){
        this.joinNewChannel(args.name);
    }

    private async joinChannelOnConnect(args: ConnectionEvent) {
        for(let room of this.channels.keys()) {
            this.sendWS('JCH', { channel: room });
        }
    }

    setStatus(status:string, message:string){
        this.sendWS('STA', { status: status, statusmsg: message });
    }

    joinNewChannel(channel:string){
        if(this.channels.get(channel) == null){
            this.channels.set(channel, []);
        }
        this.sendWS('JCH', { channel: channel });
        this.commandHandlers[channel] = new CommandHandler(this, channel);

        //save file for rooms
        this.updateRoomsConfig();
    }

    private commandListener(args:IMsgEvent) {
        if(typeof this.commandHandlers[args.channel] !== "undefined")
        {
            try {
                this.commandHandlers[args.channel].processCommand(args);
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
    private addUsersToList(args) {
        if(typeof this.usersInChannel[args.channel] !== "object"){this.usersInChannel[args.channel] = [];}
        for(let i in args.users){
            if(this.usersInChannel[args.channel].indexOf(args.users[i].identity) == -1){
                this.usersInChannel[args.channel].push(args.users[i].identity);
            }
        }
    }

    private addUserToList(args) {
        if(typeof this.usersInChannel[args.channel] !== "object"){this.usersInChannel[args.channel] = [];}
        if(this.usersInChannel[args.channel].indexOf(args.character.identity) == -1){
            this.usersInChannel[args.channel].push(args.character.identity);
        }
    }

    private removeUserFromList(args) {
        if(typeof this.usersInChannel[args.channel] !== "object"){ return; }
        if(this.usersInChannel[args.channel].indexOf(args.character) != -1){
            this.usersInChannel[args.channel].splice(this.usersInChannel[args.channel].indexOf(args.character),1);
        }
    }

    private removeUserFromChannels(args) { //remove if offline
        for(let i in this.usersInChannel){
            if(typeof this.usersInChannel[i] !== "object"){ continue; }
            if(this.usersInChannel[i].indexOf(args.character) != -1){
                this.usersInChannel[i].splice(this.usersInChannel[i].indexOf(args.character),1);
            }
        }
    }

    private saveChannelNames(args) {
        this.channelNames[args.channel] = args.title;
    }

    private addUserListToGlobalState(args) {
        args.characters.forEach(character => {
            this.users[character[0]] = character;
        });
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
                this.users[character][2] = status;
            }
    
            if(statusmsg != ""){
                this.users[character][3] = statusmsg;
            }
        }       
    }

    //permissions
    private addChatOPsToList(args) {
        if(typeof this.chatOPsInChannel[args.channel] !== "object"){this.chatOPsInChannel[args.channel] = [];}
        for(let i in args.oplist){
            if(this.chatOPsInChannel[args.channel].indexOf(args.oplist[i]) == -1){
                this.chatOPsInChannel[args.channel].push(args.oplist[i]);
            }
        }
    }

    private addChatOPToList(args) {
        if(typeof this.chatOPsInChannel[args.channel] !== "object"){this.chatOPsInChannel[args.channel] = [];}
        if(this.chatOPsInChannel[args.channel].indexOf(args.character) == -1){
            this.chatOPsInChannel[args.channel].push(args.character);
        }
    }

    private removeChatOPFromList(args) {
        if(typeof this.chatOPsInChannel[args.channel] !== "object"){ return; }
        if(this.chatOPsInChannel[args.channel].indexOf(args.character) != -1){
            this.chatOPsInChannel[args.channel].splice(this.chatOPsInChannel[args.channel].indexOf(args.character),1);
        }
    }

    private variableChangeHandler(args) {
        switch(args.variable){
            case "msg_flood":
                    this.floodLimit = args.value;
                break;
            default:
                break;
        }
    }

    private async getTicket(){
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

    sendWS(command, object) {
        if (this.ws && this.ws.connected) {
            this.ws.emit('message', command + ' ' + JSON.stringify(object));
        }
    }

    sendMessage(message, channel){
        let json:any = {};
        json.channel = channel;
        json.message = message;
        this.sendData('MSG', json);
    }

    sendPrivMessage(message, character){
        let json:any = {};
        json.message = message;
        json.recipient = character;
        this.sendData('PRI', json);
    }

    getProfileData(character){
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

    getUserList(channel){
        if(this.usersInChannel[channel] == undefined){ return [];}
        return this.usersInChannel[channel];
    }

    getAllUsersList():string[]{
        return [].concat(...this.usersInChannel);
    }

    getChatOPList(channel){
        return (this.chatOPsInChannel[channel] != null ? [] : this.chatOPsInChannel[channel]);
    }

    isUserChatOP(username, channel):boolean{
        return (this.getChatOPList(channel).indexOf(username) != -1 || username == this.config.master);
    }

    isUserMaster(username):boolean{
        return (username == this.config.master);
    }

    disconnect():void {
        if (this.ws) {
            this.ws.disconnect();
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


    private startWebsockets(json):void {
        const socketUrl = 'wss://chat.f-list.net/chat2';
        
        this.ws = io(socketUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.ws.on('connect', () => {
            console.log("Started Socket.IO connection");
            this.sendWS('IDN', json);
            clearInterval(this.pingInterval);
            this.pingInterval = setInterval(() => { this.ws.emit('message', 'PIN'); }, 25000);
        });

        this.ws.on('disconnect', () => {
            console.log("Closed Socket.IO connection");
            process.exit();
        });

        this.ws.on('connect_error', (error) => {
            console.error("Socket.IO connection error:", error);
            setTimeout(() => { this.connect(); }, 4000);
        });

        this.ws.on('message', async (data) => {
            let command:string;
            let argument:any;
            if(this.config.debug){
                console.log(data);
            }
            if (data != null) {
                try {
                    command = argument = "";
                    command = this.splitOnce(data, " ")[0].trim();
                    if(data.toString().substring(command.length).trim() != ""){
                        argument = JSON.parse(data.toString().substring(command.length).trim());
                    }

                    // Handle all listeners in parallel for better performance
                    const listenerPromises: Promise<void>[] = [];

                    switch (command) {
                        case "CON":
                            const conEvent = ConnectionEventSchema.safeParse(argument);
                            if (conEvent.success) {
                                listenerPromises.push(...this.connectionListeners.map(listener => listener.call(this, conEvent.data)));
                            } else {
                                console.error("Error parsing ConnectionEvent:", conEvent.error);
                            }
                            break;
                        case "COL":
                            const colEvent = ChatOPListEventSchema.safeParse(argument);
                            if (colEvent.success) {
                                listenerPromises.push(...this.chatOPListListeners.map(listener => listener.call(this, colEvent.data)));
                            } else {
                                console.error("Error parsing ChatOPListEvent:", colEvent.error);
                            }
                            break;
                        case "COA":
                            const coaEvent = ChatOPAddedEventSchema.safeParse(argument);
                            if (coaEvent.success) {
                                listenerPromises.push(...this.chatOPAddedListeners.map(listener => listener.call(this, coaEvent.data)));
                            } else {
                                console.error("Error parsing ChatOPAddedEvent:", coaEvent.error);
                            }
                            break;
                        case "COR":
                            const corEvent = ChatOPRemovedEventSchema.safeParse(argument);
                            if (corEvent.success) {
                                listenerPromises.push(...this.chatOPRemovedListeners.map(listener => listener.call(this, corEvent.data)));
                            } else {
                                console.error("Error parsing ChatOPRemovedEvent:", corEvent.error);
                            }
                            break;
                        case "FLN":
                            const flnEvent = OfflineEventSchema.safeParse(argument);
                            if (flnEvent.success) {
                                listenerPromises.push(...this.offlineListeners.map(listener => listener.call(this, flnEvent.data)));
                            } else {
                                console.error("Error parsing OfflineEvent:", flnEvent.error);
                            }
                            break;
                        case "ICH":
                            const ichEvent = InitialChannelDataEventSchema.safeParse(argument);
                            if (ichEvent.success) {
                                listenerPromises.push(...this.initialChannelDataListeners.map(listener => listener.call(this, ichEvent.data)));
                            } else {
                                console.error("Error parsing InitialChannelDataEvent:", ichEvent.error);
                            }
                            break;
                        case "JCH":
                            const jchEvent = JoinEventSchema.safeParse(argument);
                            if (jchEvent.success) {
                                listenerPromises.push(...this.joinListeners.map(listener => listener.call(this, jchEvent.data)));
                            } else {
                                console.error("Error parsing JoinEvent:", jchEvent.error);
                            }
                            break;
                        case "LCH":
                            const lchEvent = LeaveEventSchema.safeParse(argument);
                            if (lchEvent.success) {
                                listenerPromises.push(...this.leaveListeners.map(listener => listener.call(this, lchEvent.data)));
                            } else {
                                console.error("Error parsing LeaveEvent:", lchEvent.error);
                            }
                            break;
                        case "NLN":
                            const nlnEvent = OnlineEventSchema.safeParse(argument);
                            if (nlnEvent.success) {
                                listenerPromises.push(...this.onlineListeners.map(listener => listener.call(this, nlnEvent.data)));
                            } else {
                                console.error("Error parsing OnlineEvent:", nlnEvent.error);
                            }
                            break;
                        case "PIN":
                            const pinEvent = PingEventSchema.safeParse(argument);
                            if (pinEvent.success) {
                                listenerPromises.push(...this.pingListeners.map(listener => listener.call(this, pinEvent.data)));
                            } else {
                                console.error("Error parsing PingEvent:", pinEvent.error);
                            }
                            break;
                        case "RLL":
                            const rllEvent = RollEventSchema.safeParse(argument);
                            if (rllEvent.success) {
                                listenerPromises.push(...this.rollListeners.map(listener => listener.call(this, rllEvent.data)));
                            } else {
                                console.error("Error parsing RollEvent:", rllEvent.error);
                            }
                            break;
                        case "STA":
                            const staEvent = StatusEventSchema.safeParse(argument);
                            if (staEvent.success) {
                                listenerPromises.push(...this.statusListeners.map(listener => listener.call(this, staEvent.data)));
                            } else {
                                console.error("Error parsing StatusEvent:", staEvent.error);
                            }
                            break;
                        case "CBU":
                            const cbuEvent = KickEventSchema.safeParse(argument);
                            if (cbuEvent.success) {
                                listenerPromises.push(...this.kickListeners.map(listener => listener.call(this, cbuEvent.data)));
                            } else {
                                console.error("Error parsing KickEvent:", cbuEvent.error);
                            }
                            break;
                        case "CKU":
                            const ckuEvent = BanEventSchema.safeParse(argument);
                            if (ckuEvent.success) {
                                listenerPromises.push(...this.banListeners.map(listener => listener.call(this, ckuEvent.data)));
                            } else {
                                console.error("Error parsing BanEvent:", ckuEvent.error);
                            }
                            break;
                        case "CDS":
                            const cdsEvent = DescriptionChangeEventSchema.safeParse(argument);
                            if (cdsEvent.success) {
                                listenerPromises.push(...this.descriptionChangeListeners.map(listener => listener.call(this, cdsEvent.data)));
                            } else {
                                console.error("Error parsing DescriptionChangeEvent:", cdsEvent.error);
                            }
                            break;
                        case "CIU":
                            const ciuEvent = InviteEventSchema.safeParse(argument);
                            if (ciuEvent.success) {
                                listenerPromises.push(...this.inviteListeners.map(listener => listener.call(this, ciuEvent.data)));
                            } else {
                                console.error("Error parsing InviteEvent:", ciuEvent.error);
                            }
                            break;
                        case "PRI":
                            const priEvent = PrivateMessageEventSchema.safeParse(argument);
                            if (priEvent.success) {
                                listenerPromises.push(...this.privateMessageListeners.map(listener => listener.call(this, priEvent.data)));
                            } else {
                                console.error("Error parsing PrivateMessageEvent:", priEvent.error);
                            }
                            break;
                        case "MSG":
                            const msgEvent = MessageEventSchema.safeParse(argument);
                            if (msgEvent.success) {
                                listenerPromises.push(...this.messageListeners.map(listener => listener.call(this, msgEvent.data)));
                            } else {
                                console.error("Error parsing MessageEvent:", msgEvent.error);
                            }
                            break;
                        case "VAR":
                            const varEvent = VariableEventSchema.safeParse(argument);
                            if (varEvent.success) {
                                listenerPromises.push(...this.variableListeners.map(listener => listener.call(this, varEvent.data)));
                            } else {
                                console.error("Error parsing VariableEvent:", varEvent.error);
                            }
                            break;
                        case "LIS":
                            const lisEvent = ListEventSchema.safeParse(argument);
                            if (lisEvent.success) {
                                listenerPromises.push(...this.listListeners.map(listener => listener.call(this, lisEvent.data)));
                            } else {
                                console.error("Error parsing ListEvent:", lisEvent.error);
                            }
                            break;
                        case "FRL":
                            const frlEvent = FriendsAndBookmarksEventSchema.safeParse(argument);
                            if (frlEvent.success) {
                                listenerPromises.push(...this.friendsAndBookmarksListeners.map(listener => listener.call(this, frlEvent.data)));
                            } else {
                                console.error("Error parsing FriendsAndBookmarksEvent:", frlEvent.error);
                            }
                            break;
                        case "IDN":
                            const idnEvent = IdentityEventSchema.safeParse(argument);
                            if (idnEvent.success) {
                                listenerPromises.push(...this.identityListeners.map(listener => listener.call(this, idnEvent.data)));
                            } else {
                                console.error("Error parsing IdentityEvent:", idnEvent.error);
                            }
                            break;
                        case "TPN":
                            const tpnEvent = TypingStatusEventSchema.safeParse(argument);
                            if (tpnEvent.success) {
                                listenerPromises.push(...this.typingStatusListeners.map(listener => listener.call(this, tpnEvent.data)));
                            } else {
                                console.error("Error parsing TypingStatusEvent:", tpnEvent.error);
                            }
                            break;
                        case "SYS":
                            const sysEvent = SystemMessageEventSchema.safeParse(argument);
                            if (sysEvent.success) {
                                listenerPromises.push(...this.systemMessageListeners.map(listener => listener.call(this, sysEvent.data)));
                            } else {
                                console.error("Error parsing SystemMessageEvent:", sysEvent.error);
                            }
                            break;
                        case "PRD":
                            const prdEvent = ProfileDataEventSchema.safeParse(argument);
                            if (prdEvent.success) {
                                listenerPromises.push(...this.profileDataListeners.map(listener => listener.call(this, prdEvent.data)));
                            } else {
                                console.error("Error parsing ProfileDataEvent:", prdEvent.error);
                            }
                            break;
                        default:
                            listenerPromises.push(...this.genericEventListeners.map(listener => listener.call(this, argument)));
                            break;
                    }

                    // Wait for all listeners to complete
                    await Promise.allSettled(listenerPromises);
                } catch (error) {
                    console.error('Error processing message:', error);
                    // Optionally notify about the error
                    if (this.config.master) {
                        this.sendPrivMessage(`Error processing message: ${error.message}`, this.config.master);
                    }
                }
            }
        });
    }

    private splitOnce(str, delim) {
        let components = str.split(delim);
        let result = [components.shift()];
        if (components.length) {
            result.push(components.join(delim));
        }
        return result;
    }

}

