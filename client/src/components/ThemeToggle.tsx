import { useTheme } from 'next-themes';
import { Sun, Monitor, Moon } from 'lucide-react';

// FOUC prevented by next-themes inline script (attribute='class',
// defaultTheme='system'); .dark is applied to <html> before React hydrates.
// See CONTEXT.md D-03. `theme` from useTheme() is undefined on the first
// SSR/parse render, so no button is aria-pressed until hydration resolves —
// this matches the class state next-themes already injected and avoids a
// hydration mismatch.

const OPTIONS = [
  { value: 'light' as const, label: 'Светлая', Icon: Sun },
  { value: 'system' as const, label: 'Системная', Icon: Monitor },
  { value: 'dark' as const, label: 'Тёмная', Icon: Moon },
];

/**
 * 3-state theme segmented control (CONTEXT.md D-01/D-02, UI-02).
 * Click on any button calls setTheme(); clicking the active button is a no-op
 * (idempotent, not a cycle). Active = accent bg + #fff text.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Оформление"
      style={{
        display: 'inline-flex',
        gap: 'var(--space-1)',
        padding: 'var(--space-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
      }}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: active ? '1px solid var(--accent)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
