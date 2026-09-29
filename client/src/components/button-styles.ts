import { cx } from '../utils/cx';

/**
 * Split from Button.tsx (no component in this file) so Button.tsx can
 * export the `Button` component and ONLY that — see context/README.md
 * for why: mixing a component export with a function/constant export in
 * one file breaks React Fast Refresh's ability to preserve state across a
 * hot reload, and ESLint's react-refresh/only-export-components rule
 * flags exactly this.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export const buttonBaseStyles =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

export const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-canvas hover:opacity-90',
  secondary: 'border border-rule-strong text-ink hover:bg-wash',
  ghost: 'text-ink-muted hover:bg-wash hover:text-ink',
};

/**
 * Shared with anything that needs to LOOK like a button but isn't one —
 * chiefly a navigational CTA, which should be a real `<a>` (via React
 * Router's `Link`) rather than a `<button>` with a click handler faking
 * navigation: `<Link className={buttonClassName('primary')}>` renders a
 * real anchor styled identically. `Button` itself has no `asChild`-style
 * prop, because that would mean nesting an `<a>` inside a `<button>` —
 * invalid HTML, and it breaks real navigation (ctrl-click to open in a
 * new tab, right-click "copy link").
 */
export function buttonClassName(variant: ButtonVariant = 'primary', className?: string): string {
  return cx(buttonBaseStyles, buttonVariantStyles[variant], className);
}
