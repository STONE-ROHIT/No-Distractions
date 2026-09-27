import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:cursor-not-allowed disabled:opacity-60';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-neutral-100 text-neutral-950 hover:bg-white',
  secondary: 'bg-transparent text-neutral-200 border border-neutral-700 hover:border-neutral-500',
};

/**
 * Deliberately minimal — no design-token system yet. The real visual
 * language (palette, type scale) is decided in Phase 3's application
 * shell; this just needs to be usable and accessible today.
 */
export function Button({
  variant = 'primary',
  isLoading,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]}`}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? 'Please wait…' : children}
    </button>
  );
}
