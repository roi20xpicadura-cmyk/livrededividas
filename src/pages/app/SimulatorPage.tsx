import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/plans';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  SimulatorBase, ScenarioAdjustments, DEFAULT_SCENARIO, PRESET_SCENARIOS, computeSimulation,
} from '@/lib/simulatorEngine';
import { TrendingUp, TrendingDown, RotateCcw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Light-theme design tokens (violet accent)
const C = {
  violet: '#7C3AED',
  violetDark: '#5B21B6',
  violetSoft: '#EDE9FE',
  violetSofter: '#F5F3FF',
  violetBorder: '#DDD6FE',
  borderSoft: '#F0EEF8',
  textStrong: '#1A0D35',
  textBase: '#374151',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  green: '#16A34A',
  greenDark: '#15803D',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  amber: '#F59E0B',
  red: '#DC2626',
  white: '#FFFFFF',
  grid: '#F3F4F6',
  trackEmpty: '#E5E7EB',
};

const LazySimChart = lazy(() => import('recharts').then(m => ({
  default: ({ timeline, baseline }: { timeline: any[]; baseline: any[] }) => {
    const data = timeline.map((t: any, i: number) => ({
      label: t.label,
      simulado: t.balance,
      atual: baseline[i]?.balance || 0,
    }));
    return (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.violet} stopOpacity={0.18} />
              <stop offset="95%" stopColor={C.violet} stopOpacity={0} />
            </linearGradient>
          </defs>
          <m.CartesianGrid stroke={C.grid} strokeDasharray="0" vertical={false} />
          <m.XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.textSubtle }} />
          <m.YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.textSubtle }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
          <m.ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" />
          <m.Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.borderSoft}`, borderRadius: 10, fontSize: 12 }} />
          <m.Line type="monotone" dataKey="atual" stroke={C.textSubtle} strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Cenário atual" />
          <m.Area type="monotone" dataKey="simulado" stroke={C.violet} strokeWidth={2.5} fill="url(#simGrad)" dot={false} name="Cenário simulado" />
        </m.ComposedChart>
      </m.ResponsiveContainer>
    );
  }
})));

function ImpactCard({ label, baseline, simulated, unit, inverse, accentKey }: {
  label: string; baseline: number; simulated: number; unit: string; inverse?: boolean;
  accentKey: 'sobra' | 'ano' | 'score' | 'divida';
}) {
  const delta = simulated - baseline;
  const isPositive = inverse ? delta < 0 : delta > 0;
  const valueColor =
    accentKey === 'sobra' ? C.green :
    accentKey === 'ano' ? C.violet :
    accentKey === 'score' ? C.amber :
    C.red;

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.borderSoft}`,
      borderRadius: 16,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        color: C.textSubtle, fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
      }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: valueColor, letterSpacing: '-0.5px' }}>
        {unit}{formatCurrency(simulated, '').replace('R$', '').trim()}
      </div>
      {delta !== 0 && (
        <div style={{
          fontSize: 12, marginTop: 6, color: isPositive ? C.green : C.red,
          display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
        }}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta > 0 ? '+' : ''}{formatCurrency(delta, 'R$')}/mês
        </div>
      )}
    </div>
  );
}

function SliderControl({ label, value, onChange, min, max, step = 1, helper, formatVal }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
  helper?: string; formatVal?: (v: number) => string;
}) {
  const display = formatVal ? formatVal(value) : formatCurrency(value, 'R$');
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: C.textBase, fontSize: 14, fontWeight: 600 }}>{label}</span>
        <span style={{ color: C.violet, fontSize: 14, fontWeight: 800 }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="violet-slider w-full"
        style={{ ['--pct' as any]: `${pct}%` }}
      />
      {helper && <p style={{ color: C.textSubtle, fontSize: 11, marginTop: 6 }}>{helper}</p>}
    </div>
  );
}

