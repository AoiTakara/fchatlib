export const BBCODE_COLORS = {
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  cyan: 'cyan',
  purple: 'purple',
  blue: 'blue',
  pink: 'pink',
  black: 'black',
  brown: 'brown',
  white: 'white',
  gray: 'gray',
} as const;

export type BBCodeColor = keyof typeof BBCODE_COLORS;

export function bbcColor(message: string, color: BBCodeColor): string {
  return `[color=${color}]${message}[/color]`;
}

export function bbcBold(message: string): string {
  return `[b]${message}[/b]`;
}

export function bbcItalic(message: string): string {
  return `[i]${message}[/i]`;
}

export function bbcUnderline(message: string): string {
  return `[u]${message}[/u]`;
}

export function bbcStrikethrough(message: string): string {
  return `[s]${message}[/s]`;
}

export function bbcSuperscript(message: string): string {
  return `[sup]${message}[/sup]`;
}

export function bbcSubscript(message: string): string {
  return `[sub]${message}[/sub]`;
}

export function bbcUrl(message: string, url: string): string {
  return `[url=${url}]${message}[/url]`;
}

export function bbcUser(user: string): string {
  return `[user]${user}[/user]`;
}

export function bbcUserIcon(user: string): string {
  return `[icon]${user}[/icon]`;
}

export function bbcEIcon(eicon: string): string {
  return `[eicon]${eicon}[/eicon]`;
}

export function bbcSpoiler(spoiler: string): string {
  return `[spoiler]${spoiler}[/spoiler]`;
}

export function bbcNoParse(message: string): string {
  return `[noparse]${message}[/noparse]`;
}
