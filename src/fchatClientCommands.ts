import { z } from 'zod';
import {
  characterFurryPreferenceSchema,
  characterGenderSchema,
  characterLanguageSchema,
  characterOrientationSchema,
  characterRoleSchema,
  channelSchema,
  roomModeSchema,
  statusSchema,
  diceOrBottleSchema,
} from './commonSchemas';

/** The entire list of valid F-Chat client commands.
 * See https://wiki.f-list.net/F-Chat_Client_Commands for more information. */
export const fchatClientCommandTypes = {
  /** Account Ban - Request a character's account be banned from the server. */
  ACCOUNT_BAN: 'ACB',
  /** Admin Op Promote - Promotes a user to be a chatop (global moderator). */
  ADMIN_OP_PROMOTE: 'AOP',
  /** Account Who Characters - Requests a list of currently connected alts for a characters account. */
  ACCOUNT_WHO_CHARACTERS: 'AWC',
  /** Broadcast - Broadcasts a message to all connections. */
  BROADCAST: 'BRO',
  /** Channel Ban List - Request the channel banlist. */
  CHANNEL_BAN_LIST: 'CBL',
  /** Channel Ban User - Bans a character from a channel. */
  CHANNEL_BAN_USER: 'CBU',
  /** Create Channel Room - Create a private, invite-only channel. */
  CREATE_CHANNEL_ROOM: 'CCR',
  /** Channel Description Set - Changes a channel's description. */
  CHANNEL_DESCRIPTION_SET: 'CDS',
  /** Channel List All - Request a list of all public channels. */
  CHANNEL_LIST_ALL: 'CHA',
  /** Channel Invite User - Sends an invitation for a channel to a user. */
  CHANNEL_INVITE_USER: 'CIU',
  /** Channel Kick User - Kicks a user from a channel. */
  CHANNEL_KICK_USER: 'CKU',
  /** Channel Operator Add - Request a character be promoted to channel operator. */
  CHANNEL_OPERATOR_ADD: 'COA',
  /** Channel Operator List - Requests the list of channel ops. */
  CHANNEL_OPERATOR_LIST: 'COL',
  /** Channel Operator Remove - Demotes a channel operator to a normal user. */
  CHANNEL_OPERATOR_REMOVE: 'COR',
  /** Create Room Channel - Creates an official channel. */
  CREATE_ROOM_CHANNEL: 'CRC',
  /** Channel Set Owner - Set a new channel owner. */
  CHANNEL_SET_OWNER: 'CSO',
  /** Channel Timeout User - Temporarily bans a user from the channel for 1-90 minutes. */
  CHANNEL_TIMEOUT_USER: 'CTU',
  /** Channel Unban User - Unbans a user from a channel. */
  CHANNEL_UNBAN_USER: 'CUB',
  /** Demote Op - Demotes a chatop (global moderator). */
  DEMOTE_OP: 'DOP',
  /** F-List Kink Search - Search for characters fitting the user's selections. */
  FLIST_KINK_SEARCH: 'FKS',
  /** Identify - This command is used to identify with the server. */
  IDENTIFY: 'IDN',
  /** Ignore - Handle actions related to the ignore list. */
  IGNORE: 'IGN',
  /** Join Channel - Send a channel join request. */
  JOIN_CHANNEL: 'JCH',
  /** Kick Channel - Deletes a channel from the server. */
  KICK_CHANNEL: 'KIC',
  /** Kick User - Request a character be kicked from the server. */
  KICK_USER: 'KIK',
  /** Kink Info - Request a list of a user's kinks. */
  KINK_INFO: 'KIN',
  /** Leave Channel - Request to leave a channel. */
  LEAVE_CHANNEL: 'LCH',
  /** Looking for Roleplay - Sends a chat ad to all other users in a channel. */
  LOOKING_FOR_ROLEPLAY: 'LRP',
  /** Message - Sends a message to all other users in a channel. */
  MESSAGE: 'MSG',
  /** Open Rooms List - Request a list of open private rooms. */
  OPEN_ROOMS_LIST: 'ORS',
  /** Ping - Sends a ping response to the server. */
  PING: 'PIN',
  /** Private Message - Sends a private message to another user. */
  PRIVATE_MESSAGE: 'PRI',
  /** Profile Request - Requests some of the profile tags on a character. */
  PROFILE_REQUEST: 'PRO',
  /** Roll Dice - Roll dice or spin the bottle. */
  ROLL_DICE: 'RLL',
  /** Reload - Reload certain server config files. */
  RELOAD: 'RLD',
  /** Room Mode - Change room mode to accept chat, ads, or both. */
  ROOM_MODE: 'RMO',
  /** Room Status - Sets a private room's status to closed or open. */
  ROOM_STATUS: 'RST',
  /** Reward - Rewards a user, setting their status to 'crown' until they change it or log out. */
  REWARD: 'RWD',
  /** Staff Call - Alerts admins and chatops of an issue. */
  STAFF_CALL: 'SFC',
  /** Status - Request a new status be set for your character. */
  STATUS: 'STA',
  /** Timeout - Times out a user for a given amount minutes. */
  TIMEOUT: 'TMO',
  /** Typing Status - 'user x is typing/stopped typing/has entered text' for private messages. */
  TYPING_STATUS: 'TPN',
  /** Unban - Unbans a character's account from the server. */
  UNBAN: 'UNB',
  /** Uptime - Requests info about how long the server has been running. */
  UPTIME: 'UPT',
} as const;

