import React, { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

// Telemetria silenciosa — usada quando o ErrorBoundary captura algo.
function reportRenderError(error: Error, info?: React.ErrorInfo) {
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
        message: `${error.name}: ${error.message}`.slice(0, 2000),
        url: window.location.href.slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 500),
        extra: { componentStack: info?.componentStack?.slice(0, 1500) },
      }),
    }).catch(() => { /* silent */ });
  } catch { /* never break UX */ }
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error:', error, info);
    reportRenderError(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      // IMPORTANTE: estilos hardcoded (sem CSS vars) pra renderizar mesmo se
      // ThemeProvider/index.css não tiverem carregado — evita "tela branca
      // dentro do error boundary".
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f14',
          color: '#e6edf3',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: 16,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
            <div style={{
              margin: '0 auto 20px',
              width: 88, height: 88, borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 36 }}>⚠️</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Algo deu errado</h2>
            <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.7, marginBottom: 24 }}>
              Ocorreu um erro inesperado. Seus dados estão seguros. Tente recarregar a página.
            </p>
            <button onClick={() => window.location.reload()}
              style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Recarregar página
            </button>
            <br />
            <button onClick={() => this.setState({ hasError: false, error: null })}
              style={{ marginTop: 10, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
              Tentar novamente sem recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
