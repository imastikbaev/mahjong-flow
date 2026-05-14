'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(document as any).startViewTransition) {
      setTheme(newTheme);
      return;
    }

    // Hardware-accelerated GPU crossfade — no per-element repaints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    });
  };

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'w-8 h-8 flex items-center justify-center rounded-md',
        'transition-all duration-200 ease-out active:scale-95',
        isDark
          ? 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.03]'
          : 'text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05]',
      ].join(' ')}
    >
      {isDark
        ? <Sun  size={13} strokeWidth={1.5} />
        : <Moon size={13} strokeWidth={1.5} />}
    </button>
  );
}