export const AccountBanCommand = {
  type: fchatClientCommandTypes.ACCOUNT_BAN,
  schema: z.object({
    character: z.string().describe('The character to ban from the server.'),
  }).describe(`Request a character's account be banned from the server.
        Warning: This command requires chat op or higher.
        Example: ACB { "character": "CharacterName" }`),
} as const;

export const AdminOpPromoteCommand = {
  type: fchatClientCommandTypes.ADMIN_OP_PROMOTE,
  schema: z.object({
    character: z.string().describe('The character to promote to chatop.'),
  }).describe(`Promotes a user to be a chatop (global moderator).
        Warning: This command is admin only.
        Example: AOP { "character": "CharacterName" }`),
} as const;

export const AccountWhoCharactersCommand = {
  type: fchatClientCommandTypes.ACCOUNT_WHO_CHARACTERS,
  schema: z.object({
    character: z.string().describe('The character to check for connected alts.'),
  }).describe(`Requests a list of currently connected alts for a characters account.
        Warning: This command requires chat op or higher.
        Example: AWC { "character": "CharacterName" }`),
} as const;

export const BroadcastCommand = {
  type: fchatClientCommandTypes.BROADCAST,
  schema: z.object({
    message: z.string().describe('The message to broadcast to all connections.'),
  }).describe(`Broadcasts a message to all connections.
        Warning: This command is admin only.
        Example: BRO { "message": "Server maintenance in 10 minutes" }`),
} as const;

export const ChannelBanListCommand = {
  type: fchatClientCommandTypes.CHANNEL_BAN_LIST,
  schema: z.object({
    channel: channelSchema.describe('The channel to get the banlist for.'),
  }).describe(`Request the channel banlist.
        Warning: This command requires channel op or higher. This command does not have a unique response command from the server; A response is sent as SYS. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CBL {"channel":"ADH-c7fc4c15c858dd76d860"}`),
} as const;

export const ChannelBanUserCommand = {
  type: fchatClientCommandTypes.CHANNEL_BAN_USER,
  schema: z.object({
    character: z.string().describe('The character being banned.'),
    channel: channelSchema.describe('The channel from which the character is being banned.'),
  }).describe(`Bans a character from a channel.
        Warning: This command requires channel op or higher. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CBU {"character":"Pas un Caractere","channel":"ADH-c7fc4c15c858dd76d860"}`),
} as const;

export const CreateChannelRoomCommand = {
  type: fchatClientCommandTypes.CREATE_CHANNEL_ROOM,
  schema: z.object({
    channel: z.string().describe('The title for the newly created channel.'),
  }).describe(`Create a private, invite-only channel.
        Warning: The channel param is used as the title for the newly created channel, not the actual channel name used to join the channel. The server will send the channel's actual ID in response.
        Example: CCR {"channel":"test"}`),
} as const;

export const ChannelDescriptionSetCommand = {
  type: fchatClientCommandTypes.CHANNEL_DESCRIPTION_SET,
  schema: z.object({
    channel: channelSchema.describe('The channel to change the description for.'),
    description: z.string().describe('The new description for the channel.'),
  }).describe(`Changes a channel's description.
        Warning: This command requires channel op or higher. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CDS {"description": "[color=red]No actual roleplay in here. For discussion of anything at all, please go to the correct channels.[/color] This is the channel for RP offers and announcements.", "channel": "Looking for RP"}`),
} as const;

