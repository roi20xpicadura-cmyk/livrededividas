import { BarChart3, Target, CreditCard, TrendingUp, Home } from 'lucide-react';
import icon from '@/assets/korafinance-icon.png';

export default function HeroMockup() {
  return (
    <div className="rounded-2xl border border-border shadow-2xl overflow-hidden bg-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f8fafc] border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-[#f1f5f9] text-[10px] text-muted font-medium">
            app.korafinance.com.br
          </div>
        </div>
      </div>

      {/* App content */}
      <div className="flex h-[280px] md:h-[340px]">
        {/* Sidebar */}
        <div className="hidden sm:flex w-[140px] md:w-[160px] bg-primary flex-col p-3 gap-1">
          <div className="flex items-center gap-2 mb-4">
            <img src={icon} alt="KoraFinance" className="w-6 h-6 rounded-md object-cover" />
            <span className="text-[11px] font-bold text-primary-foreground">KoraFinance</span>
          </div>
          {[
            { icon: Home, label: 'Visão Geral', active: true },
            { icon: TrendingUp, label: 'Lançamentos' },
            { icon: Target, label: 'Metas' },
            { icon: CreditCard, label: 'Cartões' },
            { icon: BarChart3, label: 'Gráficos' },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium ${
                item.active
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'text-primary-foreground/60'
              }`}
            >
              <item.icon className="w-3 h-3" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-3 md:p-4 bg-[#f8faf8] overflow-hidden">
          {/* Topbar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-fin-green-dark">Visão Geral</span>
            <div className="flex gap-1">
              {['Dia', 'Semana', 'Mês'].map((p, i) => (
                <span
                  key={p}
                  className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${
                    i === 2 ? 'bg-primary text-primary-foreground' : 'text-muted'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Saldo', value: 'R$ 12.450', color: 'text-primary' },
              { label: 'Receitas', value: 'R$ 28.900', color: 'text-primary' },
              { label: 'Despesas', value: 'R$ 16.450', color: 'text-destructive' },
              { label: 'Poupança', value: '43%', color: 'text-fin-blue' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card rounded-lg border border-border p-2">
                <div className="text-[8px] text-muted font-semibold uppercase tracking-wider">{kpi.label}</div>
                <div className={`text-sm md:text-base font-black tabular-nums ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="bg-card rounded-lg border border-border p-2 h-[100px] md:h-[140px] relative overflow-hidden">
            <div className="text-[8px] text-muted font-semibold uppercase tracking-wider mb-1">Fluxo de Caixa</div>
            <svg className="w-full h-[70px] md:h-[100px]" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 C40,70 80,45 120,50 C160,55 200,30 240,25 C280,20 320,35 360,15 L400,10 L400,100 L0,100 Z"
                fill="url(#chartGrad)"
              />
              <path
                d="M0,80 C40,70 80,45 120,50 C160,55 200,30 240,25 C280,20 320,35 360,15 L400,10"
                fill="none"
                stroke="hsl(142,71%,45%)"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
