'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';


export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
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