export const ChannelListAllCommand = {
  type: fchatClientCommandTypes.CHANNEL_LIST_ALL,
  schema: z.undefined().describe(`Request a list of all public channels.
        Warning: This is an argumentless command.
        Example: CHA`),
} as const;

export const ChannelInviteUserCommand = {
  type: fchatClientCommandTypes.CHANNEL_INVITE_USER,
  schema: z.object({
    channel: channelSchema.describe('The channel to invite the user to.'),
    character: z.string().describe('The character to invite to the channel.'),
  }).describe(`Sends an invitation for a channel to a user.
        Warning: This command requires channel op or higher. This command does not have a unique response command from the server; a response is sent as SYS. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CIU {"character":"Testytest", "channel":"ADH-011aeb5bb591b1f4721a"}`),
} as const;

export const ChannelKickUserCommand = {
  type: fchatClientCommandTypes.CHANNEL_KICK_USER,
  schema: z.object({
    channel: channelSchema.describe('The channel to kick the user from.'),
    character: z.string().describe('The character to kick from the channel.'),
  }).describe(`Kicks a user from a channel.
        Warning: This command requires channel op or higher. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CKU { "channel": "channelname", "character": "charactername" }`),
} as const;

export const ChannelOperatorAddCommand = {
  type: fchatClientCommandTypes.CHANNEL_OPERATOR_ADD,
  schema: z.object({
    channel: channelSchema.describe('The channel to add the operator to.'),
    character: z.string().describe('The character to promote to channel operator.'),
  }).describe(`Request a character be promoted to channel operator (channel moderator).
        Warning: This command requires channel op or higher. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: COA { "channel": "channelname", "character": "charactername" }`),
} as const;

export const ChannelOperatorListCommand = {
  type: fchatClientCommandTypes.CHANNEL_OPERATOR_LIST,
  schema: z.object({
    channel: channelSchema.describe('The channel to get the operator list for.'),
  }).describe(`Requests the list of channel ops (channel moderators).
        Warning: This command does not have a unique response command from the server; A response is sent as SYS. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: COL { "channel": "channelname" }`),
} as const;

export const ChannelOperatorRemoveCommand = {
  type: fchatClientCommandTypes.CHANNEL_OPERATOR_REMOVE,
  schema: z.object({
    channel: channelSchema.describe('The channel to remove the operator from.'),
    character: z.string().describe('The character to demote from channel operator.'),
  }).describe(`Demotes a channel operator (channel moderator) to a normal user.
        Warning: This command requires channel op or higher. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: COR { "channel": "channelname", "character": "charactername" }`),
} as const;

export const CreateRoomChannelCommand = {
  type: fchatClientCommandTypes.CREATE_ROOM_CHANNEL,
  schema: z.object({
    channel: z.string().describe('The name of the official channel to create.'),
  }).describe(`Creates an official channel.
        Warning: This command is admin only.
        Example: CRC { "channel": "channelname" }`),
} as const;

export const ChannelSetOwnerCommand = {
  type: fchatClientCommandTypes.CHANNEL_SET_OWNER,
  schema: z.object({
    character: z.string().describe('The character to set as owner.'),
    channel: channelSchema.describe('Which channel to set the owner in.'),
  }).describe(`Set a new channel owner.
        Warning: This command requires channel op or higher. This command is only implemented in F-Chat 1.0, at the time of this writing. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CSO {"character":"Jinni Wicked","channel":"ADH-3875a3c8c11325b49992"}`),
} as const;

export const ChannelTimeoutUserCommand = {
  type: fchatClientCommandTypes.CHANNEL_TIMEOUT_USER,
  schema: z.object({
    channel: channelSchema.describe('The channel from which to remove the character.'),
    character: z.string().describe('The character to timeout.'),
    length: z.number().min(1).max(90).describe('The time, in minutes, to keep the character out of the room.'),
  }).describe(`Temporarily bans a user from the channel for 1-90 minutes. A channel timeout.
        Warning: This command requires channel op or higher.
        Example: CTU {"channel":"Frontpage", "character":"Treebob", "length":"30"}`),
} as const;

export const ChannelUnbanUserCommand = {
  type: fchatClientCommandTypes.CHANNEL_UNBAN_USER,
  schema: z.object({
    channel: channelSchema.describe('The channel to unban the character from.'),
    character: z.string().describe('The character to unban from the channel.'),
  }).describe(`Unbans a user from a channel.
        Warning: This command requires channel op or higher. This command does not have a unique response command from the server; A response is sent as SYS. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: CUB { channel: "channel", character: "character" }`),
} as const;

