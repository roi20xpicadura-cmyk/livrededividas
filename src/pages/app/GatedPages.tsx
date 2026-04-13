import { useProfile } from '@/hooks/useProfile';
import { PLAN_LIMITS, PlanType } from '@/lib/plans';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

function GatedOverlay({ feature }: { feature: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-card/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-[14px]">
        <div className="text-center p-6">
          <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
          <h3 className="font-extrabold text-foreground mb-1">Recurso exclusivo do plano Pro</h3>
          <p className="text-sm text-muted mb-4">{feature}</p>
          <Link to="/app/billing" className="px-6 py-2 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all inline-block">
            Desbloquear agora
          </Link>
        </div>
      </div>
      <div className="filter blur-sm pointer-events-none">
        <div className="card-surface p-8 h-96 flex items-center justify-center text-muted">
          Conteúdo bloqueado
        </div>
      </div>
    </div>
  );
}

// Placeholder pages for gated features
export function CashFlowPage() {
  return <PlaceholderModule title="Fluxo de Caixa" desc="Acompanhe entradas e saídas ao longo do tempo com gráficos acumulados." />;
}

export function DREPage() {
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  if (!PLAN_LIMITS[plan].dre) return <GatedOverlay feature="Acesse o Demonstrativo de Resultado completo com o plano Pro." />;
  return <PlaceholderModule title="DRE" desc="Demonstrativo de Resultado do Exercício gerado automaticamente." />;
}

export function CardsPage() {
  return <PlaceholderModule title="Cartões de Crédito" desc="Gerencie seus cartões, limites e vencimentos." />;
}

export function InvestmentsPage() {
  return <PlaceholderModule title="Investimentos" desc="Acompanhe sua carteira de investimentos e rentabilidade." />;
}

export function ChartsPage() {
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  if (!PLAN_LIMITS[plan].advanced_charts) return <GatedOverlay feature="Acesse gráficos avançados e análises visuais com o plano Pro." />;
  return <PlaceholderModule title="Gráficos" desc="Visualize seus dados financeiros com gráficos interativos." />;
}

export function ExportPage() {
  const { profile } = useProfile();
  const plan = (profile?.plan || 'free') as PlanType;
  if (!PLAN_LIMITS[plan].export) return <GatedOverlay feature="Exporte seus dados em CSV, JSON e gere relatórios com o plano Pro." />;
  return <PlaceholderModule title="Exportar" desc="Exporte seus dados financeiros em diversos formatos." />;
}

function PlaceholderModule({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <h2 className="text-xl font-extrabold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted mb-4">{desc}</p>
      <p className="text-xs text-muted">Adicione lançamentos na aba correspondente para ver os dados aqui.</p>
    </div>
  );
}
