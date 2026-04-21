import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import ImportModal from '@/components/app/ImportModal';
import NewTransactionSheet from '@/components/app/NewTransactionSheet';
import { Plus, Search, X, Trash2, Upload, ChevronDown, Inbox } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { normalizeTransactionName } from '@/lib/normalizeTransactionName';
import { getCategoryStyle } from '@/lib/categoryIcons';

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

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ height: 96, borderRadius: 16, background: 'var(--color-bg-sunken)', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Page header */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {periodLabel}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowImport(true)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-base)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-muted)',
            }}>
            <Upload style={{ width: 15, height: 15 }} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSheet(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
              background: 'var(--color-green-600)', border: 'none', borderRadius: 10,
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
            }}>
            <Plus style={{ width: 14, height: 14 }} /> Novo
          </motion.button>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        margin: '12px 16px',
        background: 'var(--color-bg-surface)',
        borderRadius: 16, padding: '14px 18px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        border: '1px solid var(--color-border-weak)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {[
            { label: 'Receitas', value: totals.inc, color: 'var(--color-success-text)', prefix: '+' },
            { label: 'Despesas', value: totals.exp, color: 'var(--color-danger-text)', prefix: '-' },
            { label: 'Saldo', value: Math.abs(balance), color: balance >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)', prefix: balance < 0 ? '-' : '' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '0 12px', borderLeft: i > 0 ? '0.5px solid var(--color-border-weak)' : 'none' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: s.color, letterSpacing: '-0.02em',
              }}>
                {s.prefix}R$ {formatCompact(s.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '0 16px', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}
        className="hide-scrollbar">
        {filters.map(f => (
          <motion.button key={f.id} whileTap={{ scale: 0.95 }}
            onClick={() => { setFilter(f.id); setPage(1); }}
            style={{
              height: 32, padding: '0 14px', borderRadius: 99,
              border: `1.5px solid ${filter === f.id ? 'var(--color-green-600)' : 'var(--color-border-base)'}`,
              background: filter === f.id ? 'var(--color-success-bg)' : 'var(--color-bg-surface)',
              fontSize: 13, fontWeight: filter === f.id ? 700 : 500,
              color: filter === f.id ? 'var(--color-success-text)' : 'var(--color-text-muted)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 150ms',
            }}>
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Search */}
      <div style={{
        margin: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
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

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{
          margin: '24px 16px', padding: '40px 20px', textAlign: 'center',
          background: 'var(--color-bg-surface)',
          border: '1px dashed var(--color-border-base)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)', marginBottom: 4 }}>
            {search || filter !== 'all' ? 'Nenhum lançamento encontrado' : 'Nenhum lançamento ainda'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            {search || filter !== 'all' ? 'Tente ajustar os filtros' : 'Adicione sua primeira receita ou despesa'}
          </div>
          {!search && filter === 'all' && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSheet(true)}
              style={{
                height: 44, padding: '0 24px', background: 'var(--color-green-600)',
                border: 'none', borderRadius: 12, color: 'white',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124, 58, 237,0.3)',
              }}>
              + Novo lançamento
            </motion.button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {grouped.map(([date, list]) => {
            const dayTotal = list.reduce((s, tx) => tx.type === 'income' ? s + Number(tx.amount) : s - Number(tx.amount), 0);
            const d = new Date(date + 'T00:00:00');
            const today = new Date(); today.setHours(0,0,0,0);
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            let label: string;
            if (d.getTime() === today.getTime()) label = 'Hoje';
            else if (d.getTime() === yesterday.getTime()) label = 'Ontem';
            else label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

            return (
              <div key={date}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 20px 6px',
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)',
                    textTransform: 'capitalize',
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: dayTotal >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                  }}>
                    {dayTotal >= 0 ? '+' : ''}R$ {formatBRL(dayTotal)}
                  </span>
                </div>
                <div style={{
                  background: 'var(--color-bg-surface)',
                  borderRadius: 14, margin: '0 16px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  border: '1px solid var(--color-border-weak)',
                }}>
                  {list.map((tx, i) => (
                      <div key={tx.id}
                        onClick={() => setOpenActionsId(openActionsId === tx.id ? null : tx.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px',
                          borderBottom: i < list.length - 1 ? '0.5px solid var(--color-border-weak)' : 'none',
                          cursor: 'pointer',
                        }}>
                        {/* Icon */}
                        <div style={{
                          width: 42, height: 42, borderRadius: 12,
                          background: tx.type === 'income' ? 'var(--color-success-bg)' : 'var(--color-bg-sunken)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>
                          {getCategoryEmoji(tx.category)}
                        </div>

                        {/* Description + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600, color: 'var(--color-text-strong)',
                            letterSpacing: '-0.01em',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            marginBottom: 3, textTransform: 'capitalize',
                          }}>
                            {tx.description}
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
                            {profileType === 'both' && tx.origin && (
                              <>
                                <span>·</span>
                                <span style={{
                                  fontSize: 10, fontWeight: 600,
                                  color: tx.origin === 'personal' ? 'var(--color-green-600)' : '#3B82F6',
                                }}>
                                  {tx.origin === 'personal' ? 'Pessoal' : 'Negócio'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div style={{
                          fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)',
                          letterSpacing: '-0.02em',
                          color: tx.type === 'income' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                          flexShrink: 0,
                        }}>
                          {tx.type === 'income' ? '+' : '-'}R$ {formatBRL(Number(tx.amount))}
                        </div>

                        {/* Delete */}
                        <AnimatePresence>
                          {openActionsId === tx.id && (
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
                      </div>
                    ))}
                </div>
              </div>
            );
          })}

          {/* Load more / total */}
          {hasMore ? (
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
          ) : (
            <div style={{
              textAlign: 'center', padding: 16,
              fontSize: 12, color: 'var(--color-text-muted)',
            }}>
              {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''} no total
            </div>
          )}
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
