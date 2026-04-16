import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bot, Brain, TrendingUp, Shield, AlertTriangle, CheckCircle2,
  X, ChevronRight, Sparkles, Loader2, RefreshCw, Bell,
} from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_date: string;
  dismissed: boolean;
  action_taken: boolean;
}

const AGENT_NAMES: Record<string, { name: string; emoji: string; color: string }> = {
  budget_exceeded: { name: 'Marie', emoji: '👩‍🔬', color: '#ef4444' },
  budget_warning: { name: 'Marie', emoji: '👩‍🔬', color: '#f59e0b' },
  spending_anomaly: { name: 'Einstein', emoji: '🧑‍🔬', color: '#8b5cf6' },
  category_spike: { name: 'Einstein', emoji: '🧑‍🔬', color: '#8b5cf6' },
  cashflow_negative: { name: 'Galileu', emoji: '🔭', color: '#ef4444' },
  cashflow_tight: { name: 'Galileu', emoji: '🔭', color: '#f59e0b' },
  bill_due_soon: { name: 'Assistente', emoji: '📅', color: '#f59e0b' },
  card_limit: { name: 'Assistente', emoji: '💳', color: '#ef4444' },
  goal_deadline: { name: 'Motivador', emoji: '🎯', color: '#f59e0b' },
  goal_almost: { name: 'Motivador', emoji: '🏆', color: '#16a34a' },
  savings_low: { name: 'Einstein', emoji: '💸', color: '#f59e0b' },
};

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'critical':
      return { bg: '#fef2f2', border: '#fecaca', icon: AlertTriangle, iconColor: '#ef4444' };
    case 'warning':
      return { bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle, iconColor: '#f59e0b' };
    default:
      return { bg: '#f0fdf4', border: '#bbf7d0', icon: Sparkles, iconColor: '#16a34a' };
  }
}

export default function AIAgentsWidget() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('financial-agents', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (error) throw error;
      setAlerts(data?.alerts || []);
    } catch (err) {
      console.error('Agent fetch error:', err);
      // Fallback: load from DB directly
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
      setAlerts(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const dismissAlert = async (alertId: string) => {
    await supabase.from('prediction_alerts')
      .update({ dismissed: true })
      .eq('id', alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    toast.success('Alerta dispensado');
  };

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'warning').length;

  if (loading) {
    return (
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '0.5px solid var(--color-border-weak)',
        borderRadius: 16, padding: 20,
      }}>
        <div className="flex items-center justify-center" style={{ gap: 8, padding: 20 }}>
          <Loader2 style={{ width: 18, height: 18, color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Agentes analisando...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border: '0.5px solid var(--color-border-weak)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '16px 18px 12px' }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot style={{ width: 18, height: 18, color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.3px' }}>
              Agentes IA
            </h3>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Monitorando suas finanças 24/7
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          {criticalCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: 'white',
              background: '#ef4444', borderRadius: 20, padding: '2px 8px',
            }}>
              {criticalCount} urgente{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#92400e',
              background: '#fde68a', borderRadius: 20, padding: '2px 8px',
            }}>
              {warningCount}
            </span>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw style={{
              width: 13, height: 13, color: 'var(--color-text-muted)',
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }} />
          </motion.button>
        </div>
      </div>

      {/* Agent status bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '0 18px 12px',
        overflowX: 'auto',
      }}>
        {[
          { name: 'Marie', emoji: '👩‍🔬', role: 'Orçamentos', active: true },
          { name: 'Einstein', emoji: '🧑‍🔬', role: 'Padrões', active: true },
          { name: 'Galileu', emoji: '🔭', role: 'Fluxo de caixa', active: true },
        ].map((agent) => (
          <div key={agent.name} style={{
            flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 20,
            background: 'var(--color-bg-sunken)',
            border: '0.5px solid var(--color-border-weak)',
          }}>
            <span style={{ fontSize: 14 }}>{agent.emoji}</span>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-strong)' }}>{agent.name}</span>
              <span style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginLeft: 4 }}>{agent.role}</span>
            </div>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: agent.active ? '#16a34a' : '#94a3b8',
              boxShadow: agent.active ? '0 0 4px #16a34a' : 'none',
            }} />
          </div>
        ))}
      </div>

      {/* Alerts */}
      {activeAlerts.length === 0 ? (
        <div style={{ padding: '20px 18px', textAlign: 'center' }}>
          <CheckCircle2 style={{ width: 28, height: 28, color: 'var(--color-green-600)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-strong)' }}>
            Tudo sob controle! ✨
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
            Seus agentes estão monitorando. Nenhum alerta no momento.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <AnimatePresence>
            {activeAlerts.slice(0, 5).map((alert) => {
              const style = getSeverityStyle(alert.severity);
              const agent = AGENT_NAMES[alert.alert_type] || { name: 'IA', emoji: '🤖', color: '#6b7280' };
              const Icon = style.icon;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    background: style.bg,
                    borderBottom: `1px solid ${style.border}`,
                    padding: '12px 18px',
                  }}
                >
                  <div className="flex items-start" style={{ gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${agent.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <span style={{ fontSize: 14 }}>{agent.emoji}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center" style={{ gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {agent.name}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>
                          {alert.triggered_date}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-strong)', marginBottom: 2 }}>
                        {alert.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                        {alert.description}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => dismissAlert(alert.id)}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: 'rgba(0,0,0,0.05)', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <X style={{ width: 12, height: 12, color: 'var(--color-text-subtle)' }} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {activeAlerts.length > 5 && (
        <div style={{ padding: '10px 18px', textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-green-700)', cursor: 'pointer' }}>
            Ver mais {activeAlerts.length - 5} alertas →
          </span>
        </div>
      )}
    </div>
  );
}
