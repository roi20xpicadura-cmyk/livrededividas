import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Telemetria fire-and-forget pra cenários de boot que travam.
function reportAuthBootIssue(stage: string, detail?: string) {
  try {
    if (typeof window === 'undefined') return;
    if (window.location.hostname === 'localhost') return;
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !anonKey) return;
    fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({
        kind: 'render_error',
        message: `[auth-boot] ${stage}${detail ? `: ${detail}` : ''}`,
        url: window.location.href.slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 500),
      }),
    }).catch(() => { /* silent */ });
  } catch { /* never break UX */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;
    const finish = (s: Session | null) => {
      if (resolved) return;
      resolved = true;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // 1) Listener PRIMEIRO — captura INITIAL_SESSION e mudanças subsequentes
    //    sem race contra getSession (recomendação oficial Supabase).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      // Sync only — nada de await aqui pra não travar o callback do GoTrue.
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      resolved = true;
    });

    // 2) getSession como backup; se travar, o timeout libera a UI.
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => finish(s))
      .catch((err) => {
        reportAuthBootIssue('getSession_failed', err?.message || String(err));
        finish(null);
      });

    // 3) Hard timeout: se em 8s nada resolveu, libera a UI como deslogado.
    //    Evita "tela branca eterna" se o storage ou rede travarem.
    const timeout = setTimeout(() => {
      if (!resolved) {
        reportAuthBootIssue('auth_timeout_8s');
        finish(null);
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
