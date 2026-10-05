import { Moon, Sun } from '@phosphor-icons/react';

// Sun/moon button. All theme logic lives in theme/useTheme.js.
export default function ThemeToggle({ theme, setTheme }) {
  const label = theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode';
  return (
    <button className="theme-toggle" type="button" title={label} aria-label={label} aria-pressed={theme === 'dark'}
      onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}>
      {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}
