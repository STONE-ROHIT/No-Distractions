interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

const sizeStyles = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
};

/** No avatar upload exists yet (Phase 13+), so every user is initials-on-marker. */
export function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${sizeStyles[size]} shrink-0 items-center justify-center rounded-full bg-marker font-medium text-marker-ink`}
    >
      {initialsOf(name)}
    </span>
  );
}
