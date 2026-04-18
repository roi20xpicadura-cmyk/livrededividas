import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// ── Mock do supabase client ───────────────────────────
const authStateCallbacks: Array<(event: string, session: any) => void> = [];
const unsubscribe = vi.fn();
const getSessionMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        authStateCallbacks.push(cb);
        return { data: { subscription: { unsubscribe } } };
      },
      getSession: () => getSessionMock(),
      signOut: () => signOutMock(),
    },
  },
}));

function Probe() {
  const { user, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <button onClick={signOut}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    authStateCallbacks.length = 0;
    unsubscribe.mockClear();
    signOutMock.mockClear();
    getSessionMock.mockReset();
  });

  it('inicia em loading=true e zera quando getSession resolve sem sessão', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('loading').textContent).toBe('yes');
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('popula user quando há sessão ativa', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com' } } },
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.com'));
  });

  it('atualiza user em SIGNED_IN via onAuthStateChange', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));

    expect(authStateCallbacks.length).toBeGreaterThan(0);
    act(() => {
      authStateCallbacks[0]('SIGNED_IN', { user: { id: 'u2', email: 'novo@x.com' } });
    });
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('novo@x.com'));
  });

  it('limpa user em SIGNED_OUT', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com' } } },
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.com'));

    act(() => {
      authStateCallbacks[0]('SIGNED_OUT', null);
    });
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
  });

  it('signOut chama supabase.auth.signOut', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));
    await act(async () => {
      screen.getByText('logout').click();
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('cancela a subscription no unmount (sem memory leak)', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
