import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  cycleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('kora-theme');
    return (stored as Theme) || 'light';
  });

  const resolved = resolveTheme(theme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  // Sync from Supabase only once per user, and only if user hasn't picked locally
  const syncedUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;

    // If user has already explicitly set a theme locally, don't overwrite from DB
    const localPicked = localStorage.getItem('kora-theme-user-picked') === '1';
    if (localPicked) return;

    supabase.from('user_config').select('theme').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data?.theme && ['light', 'dark', 'system'].includes(data.theme)) {
          setThemeState(data.theme as Theme);
          localStorage.setItem('kora-theme', data.theme);
        }
      });
  }, [user]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      const r = getSystemTheme();
      root.setAttribute('data-theme', r);
      root.classList.toggle('dark', r === 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'kora-theme' && e.newValue) {
        setThemeState(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('kora-theme', t);
    if (user) {
      supabase.from('user_config').update({ theme: t } as any).eq('user_id', user.id);
    }
  }, [user]);

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
