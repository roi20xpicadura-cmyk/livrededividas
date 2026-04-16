import { PERIODS } from "@/types/findash";
import { Config } from "@/types/findash";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PeriodBarProps {
  cfg: Config;
  setCfg: (partial: Partial<Config>) => void;
  periodLabel: string;
}

export default function PeriodBar({ cfg, setCfg, periodLabel }: PeriodBarProps) {
  const handlePeriodChange = (p: string) => {
    const now = new Date();
    let pStart = cfg.pStart;
    let pEnd = cfg.pEnd;
    switch (p) {
      case 'Dia': pStart = format(startOfDay(now), 'yyyy-MM-dd'); pEnd = format(endOfDay(now), 'yyyy-MM-dd'); break;
      case 'Semana': pStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'); pEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'); break;
      case 'Mês': pStart = format(startOfMonth(now), 'yyyy-MM-dd'); pEnd = format(endOfMonth(now), 'yyyy-MM-dd'); break;
      case 'Trimestre': pStart = format(startOfQuarter(now), 'yyyy-MM-dd'); pEnd = format(endOfQuarter(now), 'yyyy-MM-dd'); break;
      case 'Ano': pStart = format(startOfYear(now), 'yyyy-MM-dd'); pEnd = format(endOfYear(now), 'yyyy-MM-dd'); break;
    }
    setCfg({ period: p, pStart, pEnd });
  };

  return (
    <div className="bg-card border-b border-border px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-3">
      <span className="label-upper text-muted">Período:</span>
      <div className="flex flex-wrap gap-1">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-200 ${
              cfg.period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-fin-green-border'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {cfg.period === 'Personalizado' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={cfg.pStart}
            onChange={e => setCfg({ pStart: e.target.value })}
            className="px-2 py-1 text-xs rounded-md border border-border bg-card"
          />
          <input
            type="date"
            value={cfg.pEnd}
            onChange={e => setCfg({ pEnd: e.target.value })}
            className="px-2 py-1 text-xs rounded-md border border-border bg-card"
          />
        </div>
      )}
      <span className="text-xs font-bold text-fin-green ml-auto">{periodLabel}</span>
    </div>
  );
}
