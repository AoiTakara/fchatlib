import { z } from 'zod';

export const roomModes = ['chat', 'both', 'ads'] as const;

export const roomModeSchema = z.enum(roomModes).describe(`The mode of the channel.
  chat: Show only MSG.
  both: Show MSG and LRP.
  ads: Show LRP.`);

export type RoomMode = z.infer<typeof roomModeSchema>;

export const channelSchema = z.string().describe('The name of the channel.');

export const genders = ['Male', 'Female', 'Transgender', 'Herm', 'Shemale', 'Male-Herm', 'Cunt-boy', 'None'] as const;

export const characterGenderSchema = z.enum(genders).describe('The gender of the character.');

export type CharacterGender = z.infer<typeof characterGenderSchema>;

export const orientations = [
  'Gay',
  'Bi - male preference',
  'Bisexual',
  'Bi - female preference',
  'Straight',
  'Asexual',
  'Pansexual',
  'Bi-curious',
  'Unsure',
] as const;

export const characterOrientationSchema = z.enum(orientations).describe('The orientation of the character.');

export type CharacterOrientation = z.infer<typeof characterOrientationSchema>;

export const languages = [
  'Arabic',
  'Chinese',
  'Dutch',
  'English',
  'French',
  'German',
  'Italian',
  'Japanese',
  'Korean',
  'Other',
  'Portuguese',
  'Russian',
  'Spanish',
  'Swedish',
] as const;

export const characterLanguageSchema = z.enum(languages).describe('The language of the character.');

export type CharacterLanguage = z.infer<typeof characterLanguageSchema>;

export const roles = [
  'Always submissive',
  'Usually submissive',
  'Switch',
  'Usually dominant',
  'Always dominant',
] as const;

export const characterRoleSchema = z.enum(roles).describe('The role of the character.');

export type CharacterRole = z.infer<typeof characterRoleSchema>;

export const positions = ['Always Bottom', 'Usually Bottom', 'Switch', 'Usually Top', 'Always Top'] as const;

export const characterPositionSchema = z.enum(positions).describe('The position of the character.');

export type CharacterPosition = z.infer<typeof characterPositionSchema>;

export const furryPreferences = [
  'No furry characters, just humans',
  'No humans, just furry characters',
  'Furries ok, Humans Preferred',
  'Humans ok, Furries Preferred',
  'Furs and / or humans',
] as const;

export const characterFurryPreferenceSchema = z
  .enum(furryPreferences)
  .describe('The furry preference of the character.');

export type CharacterFurryPreference = z.infer<typeof characterFurryPreferenceSchema>;

export const statuses = ['online', 'looking', 'busy', 'dnd', 'idle', 'away', 'crown'] as const;

export const statusSchema = z.enum(statuses).describe(`The status of the character.
  online: The character is online.
  looking: The character is looking for roleplay.
  busy: The character is busy.
  dnd: The character is busy.
  idle: The character is idle. This is only set by some clients, and is usually unused.
  away: The character is away.
  crown: This is a special status that should not be set by the client. It is set by the RWD command.`);

export type CharacterStatus = z.infer<typeof statusSchema>;

export const typingStatuses = ['clear', 'paused', 'typing'] as const;

export const typingStatusSchema = z.enum(typingStatuses).describe('The typing status of the character.');

export type TypingStatus = z.infer<typeof typingStatusSchema>;

export const diceSchema = z
  .string()
  .describe('The dice to roll. Example: 1d10')
  .regex(/^\d+d\d+$/);

export const bottleSchema = z.literal('bottle').describe('The bottle to spin. Example: bottle');

export const diceOrBottleSchema = z
  .union([diceSchema, bottleSchema])
  .describe('The dice to roll or the bottle to spin. Example: 1d10 or bottle');

export type DiceOrBottle = z.infer<typeof diceOrBottleSchema>;
