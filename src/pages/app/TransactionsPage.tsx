import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import ImportModal from '@/components/app/ImportModal';
import NewTransactionSheet from '@/components/app/NewTransactionSheet';
import { Plus, Search, X, Trash2, Upload, Inbox } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { normalizeTransactionName } from '@/lib/normalizeTransactionName';
import { getCategoryStyle } from '@/lib/categoryIcons';
import TransactionIcon from '@/components/app/TransactionIcon';

type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string; origin: string; category: string; notes: string | null;
  user_id: string; created_at: string | null;
};

const ITEMS_PER_PAGE = 20;

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDayLabelPt(d: Date): string {
  // "sábado, 18 de abril" — sem pontos / sem capitalização forçada
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Agrupa transações com mesmo nome normalizado + mesmo valor + mesmo dia. */
type TxGroup = { key: string; items: Tx[]; total: number };
function aggregateSameDay(list: Tx[]): TxGroup[] {
  const map = new Map<string, TxGroup>();
  for (const tx of list) {
    const name = normalizeTransactionName(tx.description) || tx.description;
    const key = `${tx.type}|${name.toLowerCase()}|${Number(tx.amount).toFixed(2)}|${tx.category}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(tx);
      existing.total += Number(tx.amount);
    } else {
      map.set(key, { key, items: [tx], total: Number(tx.amount) });
    }
  }
  return Array.from(map.values());
}

interface TransactionsPageProps {
  /** When set, this page only shows transactions of this origin and locks the add-sheet to it. */
  profile?: 'personal' | 'business';
}

export default function TransactionsPage({ profile }: TransactionsPageProps = {}) {
  const { user } = useAuth();
  const { config } = useProfile();
  const profileType = config?.profile_type || 'personal';
  // When the page is locked to a profile (via /transactions/personal or /business),
  // hide the origin chip filter — the page is already scoped.
  const showOriginFilter = profileType === 'both' && !profile;
  const lockedOrigin: 'personal' | 'business' | null = profile
    ?? (profileType === 'personal' ? 'personal' : profileType === 'business' ? 'business' : null);

  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'personal' | 'business'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Debounce search to prevent re-render storm and scroll-jump on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);
  const [showSheet, setShowSheet] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  const fetchTxs = useCallback(async () => {
    if (!user) return;
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    let q = supabase.from('transactions').select('*')
      .eq('user_id', user.id).gte('date', start).lte('date', end)
      .order('date', { ascending: false });
    if (lockedOrigin) q = q.eq('origin', lockedOrigin);
    const { data } = await q;
    setTxs((data || []) as Tx[]);
    setLoading(false);
  }, [user, lockedOrigin]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  // Filtering
  const filtered = useMemo(() => {
    return txs
      .filter(t => {
        if (filter === 'all') return true;
        if (filter === 'income' || filter === 'expense') return t.type === filter;
        if (filter === 'personal' || filter === 'business') return t.origin === filter;
        return true;
      })
      .filter(t => !debouncedSearch ||
        t.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(debouncedSearch.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || ''));
  }, [txs, filter, debouncedSearch]);

  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { inc, exp, count: filtered.length };
  }, [filtered]);

  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, Tx[]> = {};
    paginated.forEach(tx => {
      if (!map[tx.date]) map[tx.date] = [];
      map[tx.date].push(tx);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [paginated]);

  const handleDelete = async (id: string) => {
    await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    window.dispatchEvent(new CustomEvent('kora:transaction-changed'));
    toast.success('Removido');
    setOpenActionsId(null);
    fetchTxs();
  };

  // Filters available
  const filters = useMemo(() => {
    const base = [
      { id: 'all' as const, label: 'Todos' },
      { id: 'income' as const, label: 'Receitas' },
      { id: 'expense' as const, label: 'Despesas' },
    ];
    if (showOriginFilter) {
      return [...base,
        { id: 'personal' as const, label: '🏠 Pessoal' },
        { id: 'business' as const, label: '💼 Negócio' },
      ];
    }
    return base;
  }, [showOriginFilter]);

  // Reset filter if user switches profile type and current filter no longer applies
  useEffect(() => {
    if (!showOriginFilter && (filter === 'personal' || filter === 'business')) {
      setFilter('all');
    }
  }, [showOriginFilter, filter]);

  const periodLabel = format(new Date(), "MMMM yyyy", { locale: ptBR });
  const balance = totals.inc - totals.exp;

  // Counts by filter — used in chips
  const counts = useMemo(() => {
    const inc = txs.filter(t => t.type === 'income').length;
    const exp = txs.filter(t => t.type === 'expense').length;
    return { all: txs.length, income: inc, expense: exp };
  }, [txs]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ height: 96, borderRadius: 16, background: 'var(--color-bg-sunken)', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* HERO — gradiente roxo com saldo + KPIs */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: 24,
            padding: '18px 18px 16px',
            background:
              'radial-gradient(120% 100% at 0% 0%, #4C1D95 0%, transparent 55%), radial-gradient(120% 100% at 100% 100%, #6D28D9 0%, transparent 60%), linear-gradient(135deg, #1E0B4D 0%, #3B1397 60%, #5B21B6 100%)',
            color: '#fff',
            overflow: 'hidden',
            boxShadow: '0 16px 40px -16px rgba(76, 29, 149, 0.55), 0 4px 12px -4px rgba(76, 29, 149, 0.35)',
          }}
        >
          {/* Glow decorativo */}
          <div
            aria-hidden
            style={{
              position: 'absolute', top: -40, right: -40, width: 180, height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(167, 139, 250, 0.45), transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top row: período + ações */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.72)',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.14)',
                padding: '5px 10px', borderRadius: 99,
                backdropFilter: 'blur(8px)',
              }}
            >
              {periodLabel}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowImport(true)}
                aria-label="Importar"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                  backdropFilter: 'blur(8px)',
                }}>
                <Upload style={{ width: 15, height: 15 }} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowSheet(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
                  background: '#fff', border: 'none', borderRadius: 10,
                  color: '#3B1397', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                }}>
                <Plus style={{ width: 14, height: 14 }} /> Novo
              </motion.button>
            </div>
          </div>

          {/* Saldo */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
              Saldo do período
            </div>
            <div style={{
              fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.025em', lineHeight: 1.05,
              color: '#fff',
              textShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}>
              {balance < 0 ? '−' : ''}R$ {formatBRL(Math.abs(balance))}
            </div>
          </div>

          {/* Mini KPIs */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Receitas', value: totals.inc, dot: '#34D399' },
              { label: 'Despesas', value: totals.exp, dot: '#F472B6' },
            ].map(kpi => (
              <div key={kpi.label} style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '10px 12px',
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: kpi.dot, boxShadow: `0 0 8px ${kpi.dot}` }} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: '#fff' }}>
                  R$ {formatBRL(kpi.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros + busca (sticky) */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'var(--color-bg-base)',
          padding: '12px 16px 8px',
          marginTop: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8 }} className="hide-scrollbar">
          {filters.map(f => {
            const active = filter === f.id;
            const countMap: Record<string, number> = { all: counts.all, income: counts.income, expense: counts.expense };
            const c = countMap[f.id];
            return (
              <motion.button key={f.id} whileTap={{ scale: 0.95 }}
                onClick={() => { setFilter(f.id); setPage(1); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 32, padding: '0 12px', borderRadius: 99,
                  border: `1px solid ${active ? 'transparent' : 'var(--color-border-base)'}`,
                  background: active ? 'hsl(var(--primary))' : 'var(--color-bg-surface)',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? 'hsl(var(--primary-foreground))' : 'var(--color-text-muted)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 150ms',
                  boxShadow: active ? '0 4px 14px hsl(var(--primary) / 0.32)' : 'none',
                }}>
                {f.label}
                {c !== undefined && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700,
                    padding: '1px 7px', borderRadius: 99, lineHeight: 1.4,
                    background: active ? 'rgba(255,255,255,0.22)' : 'var(--color-bg-sunken)',
                    color: active ? '#fff' : 'var(--color-text-muted)',
                  }}>{c}</span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-bg-surface)',
          border: '1.5px solid var(--color-border-base)',
          borderRadius: 12, padding: '0 14px', height: 40,
        }}>
          <Search style={{ width: 15, height: 15, color: 'var(--color-text-muted)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar lançamentos..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--color-text-base)',
            }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            margin: '24px 16px', padding: '48px 24px', textAlign: 'center',
            background: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border-base)',
            borderRadius: 20,
          }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--color-bg-sunken)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Inbox style={{ width: 28, height: 28, color: 'var(--color-text-muted)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 4 }}>
            {search || filter !== 'all' ? 'Nenhum lançamento encontrado' : 'Nenhum lançamento ainda'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18 }}>
            {search || filter !== 'all' ? 'Tente ajustar os filtros' : 'Comece adicionando sua primeira movimentação'}
          </div>
          {!search && filter === 'all' && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSheet(true)}
              style={{
                height: 44, padding: '0 24px', background: 'hsl(var(--primary))',
                border: 'none', borderRadius: 12, color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px hsl(var(--primary) / 0.25)',
              }}>
              + Adicionar primeiro lançamento
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {grouped.map(([date, list]) => {
            const d = new Date(date + 'T00:00:00');
            const today = new Date(); today.setHours(0,0,0,0);
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            let label: string;
            if (d.getTime() === today.getTime()) label = 'Hoje';
            else if (d.getTime() === yesterday.getTime()) label = 'Ontem';
            else label = formatDayLabelPt(d);

            const groups = aggregateSameDay(list);
            const dayInc = list.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
            const dayExp = list.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
            const dayNet = dayInc - dayExp;

            return (
              <div key={date}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 20px 8px',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.01em',
                    color: dayNet === 0
                      ? 'var(--color-text-muted)'
                      : dayNet > 0 ? 'var(--color-success-text, #047857)' : 'var(--color-danger-text)',
                  }}>
                    {dayNet > 0 ? '+' : dayNet < 0 ? '−' : ''}R$ {formatBRL(Math.abs(dayNet))}
                  </span>
                </div>
                <div style={{
                  background: 'var(--color-bg-surface)',
                  borderRadius: 16, margin: '0 16px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border-weak)',
                }}>
                  {groups.map((group, i) => {
                    const tx = group.items[0];
                    const isGroup = group.items.length > 1;
                    const isExpanded = expandedGroups.has(group.key);
                    const displayName = normalizeTransactionName(tx.description) || tx.description;
                    const isIncome = tx.type === 'income';
                    const style = getCategoryStyle(tx.category, isIncome);
                    const amountAbs = Math.abs(group.total);
                    const isLarge = amountAbs >= 500;
                    const isSmall = amountAbs < 100;

                    const handleClick = () => {
                      if (isGroup) {
                        setExpandedGroups(prev => {
                          const next = new Set(prev);
                          if (next.has(group.key)) next.delete(group.key);
                          else next.add(group.key);
                          return next;
                        });
                      } else {
                        setOpenActionsId(openActionsId === tx.id ? null : tx.id);
                      }
                    };

                    return (
                      <div key={group.key}>
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                          onClick={handleClick}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px',
                            borderBottom: i < groups.length - 1 ? '0.5px solid var(--color-border-weak)' : 'none',
                            cursor: 'pointer',
                          }}>
                          {/* Icon — favicon real da marca quando reconhecida, com fallback ao ícone da categoria */}
                          <TransactionIcon
                            description={tx.description}
                            category={tx.category}
                            isIncome={isIncome}
                            size={40}
                            rounded={12}
                          />

                          {/* Description + meta */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              marginBottom: 3,
                            }}>
                              <div style={{
                                fontSize: isLarge ? 15 : 14, fontWeight: 600,
                                color: 'var(--color-text-strong)',
                                letterSpacing: '-0.01em',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const,
                                wordBreak: 'break-word',
                                lineHeight: 1.25,
                                minWidth: 0, flex: '1 1 auto',
                              }}>
                                {displayName}
                              </div>
                              {isGroup && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  background: 'var(--color-bg-sunken)',
                                  color: 'var(--color-text-muted)',
                                  padding: '1px 6px', borderRadius: 99,
                                  flexShrink: 0,
                                }}>
                                  {group.items.length}×
                                </span>
                              )}
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              fontSize: 11, color: 'var(--color-text-muted)',
                              flexWrap: 'wrap',
                            }}>
                              {tx.category && (
                                <span style={{
                                  background: 'var(--color-bg-sunken)',
                                  padding: '1px 7px', borderRadius: 99,
                                  fontSize: 10, fontWeight: 600,
                                }}>
                                  {tx.category}
                                </span>
                              )}
                              {profileType === 'both' && !lockedOrigin && tx.origin && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: 10, fontWeight: 600,
                                  color: 'var(--color-text-muted)',
                                }}>
                                  <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: tx.origin === 'personal' ? 'hsl(var(--primary))' : 'hsl(var(--blue))',
                                  }} />
                                  {tx.origin === 'personal' ? 'Pessoal' : 'Negócio'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Amount — sóbrio */}
                          <div style={{
                            fontSize: isLarge ? 16 : isSmall ? 13 : 15,
                            fontWeight: isLarge ? 800 : 700,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '-0.02em',
                            color: 'var(--color-text-strong)',
                            opacity: isSmall ? 0.85 : 1,
                            flexShrink: 0,
                          }}>
                            {isIncome ? '+' : '−'}R$ {formatBRL(amountAbs)}
                          </div>

                          {/* Delete (apenas itens não agrupados) */}
                          <AnimatePresence>
                            {!isGroup && openActionsId === tx.id && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={e => { e.stopPropagation(); handleDelete(tx.id); }}
                                style={{
                                  width: 32, height: 32, borderRadius: 8,
                                  background: 'var(--color-danger-bg)',
                                  border: 'none', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                <Trash2 style={{ width: 14, height: 14, color: 'var(--color-danger-text)' }} />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* Itens agrupados expandidos */}
                        <AnimatePresence>
                          {isGroup && isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              style={{ overflow: 'hidden', background: 'var(--color-bg-sunken)' }}
                            >
                              {group.items.map((sub) => (
                                <div key={sub.id}
                                  onClick={() => setOpenActionsId(openActionsId === sub.id ? null : sub.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '8px 14px 8px 64px',
                                    fontSize: 12, color: 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    borderBottom: '0.5px solid var(--color-border-weak)',
                                  }}>
                                  <span style={{ flex: 1 }}>
                                    {format(new Date((sub.created_at || sub.date)), 'HH:mm')} · {sub.notes || 'sem nota'}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text-strong)' }}>
                                    {isIncome ? '+' : '−'}R$ {formatBRL(Number(sub.amount))}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                                    style={{
                                      background: 'transparent', border: 'none', cursor: 'pointer',
                                      padding: 4, display: 'flex',
                                    }}>
                                    <Trash2 style={{ width: 12, height: 12, color: 'var(--color-text-muted)' }} />
                                  </button>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div style={{ padding: '12px 16px' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPage(p => p + 1)}
                style={{
                  width: '100%', height: 44,
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border-base)',
                  borderRadius: 12, fontSize: 13, fontWeight: 700,
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                }}>
                Ver mais lançamentos
              </motion.button>
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{
          padding: '20px 16px 8px', textAlign: 'center',
          fontSize: 11, color: 'var(--color-text-muted)',
        }}>
          {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''} este mês
        </div>
      )}

      {/* Sheets */}
      <NewTransactionSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onSuccess={fetchTxs}
        profileType={profileType}
        forceOrigin={profile}
      />
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchTxs}
        profileType={profileType}
      />
    </div>
  );
}
