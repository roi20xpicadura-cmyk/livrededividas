import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { detectSubscriptions, monthlyTotal, type DetectedSubscription } from '@/lib/subscriptionDetector';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, CheckCircle2, AlertCircle, Calendar, TrendingDown, Search, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

type Status = 'active' | 'cancelled' | 'ignored';

interface Row {
  id: string;
  match_pattern: string;
  service_name: string;
  category: string | null;
  icon: string | null;
  estimated_amount: number;
  frequency: string;
  last_charge_date: string | null;
  next_expected_date: string | null;
  occurrences: number;
  status: Status;
  user_acknowledged: boolean;
  notes: string | null;
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Design tokens (light theme, violet accent)
const C = {
  violet: '#7C3AED',
  violetSoft: '#EDE9FE',
  violetSofter: '#F5F3FF',
  borderSoft: '#F0EEF8',
  textStrong: '#1A0D35',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  white: '#FFFFFF',
};

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('detected_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('estimated_amount', { ascending: false });
    setRows((data as Row[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading && rows.length === 0 && user) {
      scan(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const scan = useCallback(async (silent = false) => {
    if (!user) return;
    setScanning(true);
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('id, description, amount, date, category, type')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .is('deleted_at', null)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: true })
        .limit(2000);

      if (error) throw error;

      const detected = detectSubscriptions(
        (txs || []).map(t => ({ ...t, amount: Number(t.amount) }))
      );

      const { data: existing } = await supabase
        .from('detected_subscriptions')
        .select('id, match_pattern, status')
        .eq('user_id', user.id);
      const existingMap = new Map((existing || []).map(e => [e.match_pattern, e]));

      let newCount = 0;
      const upserts: any[] = [];
      for (const d of detected) {
        const prev = existingMap.get(d.match_pattern);
        if (!prev) newCount++;
        upserts.push({
          user_id: user.id,
          match_pattern: d.match_pattern,
          service_name: d.service_name,
          category: d.category,
          icon: d.icon,
          estimated_amount: d.estimated_amount,
          frequency: d.frequency,
          last_charge_date: d.last_charge_date,
          next_expected_date: d.next_expected_date,
          occurrences: d.occurrences,
          ...(prev ? {} : { status: 'active', user_acknowledged: false }),
        });
      }

      if (upserts.length) {
        const { error: upErr } = await supabase
          .from('detected_subscriptions')
          .upsert(upserts, { onConflict: 'user_id,match_pattern' });
        if (upErr) throw upErr;
      }

      await load();
      if (!silent) {
        if (newCount > 0) toast.success(`${newCount} nova${newCount > 1 ? 's' : ''} assinatura${newCount > 1 ? 's' : ''} detectada${newCount > 1 ? 's' : ''}!`);
        else toast.success('Análise concluída — nada de novo.');
      }
    } catch (e: any) {
      toast.error('Erro ao analisar: ' + (e.message || ''));
    } finally {
      setScanning(false);
    }
  }, [user, load]);

  const updateStatus = async (id: string, status: Status) => {
    const prev = rows;
    setRows(rs => rs.map(r => r.id === id ? { ...r, status, user_acknowledged: true } : r));
    const { error } = await supabase
      .from('detected_subscriptions')
      .update({ status, user_acknowledged: true })
      .eq('id', id);
    if (error) {
      setRows(prev);
      toast.error('Falha ao atualizar');
    } else {
      toast.success(status === 'cancelled' ? 'Marcada como cancelada' : status === 'active' ? 'Reativada' : 'Ignorada');
    }
  };

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search && !r.service_name.toLowerCase().includes(search.toLowerCase()) && !(r.category || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, search]);

  const total = useMemo(() => monthlyTotal(rows), [rows]);
  const activeCount = rows.filter(r => r.status === 'active').length;
  const cancelledCount = rows.filter(r => r.status === 'cancelled').length;
  const cancelledSavings = useMemo(() =>
    monthlyTotal(rows.filter(r => r.status === 'cancelled').map(r => ({ ...r, status: 'active' }))),
    [rows]);
  const newCount = rows.filter(r => !r.user_acknowledged && r.status === 'active').length;
  const yearlyTotal = total * 12;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <SEO title="Assinaturas | KoraFinance" description="Detecte, acompanhe e cancele suas assinaturas recorrentes." />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black truncate" style={{ color: C.textStrong }}>
            Assinaturas
          </h1>
          {newCount > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: C.violetSoft, color: C.violet }}
            >
              {newCount} nova{newCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => scan(false)}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-3.5 h-11 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 active:scale-95"
          style={{
            background: 'transparent',
            border: `1.5px solid ${C.violet}`,
            color: C.violet,
          }}
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{scanning ? 'Analisando…' : 'Analisar agora'}</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 10 }}>
        <Kpi label="Total mensal" value={fmt(total)} icon={<Calendar size={18} />} />
        <Kpi label="No ano" value={fmt(yearlyTotal)} icon={<TrendingDown size={18} />} />
        <Kpi label="Ativas" value={String(activeCount)} icon={<CheckCircle2 size={18} />} />
        <Kpi label="Canceladas" value={String(cancelledCount)} icon={<X size={18} />} />
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'cancelled', 'ignored'] as const).map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95"
                style={{
                  background: active ? C.violet : C.violetSofter,
                  color: active ? C.white : C.textMuted,
                  borderRadius: 99,
                }}
              >
                {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : f === 'cancelled' ? 'Canceladas' : 'Ignoradas'}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textSubtle }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar assinatura..."
            className="w-full pl-10 pr-3 h-11 text-[14px] outline-none focus:ring-2 transition-all"
            style={{
              background: C.white,
              border: `1px solid ${C.borderSoft}`,
              borderRadius: 12,
              color: C.textStrong,
            }}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: C.textMuted }}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div
          className="p-10 text-center"
          style={{ background: C.white, border: `1px dashed ${C.borderSoft}`, borderRadius: 16 }}
        >
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: C.textSubtle }} />
          <p className="font-semibold" style={{ color: C.textStrong }}>
            {rows.length === 0 ? 'Nenhuma assinatura detectada ainda' : 'Nada nesse filtro'}
          </p>
          <p className="text-sm mt-1" style={{ color: C.textMuted }}>
            {rows.length === 0 ? 'Adicione transações ou clique em "Analisar agora".' : 'Tente outro filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {filtered.map(r => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
                style={{
                  background: C.white,
                  border: `1px solid ${C.borderSoft}`,
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  opacity: r.status === 'active' ? 1 : 0.7,
                }}
              >
                <div
                  className="flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ width: 48, height: 48, borderRadius: 12, background: C.violetSofter }}
                >
                  {r.icon || '🔁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold truncate" style={{ fontSize: 15, color: C.textStrong }}>
                      {r.service_name}
                    </p>
                    {!r.user_acknowledged && r.status === 'active' && (
                      <StatusBadge label="NOVA" bg={C.violetSoft} fg={C.violet} />
                    )}
                    {r.status === 'active' && r.user_acknowledged && (
                      <StatusBadge label="ATIVA" bg={C.greenSoft} fg={C.green} />
                    )}
                    {r.status === 'cancelled' && (
                      <StatusBadge label="CANCELADA" bg={C.redSoft} fg={C.red} />
                    )}
                    {r.status === 'ignored' && (
                      <StatusBadge label="IGNORADA" bg="#F3F4F6" fg={C.textMuted} />
                    )}
                  </div>
                  <p className="truncate mt-0.5" style={{ fontSize: 12, color: C.textSubtle }}>
                    {r.category} • {r.occurrences}× • {r.frequency === 'monthly' ? 'mensal' : r.frequency === 'yearly' ? 'anual' : 'semanal'}
                    {r.next_expected_date && r.status === 'active' && (
                      <> • próxima: {format(parseISO(r.next_expected_date), "dd 'de' MMM", { locale: ptBR })}</>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-extrabold leading-none" style={{ fontSize: 16, color: C.violet }}>
                    {fmt(r.estimated_amount)}
                  </p>
                  <p className="mt-1" style={{ fontSize: 11, color: C.textSubtle }}>
                    /{r.frequency === 'monthly' ? 'mês' : r.frequency === 'yearly' ? 'ano' : 'sem'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                  {r.status === 'active' ? (
                    <button
                      onClick={() => updateStatus(r.id, 'cancelled')}
                      title="Marcar como cancelada"
                      className="flex items-center justify-center transition-all active:scale-90 hover:opacity-80"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: C.redSoft,
                        color: C.red,
                        border: 'none',
                      }}
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(r.id, 'active')}
                      className="px-3.5 h-8 transition-all active:scale-95 hover:opacity-80"
                      style={{
                        background: C.violetSoft,
                        color: C.violet,
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                      }}
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Economia ao cancelar */}
      {cancelledSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4"
          style={{
            background: C.greenBg,
            border: `1px solid ${C.greenBorder}`,
            borderRadius: 16,
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 40, height: 40, borderRadius: 12, background: C.greenSoft, color: C.green }}
          >
            <Wallet size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[13px]" style={{ color: C.green }}>
              💡 Economia ao cancelar
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: C.green, opacity: 0.85 }}>
              Você está economizando <strong>{fmt(cancelledSavings)}/mês</strong> — {fmt(cancelledSavings * 12)}/ano
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatusBadge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="font-black tracking-wide"
      style={{
        fontSize: 9,
        padding: '2px 6px',
        borderRadius: 4,
        background: bg,
        color: fg,
      }}
    >
      {label}
    </span>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        padding: 14,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 8, background: C.violetSofter, color: C.violet }}
        >
          {icon}
        </div>
        <p
          className="font-bold uppercase tracking-wide"
          style={{ fontSize: 11, color: C.textSubtle }}
        >
          {label}
        </p>
      </div>
      <p className="font-black leading-tight" style={{ fontSize: 24, color: C.textStrong }}>
        {value}
      </p>
    </div>
  );
}
