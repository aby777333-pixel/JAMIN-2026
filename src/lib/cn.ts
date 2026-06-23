/** Tiny classname joiner (avoids pulling clsx as a new dep). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
