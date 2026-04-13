import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { BarChart3, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate('/app');
  };

  const handleGoogle = async () => {
    await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/app` });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-card/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-black text-primary-foreground">FinDash Pro</span>
        </div>
        <div>
          <h2 className="text-3xl font-black text-primary-foreground leading-tight mb-6">Suas finanças sob controle, sempre.</h2>
          <ul className="space-y-3">
            {['Visão completa de receitas e despesas', 'Metas financeiras com acompanhamento diário', 'Relatórios profissionais automatizados'].map(b => (
              <li key={b} className="flex items-center gap-2 text-sm text-primary-foreground/90">
                <Check className="w-4 h-4" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">© 2025 FinDash Pro</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-black text-foreground">FinDash Pro</span>
          </div>
          <h1 className="text-2xl font-black text-foreground mb-1">Bem-vindo de volta</h1>
          <p className="text-sm text-muted mb-6">Entre na sua conta para continuar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-upper text-muted block mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
            </div>
            <div>
              <label className="label-upper text-muted block mb-1.5">Senha</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Link to="/forgot-password" className="text-xs text-fin-green font-semibold mt-1 inline-block hover:underline">Esqueci minha senha</Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              Entrar
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">ou continue com</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button onClick={handleGoogle}
            className="w-full py-2.5 rounded-[9px] border-[1.5px] border-border text-foreground text-sm font-bold hover:bg-secondary transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Entrar com Google
          </button>

          <p className="text-center text-sm text-muted mt-6">
            Não tem conta? <Link to="/register" className="text-fin-green font-bold hover:underline">Criar grátis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