export const DemoteOpCommand = {
  type: fchatClientCommandTypes.DEMOTE_OP,
  schema: z.object({
    character: z.string().describe('The character to demote from chatop.'),
  }).describe(`Demotes a chatop (global moderator).
        Warning: This command is admin only.
        Example: DOP { "character": "charactername" }`),
} as const;

export const FlistKinkSearchCommand = {
  type: fchatClientCommandTypes.FLIST_KINK_SEARCH,
  schema: z.object({
    kinks: z
      .array(z.string())
      .describe(
        'The kink IDs to search for. List available here: https://www.f-list.net/json/chat-search-getfields.json?ids=true.'
      ),
    genders: z.array(characterGenderSchema).describe('The genders to search for.').optional(),
    orientations: z.array(characterOrientationSchema).describe('The orientations to search for.').optional(),
    languages: z.array(characterLanguageSchema).describe('The languages to search for.').optional(),
    furryprefs: z.array(characterFurryPreferenceSchema).describe('The furry preferences to search for.').optional(),
    roles: z.array(characterRoleSchema).describe('The roles to search for.').optional(),
  })
    .describe(`Search for characters fitting the user's selections. Kinks is required, all other parameters are optional.
        Warning: Kinks are identified by kinkids, available at the kink endpoints, along with the full list of other parameters.
        Example: FKS {"kinks":["523","66"],"genders":["Male","Maleherm"], "orientations":["Gay","Bi - male preference","Bisexual"], "languages":["Dutch"], "furryprefs":["Furs and / or humans","Humans ok, Furries Preferred","No humans, just furry characters"], "roles":["Always dominant", "Usually dominant"] }`),
} as const;

export const IdentifyCommand = {
  type: fchatClientCommandTypes.IDENTIFY,
  schema: z.object({
    method: z.literal('ticket').describe('The authentication method.'),
    account: z.string().describe('The account name.'),
    ticket: z.string().describe('The authentication ticket.'),
    character: z.string().describe('The character name.'),
    cname: z.string().describe("The client's identifying name."),
    cversion: z.string().describe("The client's identifying version."),
  }).describe(`This command is used to identify with the server.
        Warning: If you send any commands before identifying, you will be disconnected. A ticket can be acquired using the JSONP endpoint, see the JSON endpoints section of the documentation for details.
        Example: IDN { "method": "ticket", "account": "username", "ticket": "authticket", "character": "charactername", "cname": "clientname", "cversion": "1.0" }`),
} as const;

export const IgnoreCommand = {
  type: fchatClientCommandTypes.IGNORE,
  schema: z.object({
    action: z.enum(['add', 'delete', 'notify', 'list']).describe('The action to perform on the ignore list.'),
    character: z.string().describe('The character to perform the action on.').optional(),
  })
    .describe(`A multi-faceted command to handle actions related to the ignore list. The server does not actually handle much of the ignore process, as it is the client's responsibility to block out messages it receives from the server if that character is on the user's ignore list.
        Warning: add: adds the character to the ignore list, delete: removes the character from the ignore list, notify: notifies the server that character sending a PRI has been ignored, list: returns full ignore list. Does not take 'character' parameter.
        Example: IGN {"action": "add", "character": "Teal Deer"}
        Example: IGN{"action": "delete", "character": "Teal Deer"}
        Example: IGN{"action": "notify", "character": "Teal Deer"}
        Example: IGN{"action": "list"}`),
} as const;

export const JoinChannelCommand = {
  type: fchatClientCommandTypes.JOIN_CHANNEL,
  schema: z.object({
    channel: channelSchema.describe('The channel to join.'),
  }).describe(`Send a channel join request.
        Warning: As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: JCH {"channel": "Frontpage"}`),
} as const;

export const KickChannelCommand = {
  type: fchatClientCommandTypes.KICK_CHANNEL,
  schema: z.object({
    channel: channelSchema.describe('The channel to delete from the server.'),
  }).describe(`Deletes a channel from the server.
        Warning: This command requires chat op or higher. Private channel owners can destroy their own channels, but it isn't officially supported to do so.
        Example: KIC { "channel": "channelname" }`),
} as const;

