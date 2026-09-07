import { useEffect, useState } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return true;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(dark));
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}
