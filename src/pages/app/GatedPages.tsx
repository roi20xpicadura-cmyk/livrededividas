import UpgradeGate from '@/components/app/UpgradeGate';

function PlaceholderModule({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <h2 className="text-xl font-extrabold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted mb-4">{desc}</p>
      <p className="text-xs text-muted">Adicione lançamentos na aba correspondente para ver os dados aqui.</p>
    </div>
  );
}

export function CashFlowPage() {
  return <PlaceholderModule title="Fluxo de Caixa" desc="Acompanhe entradas e saídas ao longo do tempo com gráficos acumulados." />;
}

export function DREPage() {
  return (
    <UpgradeGate feature="dre">
      <PlaceholderModule title="DRE" desc="Demonstrativo de Resultado do Exercício gerado automaticamente." />
    </UpgradeGate>
  );
}

export function InvestmentsPage() {
  return <PlaceholderModule title="Investimentos" desc="Acompanhe sua carteira de investimentos e rentabilidade." />;
}

export function ChartsPage() {
  return (
    <UpgradeGate feature="advanced_charts">
      <PlaceholderModule title="Gráficos" desc="Visualize seus dados financeiros com gráficos interativos." />
    </UpgradeGate>
  );
}

export function ExportPage() {
  return (
    <UpgradeGate feature="export">
      <PlaceholderModule title="Exportar" desc="Exporte seus dados financeiros em diversos formatos." />
    </UpgradeGate>
  );
}