export const KickUserCommand = {
  type: fchatClientCommandTypes.KICK_USER,
  schema: z.object({
    character: z.string().describe('The character to kick from the server.'),
  }).describe(`Request a character be kicked from the server.
        Warning: This command requires chat op or higher.
        Example: KIK { "character": "charactername" }`),
} as const;

export const KinkInfoCommand = {
  type: fchatClientCommandTypes.KINK_INFO,
  schema: z.object({
    character: z.string().describe('The character to get kink information for.'),
  }).describe(`Request a list of a user's kinks.
        Warning: This information can also be acquired from a JSON endpoint.
        Example: KIN { "character": "charactername" }`),
} as const;

export const LeaveChannelCommand = {
  type: fchatClientCommandTypes.LEAVE_CHANNEL,
  schema: z.object({
    channel: channelSchema.describe('The channel to leave.'),
  }).describe(`Request to leave a channel.
        Warning: As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: LCH { "channel": "channelname" }`),
} as const;

export const LookingForRoleplayCommand = {
  type: fchatClientCommandTypes.LOOKING_FOR_ROLEPLAY,
  schema: z.object({
    channel: channelSchema.describe('The channel to send the ad to.'),
    message: z.string().describe('The roleplay ad message.'),
  }).describe(`Sends a chat ad to all other users in a channel.
        Warning: If you send more than one ad per ten minutes the message will not be sent, and an ERR will be returned. At this time of writing, there is a maximum length for LRP messages of 50000 bytes (effectively 50000 characters). You should however rely on VAR messages from the server to get the correct limit on your client. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: LRP {"message": "Right, evenin'", "channel": "Frontpage"}`),
} as const;

export const MessageCommand = {
  type: fchatClientCommandTypes.MESSAGE,
  schema: z.object({
    channel: channelSchema.describe('The channel to send the message to.'),
    message: z.string().describe('The message to send.'),
  }).describe(`Sends a message to all other users in a channel.
        Warning: If you send more than one message a second the message will not be sent, and an ERR will be returned. At this time of writing, there is a maximum length for MSG messages of 4096 bytes (effectively 4096 characters). You should however rely on VAR messages from the server to get the correct limit on your client. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: MSG {"message": "Right, evenin'", "channel": "Frontpage"}`),
} as const;

export const OpenRoomsListCommand = {
  type: fchatClientCommandTypes.OPEN_ROOMS_LIST,
  schema: z.undefined().describe(`Request a list of open private rooms.
        Warning: This is an argumentless command.
        Example: ORS`),
} as const;

export const PingCommand = {
  type: fchatClientCommandTypes.PING,
  schema: z.undefined()
    .describe(`Sends a ping response to the server. Timeout detection, and activity to keep the connection alive.
        Warning: You have to respond to pings or you will be disconnected, as that will be detected as a timeout. The server will try to get a ping response three times, each time waiting 30 seconds. So if you don't respond, you will be disconnected after 90 seconds. Sending multiple pings within ten seconds will get you disconnected also. This is an argumentless command.
        Example: PIN`),
} as const;

export const PrivateMessageCommand = {
  type: fchatClientCommandTypes.PRIVATE_MESSAGE,
  schema: z.object({
    recipient: z.string().describe('The character to send the private message to.'),
    message: z.string().describe('The message to send.'),
  }).describe(`Sends a private message to another user.
        Warning: There is flood control; the same as the MSG command. At this time of writing, the maximum length of a private message is 50000 bytes (effectively characters).
        Example: PRI { "recipient": "charactername", "message": "Hello there!" }`),
} as const;

export const ProfileRequestCommand = {
  type: fchatClientCommandTypes.PROFILE_REQUEST,
  schema: z.object({
    character: z.string().describe('The character to get profile information for.'),
  }).describe(`Requests some of the profile tags on a character, such as Top/Bottom position and Language Preference.
        Warning: This information can also be acquired from a JSON endpoint.
        Example: PRO { "character": "charactername" }`),
} as const;

