import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../context/theme-context';
import { useTheme } from '../context/useTheme';
import { cx } from '../utils/cx';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'system', label: 'Match system theme', Icon: Monitor },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
];

/** Three-way switch rather than a single toggle, because "system" is a real,
 * meaningfully different third option, not just a midpoint between the other two. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-md border border-rule p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cx(
              'rounded-[5px] p-1.5 transition-colors',
              isActive ? 'bg-marker text-marker-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon aria-hidden="true" size={15} />
          </button>
        );
      })}
    </div>
  );
}
