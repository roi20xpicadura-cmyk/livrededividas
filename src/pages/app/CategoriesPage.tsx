import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Wallet, Sparkles } from 'lucide-react';

type Tx = { id: string; amount: number; category: string; type: string; date: string };
type Period = 'this_month' | 'last_month' | 'year';
type TxType = 'expense' | 'income';

// Paleta premium — gradientes violet com profundidade
const PALETTE: { from: string; to: string; solid: string }[] = [
  { from: '#8B5CF6', to: '#6D28D9', solid: '#7C3AED' },
  { from: '#A78BFA', to: '#7C3AED', solid: '#8B5CF6' },
  { from: '#C4B5FD', to: '#8B5CF6', solid: '#A78BFA' },
  { from: '#DDD6FE', to: '#A78BFA', solid: '#C4B5FD' },
  { from: '#9333EA', to: '#5B21B6', solid: '#7E22CE' },
  { from: '#A855F7', to: '#6B21A8', solid: '#9333EA' },
  { from: '#7C3AED', to: '#4C1D95', solid: '#6D28D9' },
  { from: '#EDE9FE', to: '#C4B5FD', solid: '#DDD6FE' },
];

const PERIOD_LABELS: Record<Period, string> = {
  this_month: 'Este mês',
  last_month: 'Mês passado',
  year: 'Ano',
};

