import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

type Tx = { id: string; amount: number; category: string; type: string; date: string };
type Period = 'this_month' | 'last_month' | 'year';
type TxType = 'expense' | 'income';

// Paleta violet harmoniosa (8 tons) — usada em ordem decrescente de gasto
const PALETTE = [
  '#7C3AED', '#A78BFA', '#C4B5FD', '#8B5CF6',
  '#6D28D9', '#DDD6FE', '#5B21B6', '#9333EA',
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

function Donut({ slices, total }: { slices: { value: number; color: string }[]; total: number }) {
  const size = 220;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg-sunken)" strokeWidth={stroke} />
      {total > 0 && slices.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
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
    const colored = arr.map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length], pct: tot > 0 ? (c.value / tot) * 100 : 0 }));
    return { categories: colored, total: tot };
  }, [txs, txType]);

  const isEmpty = !loading && categories.length === 0;

  return (
    <div className="max-w-5xl mx-auto pb-20" style={{ padding: '16px' }}>
      {/* Header */}
      <div className="mb-5">
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.02em' }}>
          Categorias
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Veja para onde seu dinheiro está indo.
        </p>
      </div>

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
            {categories.slice(0, 5).map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-base)', fontWeight: 600 }} className="truncate">
                    {c.name}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                  {c.pct.toFixed(1)}%
                </span>
              </div>
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              padding: '12px',
              borderBottom: i < categories.length - 1 ? '1px solid var(--color-border-weak)' : 'none',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${c.color}22`,
                    color: c.color,
                    fontSize: 14, fontWeight: 900,
                  }}
                >
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }} className="truncate">
                      {c.name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-subtle)' }}>
                      {c.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: txType === 'expense' ? 'var(--color-danger-solid)' : 'var(--color-success-solid)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(c.value)}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                style={{ height: '100%', background: c.color, borderRadius: 'var(--radius-full)' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}