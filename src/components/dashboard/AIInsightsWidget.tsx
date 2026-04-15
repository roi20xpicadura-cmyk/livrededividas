import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Insight = {
  type: 'warning' | 'success' | 'info' | 'danger';
  icon: string;
  title: string;
  message: string;
  action_label?: string;
  action_path?: string;
};

// Fixed colors — NO blue, using green design system
const typeStyles: Record<string, { bg: string; border: string; text: string }> = {
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  info: { bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a' },
};

export default function AIInsightsWidget({ onOpenChat }: { onOpenChat: () => void }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [user]);

  if (!loading && insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)', borderRadius: 16, padding: '14px 16px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
          }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-base)' }}>IA Financeira</span>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>PRO</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onOpenChat}
          className="flex items-center gap-1.5"
          style={{
            height: 28, padding: '0 12px', borderRadius: 99, border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <MessageCircle className="w-3 h-3" />
          Conversar
        </motion.button>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-shimmer" style={{ height: 48, borderRadius: 10 }} />
          ))}
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
                  padding: '10px 12px', borderRadius: 10, border: `1px solid ${style.border}`,
                  background: style.bg,
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
      )}
    </motion.div>
  );
}
