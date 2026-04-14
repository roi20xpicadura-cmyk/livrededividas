import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/plans';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  SimulatorBase, ScenarioAdjustments, DEFAULT_SCENARIO, PRESET_SCENARIOS, computeSimulation,
} from '@/lib/simulatorEngine';
import {
  FlaskConical, TrendingUp, TrendingDown, RotateCcw, ChevronDown, Trophy, Target, Sparkles, Shield, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

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
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <m.XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} />
          <m.YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
          <m.ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
          <m.Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 10, fontSize: 12 }} />
          <m.Line type="monotone" dataKey="atual" stroke="var(--color-text-disabled)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Cenário atual" />
          <m.Area type="monotone" dataKey="simulado" stroke="#22c55e" strokeWidth={2.5} fill="url(#simGrad)" dot={false} name="Cenário simulado" />
        </m.ComposedChart>
      </m.ResponsiveContainer>
    );
  }
})));

function ImpactCard({ label, baseline, simulated, unit, inverse }: { label: string; baseline: number; simulated: number; unit: string; inverse?: boolean }) {
  const delta = simulated - baseline;
  const isPositive = inverse ? delta < 0 : delta > 0;
  const bg = delta === 0 ? 'var(--color-bg-surface)' : isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)';
  const border = delta === 0 ? 'var(--color-border-base)' : isPositive ? 'var(--color-success-border)' : 'var(--color-danger-border)';
  const color = delta === 0 ? 'var(--color-text-strong)' : isPositive ? 'var(--color-success-text)' : 'var(--color-danger-text)';

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 6, letterSpacing: '-0.8px' }}>
        {unit}{formatCurrency(simulated, '').replace('R$', '').trim()}
      </div>
      {delta !== 0 && (
        <div style={{ fontSize: 12, marginTop: 4, color, display: 'flex', alignItems: 'center', gap: 4 }}>
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
  const color = value > 0 ? 'var(--color-success-text)' : value < 0 ? 'var(--color-danger-text)' : 'var(--color-text-muted)';
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-base)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-green-600" style={{ height: 6 }} />
      {helper && <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4 }}>{helper}</p>}
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

  const controls = (
    <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 16, padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Cenários prontos:</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((p, i) => (
            <button key={i} onClick={() => applyPreset(i)}
              style={{
                padding: '8px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
                background: activePreset === i ? 'var(--color-green-600)' : 'var(--color-bg-surface)',
                color: activePreset === i ? 'white' : 'var(--color-text-muted)',
                border: `1px solid ${activePreset === i ? 'transparent' : 'var(--color-border-base)'}`,
              }}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      <SliderControl label="Renda mensal" value={scenario.incomeChange} onChange={v => updateScenario({ incomeChange: v })}
        min={-baseData.avgMonthlyIncome} max={baseData.avgMonthlyIncome}
        helper={`Atual: ${formatCurrency(baseData.avgMonthlyIncome, 'R$')} → Simulado: ${formatCurrency(baseData.avgMonthlyIncome + scenario.incomeChange, 'R$')}`}
        formatVal={v => `${v >= 0 ? '+' : ''}${formatCurrency(v, 'R$')}`} />

      <SliderControl label="Horizonte de tempo" value={scenario.months} onChange={v => updateScenario({ months: v })}
        min={1} max={60} formatVal={v => `${v} ${v === 1 ? 'mês' : 'meses'}${v >= 12 ? ` (${(v / 12).toFixed(1)} anos)` : ''}`} />

      <button onClick={() => setShowCategories(!showCategories)}
        className="flex items-center gap-2 w-full" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
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
    <div className="space-y-4 pb-28">
      {/* Sandbox banner */}
      <div className="flex items-center gap-2.5" style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 20px',
      }}>
        <FlaskConical size={16} style={{ color: '#d97706', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e', flex: 1 }}>
          Ambiente de simulação — nenhuma alteração afeta seus dados reais
        </span>
        <button onClick={resetAll} style={{ fontSize: 12, fontWeight: 600, color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RotateCcw size={12} /> Resetar
        </button>
      </div>

      {/* Mobile controls toggle */}
      {isMobile && (
        <>
          {/* Preset chips horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {PRESET_SCENARIOS.map((p, i) => (
              <button key={i} onClick={() => applyPreset(i)} className="flex-shrink-0"
                style={{
                  padding: '8px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: activePreset === i ? 'var(--color-green-600)' : 'var(--color-bg-surface)',
                  color: activePreset === i ? 'white' : 'var(--color-text-muted)',
                  border: `1px solid ${activePreset === i ? 'transparent' : 'var(--color-border-base)'}`,
                  whiteSpace: 'nowrap',
                }}>
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className={isMobile ? 'space-y-4' : 'grid gap-5'} style={!isMobile ? { gridTemplateColumns: '420px 1fr' } : undefined}>
        {/* Controls — desktop: left column; mobile: collapsible at bottom */}
        {!isMobile && controls}

        {/* Results */}
        <div className="space-y-4">
          {results && (
            <>
              {/* Impact cards */}
              <div className="grid grid-cols-2 gap-3">
                <ImpactCard label="Sobra mensal" baseline={baseData.currentBalance} simulated={results.simMonthlySaving} unit="R$ " />
                <ImpactCard label="Em 12 meses" baseline={baseData.currentBalance * 12} simulated={results.annualSavings} unit="R$ " />
                <ImpactCard label="Score financeiro" baseline={baseData.financialScore} simulated={baseData.financialScore + results.scoreDelta} unit="" />
                {baseData.totalDebt > 0 && (
                  <ImpactCard label="Dívida restante" baseline={baseData.totalDebt} simulated={results.remainingDebt} unit="R$ " inverse />
                )}
              </div>

              {/* Chart */}
              <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 16, padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 16 }}>Projeção do saldo ao longo do tempo</p>
                <div style={{ height: isMobile ? 220 : 280 }}>
                  <Suspense fallback={<div className="skeleton-shimmer w-full h-full" style={{ borderRadius: 12 }} />}>
                    <LazySimChart timeline={results.timeline} baseline={results.baselineTimeline} />
                  </Suspense>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                {results.debtFreeMonth && (
                  <MilestoneCard icon="🏆" title="Dívida quitada" description={`Com pagamento extra de ${formatCurrency(scenario.debtPayoffExtra, 'R$')}/mês`} month={results.debtFreeMonth} isImproved />
                )}
                {results.goalReachedMonth && baseData.goals[0] && (
                  <MilestoneCard icon="🎯" title={`Meta: ${baseData.goals[0].name}`} description={`Com aporte de ${formatCurrency(scenario.goalContribution, 'R$')}/mês`} month={results.goalReachedMonth} isImproved />
                )}
                {results.isPositive && results.simMonthlySaving * 6 >= baseData.avgMonthlyExpenses * 6 && (
                  <MilestoneCard icon="💰" title="Reserva de emergência" description="6 meses de despesas cobertas" month={Math.ceil((baseData.avgMonthlyExpenses * 6) / results.simMonthlySaving)} isImproved />
                )}
              </div>

              {/* Comparison table */}
              <details style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-base)', borderRadius: 16, padding: 16 }}>
                <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', cursor: 'pointer' }}>Ver comparativo detalhado ▼</summary>
                <table className="w-full mt-3" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
                      <th className="text-left py-2" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Métrica</th>
                      <th className="text-right py-2" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Atual</th>
                      <th className="text-right py-2" style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Simulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Renda mensal', baseData.avgMonthlyIncome, results.simIncome],
                      ['Despesas mensais', baseData.avgMonthlyExpenses, results.simExpenses],
                      ['Sobra mensal', baseData.currentBalance, results.simMonthlySaving],
                      ['Economia anual', baseData.currentBalance * 12, results.annualSavings],
                    ].map(([label, base, sim]) => (
                      <tr key={label as string} style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
                        <td className="py-2" style={{ color: 'var(--color-text-base)' }}>{label as string}</td>
                        <td className="text-right py-2" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(base as number, 'R$')}</td>
                        <td className="text-right py-2 font-bold" style={{
                          color: (sim as number) > (base as number) ? 'var(--color-success-text)' : (sim as number) < (base as number) ? 'var(--color-danger-text)' : 'var(--color-text-base)',
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
          <details open={showControls}>
            <summary style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', cursor: 'pointer', padding: '12px 0' }}>
              Ajustar cenário ▼
            </summary>
            {controls}
          </details>
        )}
      </div>
    </div>
  );
}

function MilestoneCard({ icon, title, description, month, isImproved }: { icon: string; title: string; description: string; month: number; isImproved: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        background: isImproved ? 'var(--color-success-bg)' : 'var(--color-bg-surface)',
        border: `1px solid ${isImproved ? 'var(--color-success-border)' : 'var(--color-border-base)'}`,
        borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: isImproved ? 'var(--color-success-bg)' : 'var(--color-bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</div>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 99,
        background: isImproved ? 'var(--color-green-600)' : 'var(--color-bg-sunken)',
        color: isImproved ? 'white' : 'var(--color-text-muted)',
      }}>
        Mês {month}
      </div>
    </motion.div>
  );
}
