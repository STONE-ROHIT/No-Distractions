import type { ButtonHTMLAttributes } from 'react';
import { buttonClassName, type ButtonVariant } from './button-styles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  isLoading,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClassName(variant, className)}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? 'Please wait…' : children}
    </button>
  );
}