export const RollDiceCommand = {
  type: fchatClientCommandTypes.ROLL_DICE,
  schema: z.object({
    channel: channelSchema.describe('Which channel the command is being used in.'),
    dice: diceOrBottleSchema,
  }).describe(`Roll dice or spin the bottle.
        Warning: dice can be: bottle: selects one person in the room, other than the person sending the command. #d##: rolls # dice with ## sides, each. #d##+#d##: rolls more than one size of dice. #d##+###: adds a number (###) to the roll. # can be any number 1-9. ## can be any number 1-500. ### can be any number up to 10000. It is possible to add up to 20 sets of dice and/or numbers. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: RLL {"channel":"ADH-dce8eb7af86213ac4c15","dice":"bottle"}
        Example: RLL {"channel":"ADH-dce8eb7af86213ac4c15","dice":"9d100"}
        Example: RLL {"channel":"ADH-c7fc4c15c858dd76d860","dice":"1d6+1d20"}
        Example: RLL {"channel":"ADH-c7fc4c15c858dd76d860","dice":"1d6+10000"}`),
} as const;

export const ReloadCommand = {
  type: fchatClientCommandTypes.RELOAD,
  schema: z.object({
    save: z.string().describe('The configuration to reload.'),
  }).describe(`Reload certain server config files.
        Warning: This command requires chat op or higher.
        Example: RLD { "save": "configname" }`),
} as const;

export const RoomModeCommand = {
  type: fchatClientCommandTypes.ROOM_MODE,
  schema: z.object({
    channel: channelSchema.describe('Which channel is being changed.'),
    mode: roomModeSchema,
  }).describe(`Change room mode to accept chat, ads, or both.
        Warning: This command requires channel op or higher. As with all commands that refer to a specific channel, official/public channels use the name, but unofficial/private/open private rooms use the channel ID, which can be gotten from ORS.
        Example: RMO {"channel": "ADH-c7fc4c15c858dd76d860" ,"mode": "chat"}`),
} as const;

export const RoomStatusCommand = {
  type: fchatClientCommandTypes.ROOM_STATUS,
  schema: z.object({
    channel: channelSchema.describe('This should be the channel id.'),
    status: z.enum(['public', 'private']).describe("This can be 'public' or 'private'."),
  }).describe(`Sets a private room's status to closed or open.
        Warning: This command has a unique response command from the server.
        Example: RST {"channel":"ADH-06c3db8a4789498d6ae8","status":"public"}`),
} as const;

export const RewardCommand = {
  type: fchatClientCommandTypes.REWARD,
  schema: z.object({
    character: z.string().describe('The character to reward.'),
  }).describe(`Rewards a user, setting their status to 'crown' until they change it or log out.
        Warning: This command is admin only.
        Example: RWD { "character": "charactername" }`),
} as const;

export const StaffCallCommand = {
  type: fchatClientCommandTypes.STAFF_CALL,
  schema: z.object({
    action: z.literal('report').describe("The type of SFC. The client will always send 'report'."),
    report: z.string().describe("The user's complaint."),
    character: z.string().describe('The character being reported.'),
  }).describe(`Alerts admins and chatops (global moderators) of an issue.
        Warning: The webclients also upload logs and have a specific formatting to "report". It is suspected that third-party clients cannot upload logs.
        Example: SFC { "action": "report", "report": "User complaint", "character": "reportedcharacter" }`),
} as const;

export const StatusCommand = {
  type: fchatClientCommandTypes.STATUS,
  schema: z.object({
    status: statusSchema,
    statusmsg: z.string().describe('The status message to set.'),
  }).describe(`Request a new status be set for your character.
        Warning: Crown is a special value, and should not be sent by a client, as it is set by the RWD command. Idle is an automatic status set by some clients, when the user has not interacted with the client for a certain amount of time.
        Example: STA {"status": "looking", "statusmsg": "I'm always available to RP :)", "character": "Hexxy"}`),
} as const;

export const TimeoutCommand = {
  type: fchatClientCommandTypes.TIMEOUT,
  schema: z.object({
    character: z.string().describe('The character to timeout.'),
    time: z
      .number()
      .min(1)
      .max(90)
      .describe(
        'An integer value of the timeout duration in minutes, being a minimum of one minute, and a maximum of 90 minutes.'
      ),
    reason: z.string().describe('The reason for the timeout.'),
  }).describe(`Times out a user for a given amount minutes.
        Warning: This command requires chat op or higher. This is an account-wide timeout from the chat, not a channel timeout for a character.
        Example: TMO { "character": "charactername", "time": 30, "reason": "Spamming" }`),
} as const;

