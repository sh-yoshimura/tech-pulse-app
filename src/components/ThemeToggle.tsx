'use client';

import { useLayoutEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

function readStoredTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  // Server always renders 'light' (no access to client prefs), so the
  // initial client render must match that exactly to avoid a hydration
  // mismatch on this button's icon/label. The real value is read and
  // applied in useLayoutEffect below, before the browser paints, so there's
  // no visible flash. This also re-applies the class in dev, where Strict
  // Mode's remount resets <html> to only the attributes JSX manages,
  // clearing the class the inline script in layout.tsx set.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useLayoutEffect(() => {
    const actual = readStoredTheme();
    // Reading localStorage/matchMedia (platform APIs unavailable during SSR)
    // is exactly what effects are for; this isn't state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(actual);
    document.documentElement.classList.toggle('dark', actual === 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
      className="fixed top-4 right-4 z-40 rounded-full bg-background/80 backdrop-blur-sm"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

export default ThemeToggle;
