import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = password.length >= 12 ? 100 : password.length >= 8 ? 66 : password.length >= 4 ? 33 : 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPw) { toast.error('As senhas não coincidem'); return; }
    if (password.length < 8) { toast.error('A senha deve ter pelo menos 8 caracteres'); return; }
    if (!agreedTerms) { toast.error('Você precisa aceitar os termos para continuar'); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) { setLoading(false); toast.error(error.message); return; }

    // Update profiles with terms consent
    if (data.user) {
      await supabase.from('profiles').update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
        marketing_emails: marketingEmails,
      } as any).eq('id', data.user.id);
    }

    setLoading(false);
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    navigate('/app');
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-primary p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-card/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-black text-primary-foreground">FinDash Pro</span>
        </div>
        <div>
          <h2 className="text-3xl font-black text-primary-foreground leading-tight mb-6">Comece a controlar suas finanças agora.</h2>
          <ul className="space-y-3">
            {['Grátis para sempre — sem cartão de crédito', 'Configure em menos de 2 minutos', 'Seus dados sempre seguros e privados'].map(b => (
              <li key={b} className="flex items-center gap-2 text-sm text-primary-foreground/90"><Check className="w-4 h-4" /> {b}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">© 2026 FinDash Pro</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-black text-foreground">FinDash Pro</span>
          </div>
          <h1 className="text-2xl font-black text-foreground mb-1">Criar conta grátis</h1>
          <p className="text-sm text-muted mb-6">Comece a organizar suas finanças</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label-upper text-muted block mb-1.5">Nome completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
            </div>
            <div>
              <label className="label-upper text-muted block mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
            </div>
            <div>
              <label className="label-upper text-muted block mb-1.5">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
              {password && (
                <div className="mt-1.5 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength >= 66 ? 'bg-fin-green' : strength >= 33 ? 'bg-fin-amber' : 'bg-fin-red'}`} style={{ width: `${strength}%` }} />
                </div>
              )}
            </div>
            <div>
              <label className="label-upper text-muted block mb-1.5">Confirmar senha</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
            </div>

            {/* LGPD Consent Checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary" />
                <span>
                  Li e concordo com os{' '}
                  <a href="/termos-de-uso" target="_blank" className="underline font-semibold" style={{ color: 'var(--color-green-600)' }}>Termos de Uso</a>
                  {' '}e a{' '}
                  <a href="/politica-de-privacidade" target="_blank" className="underline font-semibold" style={{ color: 'var(--color-green-600)' }}>Política de Privacidade</a>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                <input type="checkbox" checked={marketingEmails} onChange={e => setMarketingEmails(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary" />
                <span>Aceito receber comunicações sobre o FinDash Pro por e-mail (novidades, dicas e relatórios)</span>
              </label>
            </div>

            <button type="submit" disabled={loading || !agreedTerms}
              className="w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              Criar conta grátis
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Já tem conta? <Link to="/login" className="text-fin-green font-bold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