export const TypingPrivateNotificationCommand = {
  type: fchatClientCommandTypes.TYPING_STATUS,
  schema: z.object({
    character: z.string().describe('The character to send typing status to.'),
    status: z.enum(['clear', 'paused', 'typing']).describe('The typing status.'),
  }).describe(`"user x is typing/stopped typing/has entered text" for private messages.
        Warning: It is assumed a user is no longer typing after a private message has been sent, so there is no need to send a TPN of clear with it.
        Example: TPN {"character":"Leon Priest","status":"clear"}`),
} as const;

export const UnbanCommand = {
  type: fchatClientCommandTypes.UNBAN,
  schema: z.object({
    character: z.string().describe('The character to unban from the server.'),
  }).describe(`Unbans a character's account from the server.
        Warning: This command requires chat op or higher.
        Example: UNB { "character": "charactername" }`),
} as const;

export const UptimeCommand = {
  type: fchatClientCommandTypes.UPTIME,
  schema: z.undefined().describe(`Requests info about how long the server has been running, and some stats about usage.
        Warning: This command takes no parameters.
        Example: UPT`),
} as const;

export const commandTypeToCommandObjectMap = {
  /** Account Ban - Request a character's account be banned from the server. */
  [fchatClientCommandTypes.ACCOUNT_BAN]: AccountBanCommand,
  /** Admin Op Promote - Promotes a user to be a chatop (global moderator). */
  [fchatClientCommandTypes.ADMIN_OP_PROMOTE]: AdminOpPromoteCommand,
  /** Account Who Characters - Requests a list of currently connected alts for a characters account. */
  [fchatClientCommandTypes.ACCOUNT_WHO_CHARACTERS]: AccountWhoCharactersCommand,
  /** Broadcast - Broadcasts a message to all connections. */
  [fchatClientCommandTypes.BROADCAST]: BroadcastCommand,
  /** Channel Ban List - Request the channel banlist. */
  [fchatClientCommandTypes.CHANNEL_BAN_LIST]: ChannelBanListCommand,
  /** Channel Ban User - Bans a character from a channel. */
  [fchatClientCommandTypes.CHANNEL_BAN_USER]: ChannelBanUserCommand,
  /** Create Channel Room - Create a private, invite-only channel. */
  [fchatClientCommandTypes.CREATE_CHANNEL_ROOM]: CreateChannelRoomCommand,
  /** Channel Description Set - Changes a channel's description. */
  [fchatClientCommandTypes.CHANNEL_DESCRIPTION_SET]: ChannelDescriptionSetCommand,
  /** Channel List All - Request a list of all public channels. */
  [fchatClientCommandTypes.CHANNEL_LIST_ALL]: ChannelListAllCommand,
  /** Channel Invite User - Sends an invitation for a channel to a user. */
  [fchatClientCommandTypes.CHANNEL_INVITE_USER]: ChannelInviteUserCommand,
  /** Channel Kick User - Kicks a user from a channel. */
  [fchatClientCommandTypes.CHANNEL_KICK_USER]: ChannelKickUserCommand,
  /** Channel Operator Add - Request a character be promoted to channel operator. */
  [fchatClientCommandTypes.CHANNEL_OPERATOR_ADD]: ChannelOperatorAddCommand,
  /** Channel Operator List - Requests the list of channel ops. */
  [fchatClientCommandTypes.CHANNEL_OPERATOR_LIST]: ChannelOperatorListCommand,
  /** Channel Operator Remove - Demotes a channel operator to a normal user. */
  [fchatClientCommandTypes.CHANNEL_OPERATOR_REMOVE]: ChannelOperatorRemoveCommand,
  /** Create Room Channel - Creates an official channel. */
  [fchatClientCommandTypes.CREATE_ROOM_CHANNEL]: CreateRoomChannelCommand,
  /** Channel Set Owner - Set a new channel owner. */
  [fchatClientCommandTypes.CHANNEL_SET_OWNER]: ChannelSetOwnerCommand,
  /** Channel Timeout User - Temporarily bans a user from the channel for 1-90 minutes. */
  [fchatClientCommandTypes.CHANNEL_TIMEOUT_USER]: ChannelTimeoutUserCommand,
  /** Channel Unban User - Unbans a user from a channel. */
  [fchatClientCommandTypes.CHANNEL_UNBAN_USER]: ChannelUnbanUserCommand,
  /** Demote Op - Demotes a chatop (global moderator). */
  [fchatClientCommandTypes.DEMOTE_OP]: DemoteOpCommand,
  /** F-List Kink Search - Search for characters fitting the user's selections. */
  [fchatClientCommandTypes.FLIST_KINK_SEARCH]: FlistKinkSearchCommand,
  /** Identify - This command is used to identify with the server. */
  [fchatClientCommandTypes.IDENTIFY]: IdentifyCommand,
  /** Ignore - Handle actions related to the ignore list. */
  [fchatClientCommandTypes.IGNORE]: IgnoreCommand,
  /** Join Channel - Send a channel join request. */
  [fchatClientCommandTypes.JOIN_CHANNEL]: JoinChannelCommand,
  /** Kick Channel - Deletes a channel from the server. */
  [fchatClientCommandTypes.KICK_CHANNEL]: KickChannelCommand,
  /** Kick User - Request a character be kicked from the server. */
  [fchatClientCommandTypes.KICK_USER]: KickUserCommand,
  /** Kink Info - Request a list of a user's kinks. */
  [fchatClientCommandTypes.KINK_INFO]: KinkInfoCommand,
  /** Leave Channel - Request to leave a channel. */
  [fchatClientCommandTypes.LEAVE_CHANNEL]: LeaveChannelCommand,
  /** Looking for Roleplay - Sends a chat ad to all other users in a channel. */
  [fchatClientCommandTypes.LOOKING_FOR_ROLEPLAY]: LookingForRoleplayCommand,
  /** Message - Sends a message to all other users in a channel. */
  [fchatClientCommandTypes.MESSAGE]: MessageCommand,
  /** Open Rooms List - Request a list of open private rooms. */
  [fchatClientCommandTypes.OPEN_ROOMS_LIST]: OpenRoomsListCommand,
  /** Ping - Sends a ping response to the server. */
  [fchatClientCommandTypes.PING]: PingCommand,
  /** Private Message - Sends a private message to another user. */
  [fchatClientCommandTypes.PRIVATE_MESSAGE]: PrivateMessageCommand,
  /** Profile Request - Requests some of the profile tags on a character. */
  [fchatClientCommandTypes.PROFILE_REQUEST]: ProfileRequestCommand,
  /** Roll Dice - Roll dice or spin the bottle. */
  [fchatClientCommandTypes.ROLL_DICE]: RollDiceCommand,
  /** Reload - Reload certain server config files. */
  [fchatClientCommandTypes.RELOAD]: ReloadCommand,
  /** Room Mode - Change room mode to accept chat, ads, or both. */
  [fchatClientCommandTypes.ROOM_MODE]: RoomModeCommand,
  /** Room Status - Sets a private room's status to closed or open. */
  [fchatClientCommandTypes.ROOM_STATUS]: RoomStatusCommand,
  /** Reward - Rewards a user, setting their status to 'crown' until they change it or log out. */
  [fchatClientCommandTypes.REWARD]: RewardCommand,
  /** Staff Call - Alerts admins and chatops of an issue. */
  [fchatClientCommandTypes.STAFF_CALL]: StaffCallCommand,
  /** Status - Request a new status be set for your character. */
  [fchatClientCommandTypes.STATUS]: StatusCommand,
  /** Timeout - Times out a user for a given amount minutes. */
  [fchatClientCommandTypes.TIMEOUT]: TimeoutCommand,
  /** Typing Private Notification - 'user x is typing/stopped typing/has entered text' for private messages. */
  [fchatClientCommandTypes.TYPING_STATUS]: TypingPrivateNotificationCommand,
  /** Unban - Unbans a character's account from the server. */
  [fchatClientCommandTypes.UNBAN]: UnbanCommand,
  /** Uptime - Requests info about how long the server has been running. */
  [fchatClientCommandTypes.UPTIME]: UptimeCommand,
} as const;

export type FChatClientCommandKey = keyof typeof fchatClientCommandTypes;
export type FChatClientCommandType = (typeof fchatClientCommandTypes)[FChatClientCommandKey];
export type MessageCommands = Pick<
  typeof fchatClientCommandTypes,
  'MESSAGE' | 'PRIVATE_MESSAGE' | 'LOOKING_FOR_ROLEPLAY'
>;

/**
 * Get the command object definition for a given command.
 */
export function getClientCommand<T extends FChatClientCommandType>(
  command: T
): (typeof commandTypeToCommandObjectMap)[T] {
  return commandTypeToCommandObjectMap[command];
}

/**
 * Get the schema for a given command.
 */
export type ClientCommandSchema<T extends FChatClientCommandType> = z.infer<
  (typeof commandTypeToCommandObjectMap)[T]['schema']
>;
