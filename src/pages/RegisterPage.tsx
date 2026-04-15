import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { BarChart3, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const inputStyle: React.CSSProperties = {
  height: 52, padding: '0 16px', border: '1.5px solid #e2e8f0',
  borderRadius: 14, fontSize: 16, color: '#0f172a', background: '#fafafa',
  width: '100%', outline: 'none', transition: 'all 150ms',
};

const inputFocusClass = "focus:bg-white focus:!border-[#16a34a] focus:shadow-[0_0_0_4px_rgba(22,163,74,0.10)]";

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (/\d/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabels = ['', 'Fraca', 'Média', 'Boa', 'Forte'];
const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#16a34a'];

const BENEFIT_PILLS = ['🤖 IA Financeira', '🎯 Score financeiro', '📊 Dashboard completo', '🏆 Gamificação'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres'); haptic.error(); return; }
    if (!agreedTerms) { setError('Aceite os termos para continuar'); haptic.error(); return; }

    setLoading(true);
    haptic.light();

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (err) {
      setLoading(false);
      const msg = err.message.includes('weak_password') || err.message.includes('weak')
        ? 'Essa senha é muito comum. Tente uma senha mais única.'
        : err.message.includes('already registered')
        ? 'Este e-mail já está cadastrado. Tente fazer login.'
        : err.message;
      setError(msg);
      haptic.error();
      return;
    }

    if (data.user) {
      await supabase.from('profiles').update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
        marketing_emails: false,
      } as any).eq('id', data.user.id);
    }

    setLoading(false);
    setSuccess(true);
    haptic.success();
    toast.success('Conta criada! Verifique seu e-mail para confirmar.');
    setTimeout(() => navigate('/app'), 800);
  };

  const formContent = (isDesktop = false) => (
    <>
      {!isDesktop && <div className="mx-auto" style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, marginBottom: 24 }} />}

      <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.6px' }}>Criar conta grátis</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Sem cartão. Gratuito para sempre.</p>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google button */}
      <motion.button
        onClick={() => lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/app` })}
        whileTap={{ scale: 0.97 }}
        className="hover:bg-[#f8fafc] hover:border-[#cbd5e1]"
        style={{ marginTop: 20, height: 52, width: '100%', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 150ms' }}>
        <GoogleIcon />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Cadastrar com Google</span>
      </motion.button>

      <div className="flex items-center gap-3" style={{ margin: '18px 0' }}>
        <div className="flex-1" style={{ height: 1, background: '#f1f5f9' }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>ou</span>
        <div className="flex-1" style={{ height: 1, background: '#f1f5f9' }} />
      </div>

      <form onSubmit={handleRegister}>
        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>NOME COMPLETO</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Seu nome"
            className={inputFocusClass} style={inputStyle} />
        </motion.div>

        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>E-MAIL</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com"
            className={inputFocusClass} style={inputStyle} />
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }} style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>SENHA</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
            className={inputFocusClass} style={inputStyle} />
          {/* Strength bar */}
          {password && (
            <div style={{ marginTop: 8 }}>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 99,
                    background: strength >= i ? strengthColors[i] : '#e2e8f0',
                    transition: 'background 200ms',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: strengthColors[strength] || '#94a3b8', marginTop: 5, display: 'block' }}>
                Senha {strengthLabels[strength] || ''}
              </span>
            </div>
          )}
        </motion.div>

        {/* Terms checkbox */}
        <motion.label
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.51 }}
          className="flex items-start gap-2.5 cursor-pointer"
          style={{ marginTop: 14 }}
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.preventDefault(); setAgreedTerms(!agreedTerms); haptic.light(); }}
            style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: agreedTerms ? '1.5px solid #16a34a' : '1.5px solid #e2e8f0',
              background: agreedTerms ? '#16a34a' : '#fafafa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms',
            }}
          >
            {agreedTerms && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 400 }}>
                <Check style={{ width: 12, height: 12, color: 'white' }} />
              </motion.div>
            )}
          </motion.div>
          <span style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            Aceito os{' '}
            <a href="/termos-de-uso" target="_blank" style={{ color: '#16a34a', fontWeight: 600 }}>Termos de Uso</a>
            {' '}e a{' '}
            <a href="/politica-de-privacidade" target="_blank" style={{ color: '#16a34a', fontWeight: 600 }}>Política de Privacidade</a>
          </span>
        </motion.label>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || success || !agreedTerms}
          whileTap={{ scale: 0.97 }}
          animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={error ? { duration: 0.35 } : {}}
          style={{
            marginTop: 20, height: 54, width: '100%',
            background: !agreedTerms ? '#94a3b8' : success ? '#14532d' : '#16a34a',
            border: 'none', borderRadius: 14, color: 'white',
            fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px',
            cursor: loading || success || !agreedTerms ? 'default' : 'pointer',
            boxShadow: agreedTerms ? '0 4px 14px rgba(22,163,74,0.35), 0 1px 3px rgba(22,163,74,0.2)' : 'none',
            opacity: loading ? 0.85 : 1, transition: 'all 300ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading && <div style={{ width: 18, height: 18, border: '2.5px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />}
          {success ? <><Check style={{ width: 18, height: 18 }} /> Acessando...</> : loading ? 'Criando...' : 'Criar minha conta grátis →'}
        </motion.button>
      </form>

      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
        <span style={{ color: '#94a3b8' }}>Já tem conta? </span>
        <Link to="/login" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }} className="hover:underline">Entrar →</Link>
      </p>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#0a1a0f' }}>
      {/* Desktop left panel */}
      <div className="hidden lg:flex w-[55%] flex-col justify-between relative overflow-hidden" style={{ background: '#0a1a0f', padding: '48px 48px 40px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 40% 50%, rgba(22,163,74,0.30) 0%, rgba(22,163,74,0.08) 50%, transparent 80%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute" style={{ width: 250, height: 250, borderRadius: '50%', background: 'rgba(22,163,74,0.18)', filter: 'blur(60px)', top: -60, right: -60 }} />

        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center" style={{ width: 42, height: 42, background: '#16a34a', borderRadius: 12, boxShadow: '0 4px 14px rgba(22,163,74,0.4)' }}>
              <BarChart3 className="text-white" style={{ width: 22, height: 22 }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>FinDash</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#4ade80' }}>Pro</span>
          </div>

          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              style={{ fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Comece hoje.<br />É grátis.<br />
              <span style={{ color: '#4ade80' }}>Para sempre.</span>
            </motion.h1>
            <p style={{ marginTop: 14, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Dashboard completo, IA financeira e gamificação<br />sem precisar de cartão de crédito.
            </p>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>© 2026 FinDash Pro</p>
        </div>
      </div>

      {/* Mobile hero */}
      <div className="lg:hidden relative overflow-hidden" style={{ minHeight: '38vh', background: '#0a1a0f' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 40% 50%, rgba(22,163,74,0.30) 0%, rgba(22,163,74,0.08) 50%, transparent 80%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute" style={{ width: 180, height: 180, borderRadius: '50%', background: 'rgba(22,163,74,0.18)', filter: 'blur(50px)', top: -40, right: -40 }} />
        <div className="absolute" style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', filter: 'blur(40px)', bottom: 20, left: -20 }} />

        <div className="relative z-10" style={{ padding: '48px 28px 56px' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center" style={{ width: 38, height: 38, background: '#16a34a', borderRadius: 11, boxShadow: '0 4px 14px rgba(22,163,74,0.4)' }}>
              <BarChart3 className="text-white" style={{ width: 20, height: 20 }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>FinDash</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>Pro</span>
          </div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            style={{ marginTop: 28, fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-1.2px', lineHeight: 1.1 }}>
            Comece hoje.<br />É grátis.
          </motion.h1>

          {/* 2x2 benefit pills */}
          <div className="grid grid-cols-2 gap-2" style={{ marginTop: 20 }}>
            {BENEFIT_PILLS.map(pill => (
              <div key={pill} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
              }}>{pill}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280, delay: 0.2 }}
        className="relative z-10 lg:flex-1 lg:flex lg:items-center lg:justify-center"
        style={{
          background: 'white', borderRadius: '28px 28px 0 0',
          marginTop: -24, padding: '28px 24px 40px',
          paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
          minHeight: '58vh', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div className="lg:hidden">{formContent(false)}</div>
        <div className="hidden lg:block w-full" style={{ maxWidth: 380, margin: '0 auto' }}>{formContent(true)}</div>
      </motion.div>
    </div>
  );
}
