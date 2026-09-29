/** Joins class names, skipping anything falsy: cx('a', isActive && 'b') -> 'a b' or 'a'. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
