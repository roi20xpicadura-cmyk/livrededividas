import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { detectSubscriptions, monthlyTotal } from '@/lib/subscriptionDetector';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, AlertCircle, TrendingDown, Search, Wallet, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import type { Database } from '@/integrations/supabase/types';

type DetectedSubscriptionInsert = Database['public']['Tables']['detected_subscriptions']['Insert'];

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
  violetDeep: '#2E1065',
  violetMid: '#4C1D95',
  violetGlow: '#6D28D9',
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
      const upserts: DetectedSubscriptionInsert[] = [];
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
    } catch (e: unknown) {
      toast.error('Erro ao analisar: ' + (e instanceof Error ? e.message : ''));
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

      {/* HERO — Total mensal premium */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="subs-hero relative overflow-hidden"
      >
        <style>{`
          .subs-hero {
            border-radius: 22px;
            padding: 20px 18px 22px;
            background:
              radial-gradient(120% 80% at 0% 0%, rgba(124,58,237,0.45) 0%, rgba(124,58,237,0) 55%),
              linear-gradient(160deg, #1E0B4D 0%, #2E1065 45%, #3B1397 100%);
            box-shadow:
              0 12px 28px -16px rgba(30,11,77,0.55),
              0 2px 8px -2px rgba(30,11,77,0.35);
          }
          @media (min-width: 480px) {
            .subs-hero {
              border-radius: 24px;
              padding: 24px 22px;
              background:
                radial-gradient(110% 80% at 0% 0%, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0) 55%),
                linear-gradient(150deg, #2E1065 0%, #4C1D95 50%, #5B21B6 100%);
              box-shadow:
                0 16px 36px -18px rgba(46,16,101,0.55),
                0 3px 10px -3px rgba(46,16,101,0.4);
            }
          }
          @media (min-width: 768px) {
            .subs-hero {
              padding: 28px 26px;
              background:
                radial-gradient(100% 75% at 0% 0%, rgba(167,139,250,0.32) 0%, rgba(167,139,250,0) 60%),
                linear-gradient(135deg, #2E1065 0%, #4C1D95 45%, #6D28D9 100%);
              box-shadow:
                0 22px 44px -20px rgba(46,16,101,0.6),
                0 4px 12px -4px rgba(46,16,101,0.4);
            }
          }
          @media (prefers-color-scheme: dark) {
            .subs-hero {
              background:
                radial-gradient(110% 80% at 0% 0%, rgba(124,58,237,0.3) 0%, rgba(124,58,237,0) 55%),
                linear-gradient(160deg, #170836 0%, #220A52 50%, #2E1065 100%) !important;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .subs-hero-orb { display: none; }
          }
        `}</style>

        {/* decorative orbs */}
        <div
          aria-hidden
          className="subs-hero-orb absolute pointer-events-none hidden sm:block"
          style={{
            width: 220, height: 220, right: -70, top: -90,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0) 70%)',
          }}
        />
        <div
          aria-hidden
          className="subs-hero-orb absolute pointer-events-none hidden sm:block"
          style={{
            width: 160, height: 160, left: -50, bottom: -70,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0) 70%)',
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  borderRadius: 99,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Sparkles size={11} /> Total mensal
              </span>
              {newCount > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ background: '#fff', color: C.violet }}
                >
                  {newCount} nova{newCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p
              className="font-black mt-3 leading-none tracking-tight"
              style={{ fontSize: 'clamp(34px, 9vw, 44px)', color: '#fff', textShadow: '0 2px 16px rgba(0,0,0,0.15)' }}
            >
              {fmt(total)}
            </p>
            <p className="mt-2 text-[12.5px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <TrendingDown size={12} className="inline -mt-0.5 mr-1" />
              {fmt(yearlyTotal)} por ano · {activeCount} ativa{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => scan(false)}
            disabled={scanning}
            aria-label="Analisar agora"
            className="flex items-center justify-center transition-all disabled:opacity-50 active:scale-90 flex-shrink-0"
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.28)',
              color: '#fff',
            }}
          >
            <RefreshCw className={`w-[18px] h-[18px] ${scanning ? 'animate-spin' : ''}`} strokeWidth={2.5} />
          </button>
        </div>

        {/* Mini KPIs dentro do hero */}
        <div className="relative grid grid-cols-3 gap-2 mt-5">
          <MiniKpi label="Ativas" value={String(activeCount)} />
          <MiniKpi label="Canceladas" value={String(cancelledCount)} />
          <MiniKpi label="No ano" value={fmt(yearlyTotal).replace('R$ ', 'R$')} small />
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
          {(['all', 'active', 'cancelled', 'ignored'] as const).map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 text-[13px] font-semibold transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? C.violet : C.white,
                  color: active ? C.white : C.textMuted,
                  border: active ? 'none' : `1px solid ${C.borderSoft}`,
                  boxShadow: active ? '0 6px 16px -6px rgba(124,58,237,0.45)' : 'none',
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

function MiniKpi({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(10px)',
        borderRadius: 14,
        padding: '10px 12px',
      }}
    >
      <p
        className="font-semibold uppercase tracking-wider"
        style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.78)' }}
      >
        {label}
      </p>
      <p
        className="font-black leading-none mt-1.5"
        style={{ fontSize: small ? 14 : 18, color: '#fff' }}
      >
        {value}
      </p>
    </div>
  );
}