export default function SimulatorPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [baseData, setBaseData] = useState<SimulatorBase | null>(null);
  const [scenario, setScenario] = useState<ScenarioAdjustments>({ ...DEFAULT_SCENARIO });
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showControls, setShowControls] = useState(!isMobile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const start3m = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');

    Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start3m).lte('date', end).is('deleted_at', null),
      supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('goals').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('active', true),
    ]).then(([txRes, debtRes, goalRes, recRes]) => {
      const txs = txRes.data || [];
      const incomes = txs.filter(t => t.type === 'income');
      const expenses = txs.filter(t => t.type === 'expense');
      const months = 3;
      const avgIncome = incomes.reduce((s, t) => s + Number(t.amount), 0) / months;
      const avgExpense = expenses.reduce((s, t) => s + Number(t.amount), 0) / months;
      const catMap: Record<string, number> = {};
      expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount); });
      Object.keys(catMap).forEach(k => { catMap[k] /= months; });
      const debts = debtRes.data || [];
      const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0);

      setBaseData({
        avgMonthlyIncome: avgIncome,
        avgMonthlyExpenses: avgExpense,
        expenseByCategory: catMap,
        totalDebt,
        currentBalance: avgIncome - avgExpense,
        financialScore: 0,
        debts,
        goals: goalRes.data || [],
        recurring: recRes.data || [],
      });
      setLoading(false);
    });
  }, [user]);

  const results = useMemo(() => {
    if (!baseData) return null;
    return computeSimulation(baseData, scenario);
  }, [baseData, scenario]);

  const updateScenario = (patch: Partial<ScenarioAdjustments>) => {
    setScenario(prev => ({ ...prev, ...patch }));
    setActivePreset(null);
  };

  const applyPreset = (idx: number) => {
    if (!baseData) return;
    setActivePreset(idx);
    const preset = PRESET_SCENARIOS[idx];
    const applied = preset.apply(baseData);
    setScenario({ ...DEFAULT_SCENARIO, ...applied });
  };

  const resetAll = () => {
    setScenario({ ...DEFAULT_SCENARIO });
    setActivePreset(null);
  };

  if (loading || !baseData) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    );
  }

  const topCategories = Object.entries(baseData.expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const presetChips = (
    <div className="flex flex-wrap gap-2">
      {PRESET_SCENARIOS.map((p, i) => {
        const active = activePreset === i;
        return (
          <button key={i} onClick={() => applyPreset(i)}
            style={{
              padding: '8px 14px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              cursor: 'pointer',
              transition: 'all 150ms',
              background: active ? C.violet : C.violetSofter,
              color: active ? C.white : C.violetDark,
              border: active ? 'none' : `1px solid ${C.violetBorder}`,
              whiteSpace: 'nowrap',
            }}>
            {p.emoji} {p.label}
          </button>
        );
      })}
    </div>
  );

  const controls = (
    <div style={{
      background: C.white, border: `1px solid ${C.borderSoft}`,
      borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      {!isMobile && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            color: C.textSubtle, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Cenários prontos
          </div>
          {presetChips}
        </div>
      )}

      <div style={{
        color: C.textStrong, fontSize: 16, fontWeight: 800,
        marginBottom: 12, marginTop: 4,
      }}>
        Ajustar cenário
      </div>

      <SliderControl label="Renda mensal" value={scenario.incomeChange} onChange={v => updateScenario({ incomeChange: v })}
        min={-baseData.avgMonthlyIncome} max={baseData.avgMonthlyIncome}
        helper={`Atual: ${formatCurrency(baseData.avgMonthlyIncome, 'R$')} → Simulado: ${formatCurrency(baseData.avgMonthlyIncome + scenario.incomeChange, 'R$')}`}
        formatVal={v => `${v >= 0 ? '+' : ''}${formatCurrency(v, 'R$')}`} />

      <SliderControl label="Horizonte de tempo" value={scenario.months} onChange={v => updateScenario({ months: v })}
        min={1} max={60} formatVal={v => `${v} ${v === 1 ? 'mês' : 'meses'}${v >= 12 ? ` (${(v / 12).toFixed(1)} anos)` : ''}`} />

      <button onClick={() => setShowCategories(!showCategories)}
        className="flex items-center gap-2 w-full"
        style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
        Ajustar gastos por categoria <ChevronDown size={14} style={{ transform: showCategories ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>

      <AnimatePresence>
        {showCategories && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            {topCategories.map(([cat, avg]) => (
              <SliderControl key={cat} label={cat} value={scenario.expenseChanges[cat] || 0}
                onChange={v => updateScenario({ expenseChanges: { ...scenario.expenseChanges, [cat]: v } })}
                min={-avg} max={avg} formatVal={v => `${v >= 0 ? '+' : ''}${formatCurrency(v, 'R$')}`}
                helper={`Média atual: ${formatCurrency(avg, 'R$')}/mês`} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <SliderControl label="Novo custo fixo mensal" value={scenario.newFixedCost} onChange={v => updateScenario({ newFixedCost: v })}
        min={0} max={5000} step={50} formatVal={v => formatCurrency(v, 'R$')} />

      <SliderControl label="Nova renda fixa mensal" value={scenario.newFixedIncome} onChange={v => updateScenario({ newFixedIncome: v })}
        min={0} max={10000} step={100} formatVal={v => formatCurrency(v, 'R$')} />

      {baseData.totalDebt > 0 && (
        <SliderControl label="Pagamento extra de dívida" value={scenario.debtPayoffExtra} onChange={v => updateScenario({ debtPayoffExtra: v })}
          min={0} max={2000} step={50} formatVal={v => formatCurrency(v, 'R$')}
          helper={results?.debtFreeMonth ? `Dívida quitada em ${results.debtFreeMonth} meses` : `Dívida total: ${formatCurrency(baseData.totalDebt, 'R$')}`} />
      )}

      {baseData.goals.length > 0 && (
        <SliderControl label="Aporte extra em meta" value={scenario.goalContribution} onChange={v => updateScenario({ goalContribution: v })}
          min={0} max={1000} step={50} formatVal={v => formatCurrency(v, 'R$')}
          helper={results?.goalReachedMonth ? `Meta atingida em ${results.goalReachedMonth} meses` : undefined} />
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-4 px-4 pt-4">
      {/* Inline styles for violet sliders */}
      <style>{`
        .violet-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 20px;
          cursor: pointer;
        }
        .violet-slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 99px;
          background: linear-gradient(to right,
            ${C.violet} 0%, ${C.violet} var(--pct, 0%),
            ${C.trackEmpty} var(--pct, 0%), ${C.trackEmpty} 100%);
        }
        .violet-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${C.violet};
          border: 2px solid ${C.white};
          box-shadow: 0 1px 6px rgba(124,58,237,0.4);
          margin-top: -8px;
          cursor: pointer;
        }
        .violet-slider::-moz-range-track {
          height: 4px;
          border-radius: 99px;
          background: ${C.trackEmpty};
        }
        .violet-slider::-moz-range-progress {
          height: 4px;
          border-radius: 99px;
          background: ${C.violet};
        }
        .violet-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${C.violet};
          border: 2px solid ${C.white};
          box-shadow: 0 1px 6px rgba(124,58,237,0.4);
          cursor: pointer;
        }
      `}</style>

      {/* Sandbox banner */}
      <div style={{
        background: C.violetSofter,
        border: `1px solid ${C.violetBorder}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16 }}>🔮</span>
          <span style={{ color: C.violetDark, fontSize: 12, fontWeight: 600 }}>
            Modo simulação — dados reais não são alterados
          </span>
        </div>
        <button onClick={resetAll} style={{
          background: 'none', border: 'none', color: C.violet,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          <RotateCcw size={12} /> Resetar
        </button>
      </div>

      {/* Mobile: preset chips at top */}
      {isMobile && (
        <div>
          <div style={{
            color: C.textSubtle, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Cenários prontos
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {PRESET_SCENARIOS.map((p, i) => {
              const active = activePreset === i;
              return (
                <button key={i} onClick={() => applyPreset(i)} className="flex-shrink-0"
                  style={{
                    padding: '8px 14px', borderRadius: 99,
                    fontSize: 13, fontWeight: active ? 700 : 600, cursor: 'pointer',
                    background: active ? C.violet : C.violetSofter,
                    color: active ? C.white : C.violetDark,
                    border: active ? 'none' : `1px solid ${C.violetBorder}`,
                    whiteSpace: 'nowrap',
                  }}>
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={isMobile ? 'space-y-4' : 'grid gap-5'} style={!isMobile ? { gridTemplateColumns: '420px 1fr' } : undefined}>
        {/* Controls — desktop: left column; mobile: collapsible at bottom */}
        {!isMobile && controls}

        {/* Results */}
        <div className="space-y-4">
          {results && (
            <>
              {/* Impact cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <ImpactCard label="Sobra mensal" baseline={baseData.currentBalance} simulated={results.simMonthlySaving} unit="R$ " accentKey="sobra" />
                <ImpactCard label="Em 12 meses" baseline={baseData.currentBalance * 12} simulated={results.annualSavings} unit="R$ " accentKey="ano" />
                <ImpactCard label="Score financeiro" baseline={baseData.financialScore} simulated={baseData.financialScore + results.scoreDelta} unit="" accentKey="score" />
                {baseData.totalDebt > 0 && (
                  <ImpactCard label="Dívida restante" baseline={baseData.totalDebt} simulated={results.remainingDebt} unit="R$ " inverse accentKey="divida" />
                )}
              </div>

              {/* Chart */}
              <div style={{
                background: C.white, border: `1px solid ${C.borderSoft}`,
                borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.textStrong, marginBottom: 12 }}>
                  Projeção do saldo ao longo do tempo
                </p>
                <div style={{ height: isMobile ? 220 : 280 }}>
                  <Suspense fallback={<div className="skeleton-shimmer w-full h-full" style={{ borderRadius: 12 }} />}>
                    <LazySimChart timeline={results.timeline} baseline={results.baselineTimeline} />
                  </Suspense>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                {results.debtFreeMonth && (
                  <MilestoneCard icon="🏆" title="Dívida quitada" description={`Com pagamento extra de ${formatCurrency(scenario.debtPayoffExtra, 'R$')}/mês`} month={results.debtFreeMonth} />
                )}
                {results.goalReachedMonth && baseData.goals[0] && (
                  <MilestoneCard icon="🎯" title={`Meta: ${baseData.goals[0].name}`} description={`Com aporte de ${formatCurrency(scenario.goalContribution, 'R$')}/mês`} month={results.goalReachedMonth} />
                )}
                {results.isPositive && results.simMonthlySaving * 6 >= baseData.avgMonthlyExpenses * 6 && (
                  <MilestoneCard icon="💰" title="Reserva de emergência" description="6 meses de despesas cobertas" month={Math.ceil((baseData.avgMonthlyExpenses * 6) / results.simMonthlySaving)} />
                )}
              </div>

              {/* Comparison table */}
              <details style={{
                background: C.white, border: `1px solid ${C.borderSoft}`,
                borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <summary style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, cursor: 'pointer' }}>
                  Ver comparativo detalhado
                </summary>
                <table className="w-full mt-3" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                      <th className="text-left py-2" style={{ color: C.textMuted, fontWeight: 600 }}>Métrica</th>
                      <th className="text-right py-2" style={{ color: C.textMuted, fontWeight: 600 }}>Atual</th>
                      <th className="text-right py-2" style={{ color: C.textMuted, fontWeight: 600 }}>Simulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Renda mensal', baseData.avgMonthlyIncome, results.simIncome],
                      ['Despesas mensais', baseData.avgMonthlyExpenses, results.simExpenses],
                      ['Sobra mensal', baseData.currentBalance, results.simMonthlySaving],
                      ['Economia anual', baseData.currentBalance * 12, results.annualSavings],
                    ].map(([label, base, sim]) => (
                      <tr key={label as string} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                        <td className="py-2" style={{ color: C.textBase }}>{label as string}</td>
                        <td className="text-right py-2" style={{ color: C.textMuted }}>{formatCurrency(base as number, 'R$')}</td>
                        <td className="text-right py-2 font-bold" style={{
                          color: (sim as number) > (base as number) ? C.green : (sim as number) < (base as number) ? C.red : C.textBase,
                        }}>{formatCurrency(sim as number, 'R$')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </div>

        {/* Mobile: collapsible controls at bottom */}
        {isMobile && (
          <details open={showControls} onToggle={(e) => setShowControls((e.target as HTMLDetailsElement).open)}>
            <summary style={{
              fontSize: 16, fontWeight: 800, color: C.textStrong,
              cursor: 'pointer', padding: '12px 0', listStyle: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Ajustar cenário</span>
              <ChevronDown size={18} style={{ color: C.textMuted, transform: showControls ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
            </summary>
            {controls}
          </details>
        )}
      </div>
    </div>
  );
}

function MilestoneCard({ icon, title, description, month }: { icon: string; title: string; description: string; month: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        background: C.greenBg,
        border: `1px solid ${C.greenBorder}`,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.greenDark, fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ color: C.green, fontSize: 12, marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <div style={{
        background: C.green, color: C.white, fontSize: 11, fontWeight: 800,
        padding: '4px 10px', borderRadius: 99, flexShrink: 0,
      }}>
        Mês {month}
      </div>
    </motion.div>
  );
}
