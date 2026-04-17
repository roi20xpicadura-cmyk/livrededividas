import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Eye, EyeOff, AlertCircle, Check, Sparkles, TrendingUp, Target, Wallet } from 'lucide-react';
import koraIcon from '@/assets/korafinance-icon.png';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

const TESTIMONIALS = [
  { quote: '"Finalmente consigo ver para onde meu dinheiro vai."', author: 'Marina S., Designer' },
  { quote: '"O score financeiro me motivou a economizar mais."', author: 'Carlos R., Desenvolvedor' },
  { quote: '"Melhor app de finanças que já usei, sem dúvida."', author: 'Ana P., Empreendedora' },
];

function DarkHeroSection({ variant = 'login' }: { variant?: 'login' | 'register' }) {
  return (
    <div
      className="relative overflow-hidden w-full"
      style={{
        minHeight: '42vh',
        background: '#0a1a0f',
      }}
    >
      {/* Radial gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 70% at 40% 50%, rgba(124, 58, 237,0.30) 0%, rgba(124, 58, 237,0.08) 50%, transparent 80%)',
      }} />
      {/* Dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      {/* Orb 1 */}
      <div className="absolute" style={{
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(124, 58, 237,0.18)', filter: 'blur(50px)',
        top: -40, right: -40,
      }} />
      {/* Orb 2 */}
      <div className="absolute" style={{
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(16,185,129,0.12)', filter: 'blur(40px)',
        bottom: 20, left: -20,
      }} />

      <div className="relative z-10" style={{ padding: '48px 28px 56px' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src={koraIcon} alt="KoraFinance" style={{ width: 38, height: 38, borderRadius: 11, objectFit: 'cover', boxShadow: '0 4px 14px rgba(124, 58, 237,0.4)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>KoraFinance</span>
        </div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginTop: 28 }}
        >
          {variant === 'login' ? (
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-1.2px', lineHeight: 1.1 }}>
              Suas finanças<br />sob controle.
            </h1>
          ) : (
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-1.2px', lineHeight: 1.1 }}>
              Comece hoje.<br />É grátis.
            </h1>
          )}
        </motion.div>

        <p style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          Controle pessoal, negócio e investimentos
        </p>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2" style={{ marginTop: 20 }}>
          {['✓ 2.400 usuários', '✓ Grátis para sempre', '✓ Sem cartão'].map((pill) => (
            <span key={pill} style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 99, padding: '5px 12px',
              fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap',
            }}>{pill}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopLeftPanel() {
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="hidden lg:flex w-[55%] flex-col justify-between relative overflow-hidden"
      style={{
        background: '#0a1a0f',
        padding: '48px 48px 40px',
      }}
    >
      {/* Gradients and dots */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 70% at 40% 50%, rgba(124, 58, 237,0.30) 0%, rgba(124, 58, 237,0.08) 50%, transparent 80%)',
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="absolute" style={{ width: 250, height: 250, borderRadius: '50%', background: 'rgba(124, 58, 237,0.18)', filter: 'blur(60px)', top: -60, right: -60 }} />
      <div className="absolute" style={{ width: 160, height: 160, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', filter: 'blur(50px)', bottom: 40, left: -40 }} />

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src={koraIcon} alt="KoraFinance" style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover', boxShadow: '0 4px 14px rgba(124, 58, 237,0.4)' }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>KoraFinance</span>
        </div>

        {/* Middle content */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1.1 }}
          >
            Suas finanças<br />sob controle.<br />
            <span style={{ color: '#4ade80' }}>Finalmente.</span>
          </motion.h1>
          <p style={{ marginTop: 14, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Controle pessoal, negócio e investimentos<br />tudo em um só lugar.
          </p>

          {/* Mini dashboard card */}
          <div style={{
            marginTop: 32, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
            padding: '18px 20px', backdropFilter: 'blur(10px)',
          }}>
            {[
              { icon: <Wallet style={{ width: 16, height: 16 }} />, color: '#4ade80', label: 'Saldo este mês', value: 'R$ 3.200' },
              { icon: <TrendingUp style={{ width: 16, height: 16 }} />, color: '#3b82f6', label: 'Score financeiro', value: '847/1000' },
              { icon: <Target style={{ width: 16, height: 16 }} />, color: '#f59e0b', label: 'Meta de viagem', value: '67% ✓' },
            ].map((row, i, arr) => (
              <div key={row.label} className="flex items-center justify-between" style={{
                padding: '10px 0',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center" style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `${row.color}20`,
                    color: row.color,
                  }}>{row.icon}</div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5" style={{ marginTop: 10 }}>
              <Sparkles style={{ width: 12, height: 12, color: '#4ade80' }} />
              <span style={{ fontSize: 11, color: '#4ade80', fontStyle: 'italic' }}>
                IA analisando seus dados...
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                >|</motion.span>
              </span>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ color: '#f59e0b', fontSize: 14, marginBottom: 6 }}>★★★★★</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.5 }}>
                {TESTIMONIALS[testimonialIdx].quote}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                {TESTIMONIALS[testimonialIdx].author}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-1.5" style={{ marginTop: 12 }}>
            {TESTIMONIALS.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === testimonialIdx ? '#4ade80' : 'rgba(255,255,255,0.2)',
                transition: 'background 300ms',
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0f172a">
    <path d="M17.05 12.04c-.03-2.84 2.32-4.21 2.43-4.28-1.32-1.93-3.39-2.2-4.12-2.23-1.76-.18-3.43 1.03-4.32 1.03-.89 0-2.27-1-3.73-.98-1.92.03-3.69 1.12-4.68 2.83-1.99 3.46-.51 8.59 1.43 11.4.95 1.38 2.08 2.93 3.55 2.87 1.43-.06 1.97-.92 3.7-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.4 3.45-2.79 1.09-1.6 1.54-3.15 1.57-3.23-.03-.01-3.01-1.16-3.04-4.59zM14.27 3.61c.79-.96 1.32-2.29 1.17-3.61-1.13.05-2.5.75-3.31 1.7-.73.85-1.37 2.2-1.2 3.5 1.26.1 2.55-.64 3.34-1.59z"/>
  </svg>
);

const inputStyle: React.CSSProperties = {
  height: 52, padding: '0 16px', border: '1.5px solid #e2e8f0',
  borderRadius: 14, fontSize: 16, color: '#0f172a', background: '#fafafa',
  width: '100%', outline: 'none', transition: 'all 150ms',
};

const inputFocusClass = "focus:bg-white focus:!border-[#7C3AED] focus:shadow-[0_0_0_4px_rgba(124, 58, 237,0.10)]";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    haptic.light();

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setLoading(false);
      setError('E-mail ou senha incorretos.');
      haptic.error();
      return;
    }
    setLoading(false);
    setSuccess(true);
    haptic.success();
    setTimeout(() => navigate('/app'), 800);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    haptic.light();
    const label = provider === 'google' ? 'Google' : 'Apple';
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        toast.error(`Não foi possível entrar com ${label}. Tente novamente.`);
        return;
      }
      if (result?.redirected) return;
      navigate('/app');
    } catch {
      toast.error(`Erro ao conectar com ${label}. Tente novamente.`);
    }
  };
  const handleGoogle = () => handleOAuth('google');
  const handleApple = () => handleOAuth('apple');

  const formContent = (
    <>
      {/* Handle bar - mobile only */}
      <div className="lg:hidden mx-auto" style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, marginBottom: 24 }} />

      <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.6px' }}>Bem-vindo de volta</h2>
      <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Entre na sua conta para continuar</p>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '12px 14px', marginTop: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google button */}
      <motion.button
        onClick={handleGoogle}
        whileTap={{ scale: 0.97 }}
        className="hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        style={{
          marginTop: 20, height: 52, width: '100%', background: 'white',
          border: '1.5px solid #e2e8f0', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          cursor: 'pointer', transition: 'all 150ms',
        }}
      >
        <GoogleIcon />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Continuar com Google</span>
      </motion.button>

      {/* Apple button */}
      <motion.button
        onClick={handleApple}
        whileTap={{ scale: 0.97 }}
        className="hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        style={{
          marginTop: 10, height: 52, width: '100%', background: 'white',
          border: '1.5px solid #e2e8f0', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          cursor: 'pointer', transition: 'all 150ms',
        }}
      >
        <AppleIcon />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Continuar com Apple</span>
      </motion.button>
      <div className="flex items-center gap-3" style={{ margin: '18px 0' }}>
        <div className="flex-1" style={{ height: 1, background: '#f1f5f9' }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>ou</span>
        <div className="flex-1" style={{ height: 1, background: '#f1f5f9' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleLogin}>
        {[
          { idx: 0, label: 'E-MAIL', type: 'email', value: email, onChange: setEmail, placeholder: 'seu@email.com' },
        ].map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
            style={{ marginBottom: 14 }}
          >
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              {f.label}
            </label>
            <input
              type={f.type}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              required
              placeholder={f.placeholder}
              className={inputFocusClass}
              style={{ ...inputStyle, placeholderColor: '#cbd5e1' } as React.CSSProperties}
            />
          </motion.div>
        ))}

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.37 }}
          style={{ marginBottom: 4 }}
        >
          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SENHA
            </label>
            <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}
              className="hover:underline">
              Esqueci a senha
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={inputFocusClass}
              style={{ ...inputStyle, paddingRight: 48 } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              }}
            >
              {showPw ? <EyeOff style={{ width: 18, height: 18, color: '#94a3b8' }} /> : <Eye style={{ width: 18, height: 18, color: '#94a3b8' }} />}
            </button>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || success}
          whileTap={{ scale: 0.97 }}
          animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={error ? { duration: 0.35 } : {}}
          style={{
            marginTop: 20, height: 54, width: '100%',
            background: success ? '#1A0D35' : '#7C3AED',
            border: 'none', borderRadius: 14, color: 'white',
            fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px',
            cursor: loading || success ? 'default' : 'pointer',
            boxShadow: '0 4px 14px rgba(124, 58, 237,0.35), 0 1px 3px rgba(124, 58, 237,0.2)',
            opacity: loading ? 0.85 : 1, transition: 'all 150ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading && (
            <div style={{ width: 18, height: 18, border: '2.5px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}
              className="animate-spin" />
          )}
          {success ? (
            <><Check style={{ width: 18, height: 18 }} /> Acessando...</>
          ) : loading ? 'Entrando...' : 'Entrar'}
        </motion.button>
      </form>

      {/* Register link */}
      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
        <span style={{ color: '#94a3b8' }}>Não tem conta? </span>
        <Link to="/register" style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'none' }}
          className="hover:underline">
          Criar conta grátis →
        </Link>
      </p>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#0a1a0f' }}>
      {/* Desktop left panel */}
      <DesktopLeftPanel />

      {/* Mobile hero */}
      <div className="lg:hidden">
        <DarkHeroSection variant="login" />
      </div>

      {/* Form card */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280, delay: 0.2 }}
        className="relative z-10 lg:flex-1 lg:flex lg:items-center lg:justify-center"
        style={{
          background: 'white',
          borderRadius: '28px 28px 0 0',
          marginTop: -24,
          padding: '28px 24px 40px',
          paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
          minHeight: '58vh',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Desktop: remove mobile-specific styles */}
        <div className="lg:hidden">
          {formContent}
        </div>
        <div className="hidden lg:block w-full" style={{ maxWidth: 380, margin: '0 auto' }}>
          {/* Desktop form - no handle bar, same content */}
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.6px' }}>Bem-vindo de volta</h2>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Entre na sua conta para continuar</p>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button onClick={handleGoogle} whileTap={{ scale: 0.97 }}
            className="hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ marginTop: 20, height: 52, width: '100%', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 150ms' }}>
            <GoogleIcon />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Continuar com Google</span>
          </motion.button>

          <motion.button onClick={handleApple} whileTap={{ scale: 0.97 }}
            className="hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ marginTop: 10, height: 52, width: '100%', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 150ms' }}>
            <AppleIcon />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Continuar com Apple</span>
          </motion.button>

          <div className="flex items-center gap-3" style={{ margin: '18px 0' }}>
            <div className="flex-1" style={{ height: 1, background: '#f1f5f9' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>ou</span>
            <div className="flex-1" style={{ height: 1, background: '#f1f5f9' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>E-MAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com"
                className={inputFocusClass} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 4 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SENHA</label>
                <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }} className="hover:underline">Esqueci a senha</Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className={inputFocusClass} style={{ ...inputStyle, paddingRight: 48 } as React.CSSProperties} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
                  {showPw ? <EyeOff style={{ width: 18, height: 18, color: '#94a3b8' }} /> : <Eye style={{ width: 18, height: 18, color: '#94a3b8' }} />}
                </button>
              </div>
            </div>
            <motion.button type="submit" disabled={loading || success} whileTap={{ scale: 0.97 }}
              animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={error ? { duration: 0.35 } : {}}
              style={{
                marginTop: 20, height: 54, width: '100%', background: success ? '#1A0D35' : '#7C3AED',
                border: 'none', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 800,
                letterSpacing: '-0.2px', cursor: loading || success ? 'default' : 'pointer',
                boxShadow: '0 4px 14px rgba(124, 58, 237,0.35), 0 1px 3px rgba(124, 58, 237,0.2)',
                opacity: loading ? 0.85 : 1, transition: 'all 150ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading && <div style={{ width: 18, height: 18, border: '2.5px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />}
              {success ? <><Check style={{ width: 18, height: 18 }} /> Acessando...</> : loading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
            <span style={{ color: '#94a3b8' }}>Não tem conta? </span>
            <Link to="/register" style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'none' }} className="hover:underline">Criar conta grátis →</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
