import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowLeft, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlan } from '@/hooks/usePlan';
import { PLANS, type FeatureKey } from '@/lib/plans';

interface PaywallProps {
  feature: FeatureKey;
  requiredPlan: 'pro' | 'business';
  title?: string;
  description: string;
  children: ReactNode;
}

const PRO_HIGHLIGHTS = [
  'Kora IA ilimitada',
  'WhatsApp IA integrado',
  'Dívidas & Simulador',
  'Relatório mensal automático',
  'Notificações WhatsApp',
  'Lançamentos ilimitados',
];
const BUSINESS_HIGHLIGHTS = [
  'Tudo do Pro incluso',
  'Lançamentos Negócio separados',
  'DRE automático',
  'Relatórios avançados',
  'Suporte prioritário',
];

function formatPriceParts(price: number) {
  const fixed = Number(price).toFixed(2).replace('.', ',');
  const [int, dec] = fixed.split(',');
  return { int, dec };
}

export default function Paywall({ feature, requiredPlan, title, description, children }: PaywallProps) {
  const { hasFeature, loading } = usePlan();
  const navigate = useNavigate();

  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;

  const planInfo = PLANS[requiredPlan];
  const highlights = requiredPlan === 'pro' ? PRO_HIGHLIGHTS : BUSINESS_HIGHLIGHTS;
  const headingTitle = title || `Recurso ${planInfo.name}`;
  const { int, dec } = formatPriceParts(planInfo.price);

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          maxWidth: 460,
          width: '100%',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-weak)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px -20px rgba(76, 29, 149, 0.25), 0 6px 16px -8px rgba(15,23,42,0.08)',
        }}
      >
        {/* HERO gradiente roxo */}
        <div style={{
          position: 'relative',
          padding: '28px 24px 26px',
          background:
            'radial-gradient(120% 100% at 0% 0%, #4C1D95 0%, transparent 55%), radial-gradient(120% 100% at 100% 100%, #7C3AED 0%, transparent 60%), linear-gradient(135deg, #1E0B4D 0%, #3B1397 60%, #5B21B6 100%)',
          color: '#fff',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          {/* glow */}
          <div aria-hidden style={{
            position: 'absolute', top: -50, right: -50, width: 220, height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(167,139,250,0.45), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <span style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '5px 11px', borderRadius: 99,
            backdropFilter: 'blur(8px)',
            marginBottom: 16,
          }}>
            <Zap style={{ width: 11, height: 11 }} /> Recurso {planInfo.name}
          </span>

          <h1 style={{
            position: 'relative',
            fontSize: 22, fontWeight: 800,
            letterSpacing: '-0.02em', lineHeight: 1.2,
            margin: 0, marginBottom: 8, color: '#fff',
          }}>
            {headingTitle}
          </h1>
          <p style={{
            position: 'relative',
            fontSize: 13.5, lineHeight: 1.55,
            color: 'rgba(255,255,255,0.78)',
            margin: 0, maxWidth: 340, marginInline: 'auto',
          }}>
            {description}
          </p>
        </div>

        {/* Preço */}
        <div style={{ padding: '22px 24px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4,
            marginBottom: 4,
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: 'var(--color-text-muted)',
              transform: 'translateY(-14px)',
            }}>R$</span>
            <span style={{
              fontSize: 52, fontWeight: 800, lineHeight: 1,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.04em',
              color: 'var(--color-text-strong)',
            }}>{int}</span>
            <span style={{
              fontSize: 22, fontWeight: 800, lineHeight: 1,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-strong)',
              transform: 'translateY(-22px)',
            }}>,{dec}</span>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--color-text-muted)',
              marginLeft: 4, transform: 'translateY(-14px)',
            }}>/mês</span>
          </div>
          <div style={{
            textAlign: 'center', fontSize: 11.5, fontWeight: 600,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.04em',
          }}>
            Cancele quando quiser • Sem fidelidade
          </div>
        </div>

        {/* Benefícios */}
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{
            background: 'var(--color-bg-sunken)',
            border: '1px solid var(--color-border-weak)',
            borderRadius: 16,
            padding: '16px 16px',
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--color-text-muted)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Sparkles style={{ width: 11, height: 11, color: 'hsl(var(--primary))' }} />
              O que você desbloqueia
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {highlights.map(f => (
                <li key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13.5, fontWeight: 500,
                  color: 'var(--color-text-strong)',
                  lineHeight: 1.35,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 99,
                    background: 'hsl(var(--primary) / 0.12)',
                    color: 'hsl(var(--primary))',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ padding: '0 20px 22px' }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/app/billing')}
            style={{
              width: '100%', height: 52,
              background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)',
              border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 14.5, fontWeight: 800,
              letterSpacing: '-0.01em', cursor: 'pointer',
              boxShadow: '0 10px 28px -10px rgba(124, 58, 237, 0.55), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            Assinar {planInfo.name} — R$ {int},{dec}/mês
          </motion.button>

          <button
            onClick={() => window.history.back()}
            style={{
              width: '100%', marginTop: 8,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'none', border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              padding: '10px',
            }}
          >
            <ArrowLeft size={13} /> Voltar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