function getRange(period: Period): [string, string] {
  const now = new Date();
  if (period === 'this_month') return [format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')];
  if (period === 'last_month') {
    const prev = subMonths(now, 1);
    return [format(startOfMonth(prev), 'yyyy-MM-dd'), format(endOfMonth(prev), 'yyyy-MM-dd')];
  }
  return [format(startOfYear(now), 'yyyy-MM-dd'), format(endOfYear(now), 'yyyy-MM-dd')];
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Donut({ slices, total }: { slices: { from: string; to: string; value: number }[]; total: number }) {
  const size = 240;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 drop-shadow-[0_8px_24px_rgba(124,58,237,0.18)]">
      <defs>
        {slices.map((s, i) => (
          <linearGradient key={i} id={`donut-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={s.from} />
            <stop offset="100%" stopColor={s.to} />
          </linearGradient>
        ))}
        <filter id="donut-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg-sunken)" strokeWidth={stroke} opacity={0.6} />
      {total > 0 && slices.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <motion.circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#donut-grad-${i})`}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.5 }}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('this_month');
  const [txType, setTxType] = useState<TxType>('expense');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const [start, end] = getRange(period);
    setLoading(true);
    supabase
      .from('transactions')
      .select('id, amount, category, type, date')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .is('deleted_at', null)
      .then(({ data }) => {
        setTxs((data as Tx[]) || []);
        setLoading(false);
      });
  }, [user, period]);

  const { categories, total } = useMemo(() => {
    const filtered = txs.filter(t => t.type === txType);
    const map = new Map<string, number>();
    filtered.forEach(t => {
      const cat = t.category || 'Outro';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount || 0));
    });
    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const tot = arr.reduce((s, c) => s + c.value, 0);
    const colored = arr.map((c, i) => {
      const palette = PALETTE[i % PALETTE.length];
      return {
        ...c,
        from: palette.from,
        to: palette.to,
        solid: palette.solid,
        pct: tot > 0 ? (c.value / tot) * 100 : 0,
      };
    });
    return { categories: colored, total: tot };
  }, [txs, txType]);

  const isEmpty = !loading && categories.length === 0;

  return (
    <div className="max-w-5xl mx-auto pb-20" style={{ padding: '16px' }}>
      {/* Hero card: tipo + período */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-green-50) 0%, var(--color-bg-surface) 100%)',
          border: '1px solid var(--color-border-weak)',
          borderRadius: 'var(--radius-2xl)',
          padding: '18px',
          marginBottom: 16,
        }}
      >
        {/* Type selector */}
        <div className="flex items-center justify-center mb-4 relative">
          <button
            onClick={() => setShowTypeMenu(v => !v)}
            className="flex items-center gap-2 transition-all"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--color-text-strong)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            {txType === 'expense' ? (
              <><TrendingDown style={{ width: 14, height: 14, color: 'var(--color-danger-solid)' }} /> Despesas</>
            ) : (
              <><TrendingUp style={{ width: 14, height: 14, color: 'var(--color-success-solid)' }} /> Receitas</>
            )}
            <ChevronDown style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
          </button>

          {showTypeMenu && (
            <div
              className="absolute top-full mt-2 z-10"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-base)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: 4,
                minWidth: 160,
              }}
            >
              {(['expense', 'income'] as TxType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTxType(t); setShowTypeMenu(false); }}
                  className="flex items-center gap-2 w-full text-left transition-colors"
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--color-text-base)',
                    borderRadius: 'var(--radius-md)',
                    background: txType === t ? 'var(--color-green-50)' : 'transparent',
                  }}
                >
                  {t === 'expense'
                    ? <><TrendingDown style={{ width: 14, height: 14, color: 'var(--color-danger-solid)' }} /> Despesas</>
                    : <><TrendingUp style={{ width: 14, height: 14, color: 'var(--color-success-solid)' }} /> Receitas</>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Period tabs */}
        <div
          className="flex items-center justify-center"
          style={{
            background: 'var(--color-bg-sunken)',
            border: '1px solid var(--color-border-weak)',
            borderRadius: 'var(--radius-full)',
            padding: 4,
            margin: '0 auto 22px',
            width: 'fit-content',
          }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="transition-all"
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 'var(--radius-full)',
                background: period === p ? 'var(--color-green-600)' : 'transparent',
                color: period === p ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Donut + summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
          <div className="flex justify-center relative">
            <Donut slices={categories} total={total} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Total
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-strong)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {fmt(total)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
              </span>
            </div>
          </div>

          {/* Top 5 legenda */}
          <div className="space-y-2">
            {categories.slice(0, 5).map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                      boxShadow: `0 0 8px ${c.solid}66`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--color-text-base)', fontWeight: 600 }} className="truncate">
                    {c.name}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                  {c.pct.toFixed(1)}%
                </span>
              </motion.div>
            ))}
            {categories.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Wallet style={{ width: 24, height: 24, color: 'var(--color-text-subtle)' }} />
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  Sem dados nesse período.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista detalhada */}
      <div
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-weak)',
          borderRadius: 'var(--radius-2xl)',
          padding: '8px 4px',
        }}
      >
        {loading && (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-bg-sunken)' }} />
                <div className="flex-1 space-y-2">
                  <div style={{ height: 10, width: '40%', background: 'var(--color-bg-sunken)', borderRadius: 4 }} />
                  <div style={{ height: 6, width: '100%', background: 'var(--color-bg-sunken)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: '40px 20px' }}>
            <div
              className="flex items-center justify-center"
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-green-50)', marginBottom: 12 }}
            >
              <Wallet style={{ width: 26, height: 26, color: 'var(--color-green-600)' }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)' }}>
              Sem {txType === 'expense' ? 'despesas' : 'receitas'} nesse período
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, maxWidth: 280 }}>
              Lance algumas transações ou troque o período pra ver o breakdown.
            </p>
          </div>
        )}

        {!loading && categories.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, ease: 'easeOut' }}
            whileHover={{ x: 2 }}
            style={{
              padding: '14px 12px',
              borderBottom: i < categories.length - 1 ? '1px solid var(--color-border-weak)' : 'none',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 40, height: 40, borderRadius: '12px',
                    background: `linear-gradient(135deg, ${c.from}1f, ${c.to}33)`,
                    border: `1px solid ${c.solid}33`,
                    color: c.solid,
                    fontSize: 15, fontWeight: 900,
                    boxShadow: `0 4px 12px -4px ${c.solid}40`,
                  }}
                >
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }} className="truncate">
                      {c.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: c.solid,
                        background: `${c.solid}14`,
                        padding: '2px 6px',
                        borderRadius: 999,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {c.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: 'var(--color-text-strong)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(c.value)}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginLeft: 52 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
                  borderRadius: 'var(--radius-full)',
                  boxShadow: `0 0 12px ${c.solid}55`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}