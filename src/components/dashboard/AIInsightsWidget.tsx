import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageCircle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

const typeStyles: Record<string, { bg: string; border: string; text: string }> = {
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  success: { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  info: { bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a' },
};

const AGENT_META: Record<string, { name: string; emoji: string }> = {
  budget_exceeded: { name: 'Marie', emoji: '👩‍🔬' },
  budget_warning: { name: 'Marie', emoji: '👩‍🔬' },
  spending_anomaly: { name: 'Einstein', emoji: '🧑‍🔬' },
  category_spike: { name: 'Einstein', emoji: '🧑‍🔬' },
  cashflow_negative: { name: 'Galileu', emoji: '🔭' },
  cashflow_tight: { name: 'Galileu', emoji: '🔭' },
  bill_due_soon: { name: 'Assistente', emoji: '📅' },
  card_limit: { name: 'Assistente', emoji: '💳' },
  goal_deadline: { name: 'Motivador', emoji: '🎯' },
  goal_almost: { name: 'Motivador', emoji: '🏆' },
  savings_low: { name: 'Einstein', emoji: '💸' },
};

function severityToType(severity: string): string {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'info';
}

export default function AIInsightsWidget({ onOpenChat }: { onOpenChat: () => void }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [agentAlerts, setAgentAlerts] = useState<AgentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'insights' | 'agents'>('agents');

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
        if (Array.isArray(data)) setInsights(data.slice(0, 4));
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

  const dismissAlert = async (alertId: string) => {
    await supabase.from('prediction_alerts').update({ dismissed: true }).eq('id', alertId);
    setAgentAlerts((prev) => prev.filter((a) => a.id !== alertId));
    toast.success('Alerta dispensado');
  };

  const activeAlerts = agentAlerts.filter((a) => !a.dismissed);
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;

  // Combine: show agent tab by default if there are alerts, otherwise insights
  const hasAlerts = activeAlerts.length > 0;
  const hasInsights = insights.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)', borderRadius: 16, overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '14px 16px 0' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(124, 58, 237,0.25)',
          }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-base)' }}>IA Financeira</span>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'rgba(124, 58, 237,0.08)', color: '#7C3AED' }}>AGENTE</span>
          {criticalCount > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: 'white',
              background: '#ef4444', borderRadius: 20, padding: '1px 6px',
            }}>
              {criticalCount}
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 4 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchAgents(true)}
            disabled={refreshing}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw style={{
              width: 12, height: 12, color: 'var(--color-text-muted)',
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onOpenChat}
            className="flex items-center gap-1.5"
            style={{
              height: 28, padding: '0 12px', borderRadius: 99, border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <MessageCircle className="w-3 h-3" />
            Conversar
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ padding: '10px 16px 0', gap: 4 }}>
        <button
          onClick={() => setTab('agents')}
          style={{
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: tab === 'agents' ? 'var(--color-green-100, rgba(124, 58, 237,0.1))' : 'transparent',
            color: tab === 'agents' ? 'var(--color-green-700, #7C3AED)' : 'var(--color-text-muted)',
          }}
        >
          <span style={{ marginRight: 4 }}>🤖</span>
          Agentes {hasAlerts && <span style={{ fontSize: 9, fontWeight: 800, background: '#fde68a', color: '#92400e', borderRadius: 10, padding: '1px 5px', marginLeft: 4 }}>{activeAlerts.length}</span>}
        </button>
        <button
          onClick={() => setTab('insights')}
          style={{
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: tab === 'insights' ? 'var(--color-green-100, rgba(124, 58, 237,0.1))' : 'transparent',
            color: tab === 'insights' ? 'var(--color-green-700, #7C3AED)' : 'var(--color-text-muted)',
          }}
        >
          <span style={{ marginRight: 4 }}>💡</span>
          Insights
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '10px 16px 14px' }}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-shimmer" style={{ height: 48, borderRadius: 10 }} />
            ))}
          </div>
        ) : tab === 'agents' ? (
          /* ━━━ AGENTS TAB ━━━ */
          <>
            {/* Agent status chips */}
            <div className="flex" style={{ gap: 4, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                { name: 'Marie', emoji: '👩‍🔬', role: 'Orçamentos' },
                { name: 'Einstein', emoji: '🧑‍🔬', role: 'Padrões' },
                { name: 'Galileu', emoji: '🔭', role: 'Fluxo' },
              ].map((a) => (
                <div key={a.name} className="flex items-center" style={{
                  flex: '0 0 auto', gap: 4, padding: '4px 8px', borderRadius: 16,
                  background: 'var(--color-bg-sunken)', border: '0.5px solid var(--color-border-weak)',
                }}>
                  <span style={{ fontSize: 12 }}>{a.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-strong)' }}>{a.name}</span>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED', boxShadow: '0 0 4px #7C3AED' }} />
                </div>
              ))}
            </div>

            {activeAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle2 style={{ width: 24, height: 24, color: 'var(--color-green-600)', margin: '0 auto 6px' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-strong)' }}>Tudo sob controle ✨</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>Agentes monitorando 24/7</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {activeAlerts.slice(0, 4).map((alert) => {
                    const sType = severityToType(alert.severity);
                    const style = typeStyles[sType] || typeStyles.info;
                    const agent = AGENT_META[alert.alert_type] || { name: 'IA', emoji: '🤖' };

                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2.5"
                        style={{
                          padding: '10px 12px', borderRadius: 10,
                          border: `1px solid ${style.border}`, background: style.bg,
                        }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{agent.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center" style={{ gap: 4, marginBottom: 2 }}>
                            <span style={{ fontSize: 8, fontWeight: 800, color: style.text, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 }}>{agent.name}</span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: style.text, lineHeight: 1.3 }}>{alert.title}</p>
                          <p style={{ fontSize: 11, color: style.text, opacity: 0.75, lineHeight: 1.4, marginTop: 2 }}>{alert.description}</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => dismissAlert(alert.id)}
                          style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: 'rgba(0,0,0,0.05)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <X style={{ width: 10, height: 10, color: style.text, opacity: 0.5 }} />
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          /* ━━━ INSIGHTS TAB ━━━ */
          !hasInsights ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <Sparkles style={{ width: 24, height: 24, color: 'var(--color-green-600)', margin: '0 auto 6px' }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-strong)' }}>Sem insights ainda</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>Adicione lançamentos para a IA analisar</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {insights.map((insight, i) => {
                const style = typeStyles[insight.type] || typeStyles.info;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-2.5"
                    style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${style.border}`, background: style.bg,
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{insight.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: style.text, lineHeight: 1.3 }}>{insight.title}</p>
                      <p style={{ fontSize: 11, color: style.text, opacity: 0.75, lineHeight: 1.4, marginTop: 2 }}>{insight.message}</p>
                    </div>
                    {insight.action_label && insight.action_path && (
                      <a href={insight.action_path}
                        style={{
                          flexShrink: 0, fontSize: 10, fontWeight: 700, color: style.text,
                          border: `1px solid ${style.border}`, borderRadius: 8, padding: '4px 8px',
                          textDecoration: 'none',
                        }}>
                        {insight.action_label}
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
