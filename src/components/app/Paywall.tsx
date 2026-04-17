import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';
import { PLANS, type FeatureKey } from '@/lib/plans';

interface PaywallProps {
  feature: FeatureKey;
  requiredPlan: 'pro' | 'business';
  title?: string;
  description: string;
  children: ReactNode;
}

const PRO_HIGHLIGHTS = ['Kora IA ilimitada', 'WhatsApp IA', 'Dívidas & Simulador', 'Relatório mensal', 'Notificações WhatsApp', 'Lançamentos ilimitados'];
const BUSINESS_HIGHLIGHTS = ['Tudo do Pro', 'Lançamentos Negócio', 'DRE automático', 'Relatórios avançados', 'Suporte prioritário'];

export default function Paywall({ feature, requiredPlan, title, description, children }: PaywallProps) {
  const { hasFeature, loading } = usePlan();
  const navigate = useNavigate();

  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;

  const planInfo = PLANS[requiredPlan];
  const highlights = requiredPlan === 'pro' ? PRO_HIGHLIGHTS : BUSINESS_HIGHLIGHTS;
  const headingTitle = title || `Recurso ${planInfo.name}`;

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: 'var(--color-bg-card, #fff)',
        border: '1px solid var(--color-border, rgba(0,0,0,0.08))',
        borderRadius: 20,
        padding: 32,
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `${planInfo.color}1A`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Lock size={28} style={{ color: planInfo.color }} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-strong, #111)', margin: 0, marginBottom: 8 }}>
          {headingTitle}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted, #666)', margin: 0, marginBottom: 24, lineHeight: 1.5 }}>
          {description}
        </p>

        <div style={{
          background: `${planInfo.color}0D`,
          border: `1px solid ${planInfo.color}33`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: planInfo.color, letterSpacing: 0.5 }}>
              PLANO {planInfo.name.toUpperCase()}
            </span>
            <div>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted, #666)' }}>R$ </span>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-strong, #111)' }}>{planInfo.price}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted, #666)' }}>/mês</span>
            </div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {highlights.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-strong, #111)' }}>
                <Check size={14} style={{ color: planInfo.color, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => navigate('/app/billing')}
          style={{
            width: '100%',
            height: 50,
            background: planInfo.color,
            border: 'none',
            borderRadius: 14,
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${planInfo.color}40`,
          }}
        >
          Assinar {planInfo.name} — R$ {planInfo.price}/mês
        </button>

        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: 12,
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted, #999)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
