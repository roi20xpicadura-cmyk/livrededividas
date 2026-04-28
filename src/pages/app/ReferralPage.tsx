import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Copy, Check, Share2, Sparkles, Gift, Mail, MessageCircle, Twitter, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type ReferralRow = Database['public']['Tables']['referrals']['Row'];

const REWARD_GOAL = 12; // mostrar progresso até 12 meses (1 ano grátis)

export default function ReferralPage() {
  const { user } = useAuth();
  useProfile();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_config').select('referral_code').eq('user_id', user.id).single()
      .then(({ data }) => setReferralCode(data?.referral_code || ''));
    supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setReferrals(data || []));
  }, [user]);

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  const subscribedCount = referrals.filter(r => r.status === 'subscribed').length;
  const conversionRate = referrals.length > 0 ? Math.round((subscribedCount / referrals.length) * 100) : 0;
  const rewardPct = Math.min(100, (subscribedCount / REWARD_GOAL) * 100);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Estou usando o KoraFinance para organizar minhas finanças e tem sido incrível! Use meu link e ganhe 7 dias grátis: ${referralLink}`;

  const shareChannels = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`) },
    { id: 'email', label: 'E-mail', icon: Mail, color: '#3b82f6', action: () => window.open(`mailto:?subject=${encodeURIComponent('Conhece o KoraFinance?')}&body=${encodeURIComponent(shareText)}`) },
    { id: 'twitter', label: 'X / Twitter', icon: Twitter, color: '#000000', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`) },
    { id: 'native', label: 'Mais opções', icon: Share2, color: '#7c3aed', action: () => {
      if (navigator.share) navigator.share({ title: 'KoraFinance', text: shareText, url: referralLink });
      else handleCopy();
    }},
  ];

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ padding: '8px 16px 0', maxWidth: 980, margin: '0 auto' }}>

        {/* ═══ HERO CINEMATOGRÁFICO ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'relative',
            borderRadius: 24,
            padding: '24px 22px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1a0b3d 0%, #3b1080 45%, #7c3aed 100%)',
            boxShadow: '0 24px 60px -20px rgba(124,58,237,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset',
          }}
        >
          {/* Animated orbs */}
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.4), transparent 70%)', filter: 'blur(20px)' }}
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', bottom: -80, left: -30, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)', filter: 'blur(24px)' }}
          />
          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.16, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at top right, black 20%, transparent 70%)',
          }} />
          {/* Floating gift icon */}
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 4, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: 20, right: 22, width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <Gift size={28} color="#fde68a" strokeWidth={2.2} />
          </motion.div>

          <div style={{ position: 'relative', zIndex: 1, paddingRight: 80 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(253,230,138,0.15)',
              border: '1px solid rgba(253,230,138,0.35)',
              marginBottom: 12,
            }}>
              <Sparkles size={11} color="#fde68a" fill="#fde68a" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#fde68a', textTransform: 'uppercase' }}>
                Programa de Indicação
              </span>
            </div>
            <h1 style={{
              color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1.1,
              letterSpacing: '-0.6px', margin: '0 0 8px',
            }}>
              Indique. Ganhe.<br />
              <span style={{
                background: 'linear-gradient(90deg, #fde68a, #fb923c)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Pro de graça.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 1.55, margin: '0 0 18px', maxWidth: 320 }}>
              A cada amigo que assinar o Pro, você ganha <strong style={{ color: '#fde68a' }}>1 mês grátis</strong> automaticamente.
            </p>

            {/* Reward progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600 }}>
                  Sua jornada para <span style={{ color: '#fde68a', fontWeight: 800 }}>1 ano grátis</span>
                </span>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>
                  {subscribedCount}/{REWARD_GOAL}
                </span>
              </div>
              <div style={{
                position: 'relative', height: 10, borderRadius: 99,
                background: 'rgba(0,0,0,0.3)',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rewardPct}%` }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #ec4899)',
                    boxShadow: '0 0 16px rgba(251,191,36,0.6)',
                  }}
                />
                <motion.div
                  animate={{ x: ['-30%', '130%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
                  style={{
                    position: 'absolute', top: 0, bottom: 0, width: '30%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                  }}
                />
              </div>
            </div>

            {/* Link box */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 6px 6px 14px',
              borderRadius: 14,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
            }}>
              <Link2 size={14} color="rgba(255,255,255,0.6)" />
              <code style={{
                flex: 1,
                color: 'rgba(255,255,255,0.95)',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                minWidth: 0,
              }}>
                {referralLink}
              </code>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  background: copied ? 'linear-gradient(135deg, #10b981, #059669)' : '#fff',
                  color: copied ? '#fff' : '#7c3aed',
                  fontSize: 12, fontWeight: 800,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} strokeWidth={2.5} />}
                {copied ? 'Copiado' : 'Copiar'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ═══ STATS ESPELHO ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
          {[
            { label: 'Convidados', value: referrals.length, accent: '#64748b', sub: 'pessoas' },
            { label: 'Assinaram Pro', value: subscribedCount, accent: '#7c3aed', sub: `${conversionRate}% conversão` },
            { label: 'Meses ganhos', value: subscribedCount, accent: '#f59e0b', sub: 'grátis' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              style={{
                position: 'relative',
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--border-default)',
                borderRadius: 16, padding: '14px 10px',
                textAlign: 'center', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: s.accent, opacity: 0.6,
              }} />
              <div style={{ color: s.accent, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>
                {s.label}
              </div>
              <div style={{ color: 'var(--text-hint)', fontSize: 10, marginTop: 2 }}>
                {s.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ═══ COMPARTILHAR ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            marginTop: 14,
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-default)',
            borderRadius: 18, padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>
              Compartilhar agora
            </h3>
            <button
              onClick={() => setShowQR(true)}
              style={{
                fontSize: 11, fontWeight: 700, color: 'hsl(var(--primary))',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              QR Code →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {shareChannels.map(ch => {
              const Icon = ch.icon;
              return (
                <motion.button
                  key={ch.id}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ y: -2 }}
                  onClick={ch.action}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 14, padding: '12px 4px',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: ch.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 6px 14px -6px ${ch.color}`,
                  }}>
                    <Icon size={18} color="#fff" strokeWidth={2.4} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>
                    {ch.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ COMO FUNCIONA — TIMELINE ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            marginTop: 14,
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-default)',
            borderRadius: 18, padding: 18,
            position: 'relative',
          }}
        >
          <h3 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.2px' }}>
            Como funciona
          </h3>

          <div style={{ position: 'relative' }}>
            {/* vertical line */}
            <div style={{
              position: 'absolute', left: 19, top: 18, bottom: 18, width: 2,
              background: 'linear-gradient(180deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.1))',
              borderRadius: 2,
            }} />

            {[
              {
                title: 'Compartilhe seu link único',
                desc: 'Envie pelos canais acima ou copie e cole onde quiser.',
                svg: (g: string) => (
                  <>
                    <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.4" />
                    <circle cx="44" cy="14" r="5" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.4" />
                    <circle cx="44" cy="38" r="5" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.4" />
                    <path d="M25 18 L39 14 M25 22 L39 38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </>
                ),
              },
              {
                title: 'Amigo se cadastra e assina o Pro',
                desc: 'Ele ganha 7 dias grátis. Você é notificado em tempo real.',
                svg: (g: string) => (
                  <>
                    <rect x="8" y="14" width="40" height="28" rx="6" fill={`url(#${g})`} fillOpacity="0.3" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="20" cy="28" r="5" stroke="currentColor" strokeWidth="2.2" fill="none" />
                    <path d="M30 24 L42 24 M30 30 L40 30 M30 36 L36 36" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="44" cy="14" r="6" fill="#10b981" stroke="var(--bg-surface)" strokeWidth="2" />
                    <path d="M41 14 L43 16 L47 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </>
                ),
              },
              {
                title: 'Você ganha 1 mês de Pro grátis',
                desc: 'O crédito cai automático na sua próxima fatura.',
                svg: (g: string) => (
                  <>
                    <rect x="10" y="20" width="36" height="24" rx="3" fill={`url(#${g})`} fillOpacity="0.45" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M10 28 L46 28" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M28 12 L28 22 M22 16 Q22 12 28 12 Q34 12 34 16 Q34 20 28 20 Q22 20 22 16" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.4" strokeLinejoin="round" />
                  </>
                ),
              },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < 2 ? 18 : 0, position: 'relative' }}>
                {/* Step number medal */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, hsl(var(--primary)), #6d28d9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 6px 16px -6px hsl(var(--primary) / 0.6), inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.15)',
                  color: '#fff', fontSize: 14, fontWeight: 900,
                  zIndex: 1,
                }}>
                  {i + 1}
                </div>

                {/* Content with icon */}
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, marginBottom: 3, letterSpacing: '-0.2px' }}>
                        {step.title}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                        {step.desc}
                      </div>
                    </div>
                    <svg width="52" height="52" viewBox="0 0 56 56" fill="none" style={{ color: 'hsl(var(--primary))', flexShrink: 0 }}>
                      <defs>
                        <linearGradient id={`step-g-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>
                      {step.svg(`step-g-${i}`)}
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ INDICAÇÕES (lista) ═══ */}
        {referrals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              marginTop: 14,
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-default)',
              borderRadius: 18, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>
                Suas indicações
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-hint)', fontWeight: 600 }}>
                {referrals.length} {referrals.length === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {referrals.map((r, idx) => {
                const status = r.status === 'subscribed' ? 'subscribed' : r.status === 'registered' ? 'registered' : 'invited';
                const statusCfg = {
                  subscribed: { label: 'Assinou Pro', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
                  registered: { label: 'Registrado', color: 'hsl(var(--primary))', bg: 'hsl(var(--primary) / 0.12)', border: 'hsl(var(--primary) / 0.3)' },
                  invited:    { label: 'Convidado', color: 'var(--text-hint)', bg: 'var(--bg-elevated)', border: 'var(--border-default)' },
                }[status];
                const initial = (r.referred_email || '?').charAt(0).toUpperCase();

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.04 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 18px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, hsl(var(--primary)), #6d28d9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.referred_email}
                      </div>
                      <div style={{ color: 'var(--text-hint)', fontSize: 11, marginTop: 1 }}>
                        {r.created_at ? format(parseISO(r.created_at), "dd 'de' MMM", { locale: ptBR }) : '—'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      padding: '4px 9px', borderRadius: 99,
                      background: statusCfg.bg,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.border}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {statusCfg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ EMPTY STATE ═══ */}
        {referrals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              marginTop: 14,
              padding: '28px 20px',
              borderRadius: 18,
              border: '1.5px dashed var(--border-default)',
              background: 'var(--bg-surface)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: 'hsl(var(--primary) / 0.1)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Sparkles size={26} color="hsl(var(--primary))" />
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
              Sua primeira indicação está a um clique
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
              Compartilhe seu link e comece a acumular meses grátis de Pro.
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══ MODAL QR CODE ═══ */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 24, padding: '28px 22px 22px',
                width: '100%', maxWidth: 360,
                border: '1.5px solid var(--border-default)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
                textAlign: 'center',
              }}
            >
              <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
                Compartilhe via QR Code
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 18px' }}>
                Aponte a câmera para indicar pessoalmente
              </p>
              <div style={{
                background: '#fff', padding: 16, borderRadius: 16,
                display: 'inline-block', marginBottom: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(referralLink)}&color=7C3AED&bgcolor=FFFFFF&qzone=1`}
                  alt="QR Code do link de indicação"
                  width={220}
                  height={220}
                  style={{ display: 'block' }}
                />
              </div>
              <button
                onClick={() => setShowQR(false)}
                style={{
                  width: '100%',
                  padding: 14, borderRadius: 14,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
