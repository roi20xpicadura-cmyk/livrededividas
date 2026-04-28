import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, RefreshCw, X, CheckCircle2, BarChart3, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import koalaMascot from '@/assets/koala-mascot.png';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  alertTypeToDisplayMode,
  insightTypeToDisplayMode,
  getDisplayMeta,
  insightHash,
  titleCaseName,
  type KoraDisplayMode,
} from '@/lib/koraDisplay';

type Insight = {
  type: 'warning' | 'success' | 'info' | 'danger';
  icon: string;
  title: string;
  message: string;
  action_label?: string;
  action_path?: string;
};

interface AgentAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  triggered_date: string;
  dismissed: boolean | null;
}

/** Unified card model — works for both AI insights and agent alerts */
type CardItem = {
  key: string;
  hash: string;
  mode: KoraDisplayMode;
  title: string;
  message: string;
  action_label?: string;
  action_path?: string;
  // Optional dismiss handler (only for agent alerts)
  onDismiss?: () => void;
};

const MODE_ICONS: Record<KoraDisplayMode, typeof BarChart3> = {
  analysis: BarChart3,
  alert: AlertTriangle,
  projection: TrendingUp,
};

const MAX_HOME_CARDS = 3;

function InsightCard({ item, index }: { item: CardItem; index: number }) {
  const meta = getDisplayMeta(item.mode);
  const Icon = MODE_ICONS[item.mode];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        position: 'relative',
        padding: '14px 14px 14px 16px',
        borderRadius: 14,
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-weak)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        overflow: 'hidden',
      }}
    >
      {/* Left accent stripe */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0,
          width: 3,
          background: `linear-gradient(180deg, ${meta.accentHsl}, ${meta.accentHsl}55)`,
        }}
      />
      {/* Icon chip */}
      <div
        style={{
          width: 38, height: 38, borderRadius: 11,
          background: `linear-gradient(135deg, ${meta.accentHsl}1f, ${meta.accentHsl}0a)`,
          border: `1px solid ${meta.accentHsl}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 17, height: 17, color: meta.accentHsl }} strokeWidth={2.4} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.7px',
          color: meta.accentHsl, textTransform: 'uppercase', marginBottom: 4,
        }}>
          {meta.label} · Kora
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)', lineHeight: 1.3, margin: 0 }}>
          {item.title}
        </p>
        {item.message && (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45, marginTop: 4, margin: 0 }}>
            {item.message}
          </p>
        )}
        {item.action_label && item.action_path && (
          <a
            href={item.action_path}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, fontSize: 12, fontWeight: 700,
              color: meta.accentHsl, textDecoration: 'none',
            }}
          >
            {item.action_label} <ChevronRight style={{ width: 12, height: 12 }} />
          </a>
        )}
      </div>

      {/* Optional dismiss */}
      {item.onDismiss && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={item.onDismiss}
          aria-label="Dispensar"
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--color-bg-sunken)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <X style={{ width: 12, height: 12, color: 'var(--color-text-subtle)' }} />
        </motion.button>
      )}
    </motion.div>
  );
}

export default function AIInsightsWidget({ onOpenChat }: { onOpenChat: () => void }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [agentAlerts, setAgentAlerts] = useState<AgentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Fetch AI insights
  useEffect(() => {
    if (!user) return;
    const fetchInsights = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
          { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (Array.isArray(data)) setInsights(data);
      } catch (e) {
        console.error('AI insights error:', e);
      }
    };
    fetchInsights();
  }, [user]);

  // Fetch agent alerts
  const fetchAgents = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('financial-agents', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setAgentAlerts(data?.alerts || []);
    } catch {
      // Fallback: load from DB
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from('prediction_alerts')
        .select('*')
        .eq('user_id', user.id)
        .gte('triggered_date', sevenDaysAgo.toISOString().split('T')[0])
        .eq('dismissed', false)
        .order('triggered_date', { ascending: false })
        .limit(10);
      setAgentAlerts(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const dismissAlert = useCallback(async (alertId: string) => {
    await supabase.from('prediction_alerts').update({ dismissed: true }).eq('id', alertId);
    setAgentAlerts((prev) => prev.filter((a) => a.id !== alertId));
    toast.success('Alerta dispensado');
  }, []);

  /** Combine insights + alerts → unified, deduplicated card list */
  const allCards = useMemo<CardItem[]>(() => {
    const seen = new Set<string>();
    const out: CardItem[] = [];

    // Agent alerts first (more actionable / time-sensitive)
    for (const alert of agentAlerts.filter((a) => !a.dismissed)) {
      const title = titleCaseName(alert.title);
      const message = alert.description || '';
      const hash = insightHash(title, message);
      if (seen.has(hash)) continue;
      seen.add(hash);
      out.push({
        key: `alert-${alert.id}`,
        hash,
        mode: alertTypeToDisplayMode(alert.alert_type),
        title,
        message,
        onDismiss: () => dismissAlert(alert.id),
      });
    }

    // Then AI insights
    for (let i = 0; i < insights.length; i++) {
      const ins = insights[i];
      const title = titleCaseName(ins.title);
      const message = ins.message || '';
      const hash = insightHash(title, message);
      if (seen.has(hash)) continue;
      seen.add(hash);
      out.push({
        key: `insight-${i}-${hash}`,
        hash,
        mode: insightTypeToDisplayMode(ins.type),
        title,
        message,
        action_label: ins.action_label,
        action_path: ins.action_path,
      });
    }

    return out;
  }, [agentAlerts, insights, dismissAlert]);

  const visibleCards = showAll ? allCards : allCards.slice(0, MAX_HOME_CARDS);
  const hiddenCount = allCards.length - MAX_HOME_CARDS;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-weak)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -20px rgba(124,58,237,0.22)',
      }}
    >
      {/* Clean Header — purple gradient, single row */}
      <div
        style={{
          position: 'relative',
          padding: '12px 14px',
          background: 'linear-gradient(135deg, #2a0f5f 0%, #5b21b6 60%, #7c3aed 100%)',
          overflow: 'hidden',
        }}
      >
        {/* subtle top sheen */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            pointerEvents: 'none',
          }}
        />

        <div className="flex items-center justify-between gap-2" style={{ position: 'relative', zIndex: 1 }}>
          {/* Left: koala + title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 3, flexShrink: 0,
            }}>
              <img
                src={koalaMascot}
                alt="Koala"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ minWidth: 0 }} className="min-w-0">
              <div
                style={{
                  fontSize: 14, fontWeight: 800, color: '#fff',
                  letterSpacing: '-0.2px', lineHeight: 1.15,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                Kora IA
              </div>
              <div
                style={{
                  fontSize: 10.5, color: 'rgba(255,255,255,0.65)',
                  fontWeight: 500, marginTop: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                Análises em tempo real
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => fetchAgents(true)}
              disabled={refreshing}
              aria-label="Atualizar insights"
              style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RefreshCw style={{
                width: 13, height: 13, color: '#fff',
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onOpenChat}
              className="flex items-center gap-1.5"
              style={{
                height: 30, padding: '0 12px', borderRadius: 99, border: 'none',
                background: '#fff',
                color: '#5b21b6', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Conversar
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 14px 14px' }}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: 64, borderRadius: 12 }} />
            ))}
          </div>
        ) : allCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 style={{ width: 28, height: 28, color: 'hsl(var(--primary))', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-strong)' }}>Tudo sob controle ✨</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Kora monitora seus dados 24/7</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence initial={false}>
              {visibleCards.map((card, i) => (
                <InsightCard key={card.key} item={card} index={i} />
              ))}
            </AnimatePresence>

            {hiddenCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => setShowAll((v) => !v)}
                style={{
                  marginTop: 6, padding: '12px 14px', borderRadius: 12,
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.04))',
                  border: '1px solid hsl(var(--primary) / 0.25)',
                  fontSize: 12.5, fontWeight: 800, color: 'hsl(var(--primary))',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {showAll
                  ? 'Mostrar menos'
                  : <>Ver todos os insights ({allCards.length}) <ChevronRight style={{ width: 13, height: 13 }} /></>}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}
