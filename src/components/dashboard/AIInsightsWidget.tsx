import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, ArrowRight, AlertTriangle, CheckCircle2, Info, TrendingDown } from 'lucide-react';
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

const typeStyles: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
  danger: { bg: 'bg-red-50/80 dark:bg-red-900/10', border: 'border-red-200/60 dark:border-red-800/30', text: 'text-red-800 dark:text-red-300', iconColor: 'text-red-500' },
  warning: { bg: 'bg-amber-50/80 dark:bg-amber-900/10', border: 'border-amber-200/60 dark:border-amber-800/30', text: 'text-amber-800 dark:text-amber-300', iconColor: 'text-amber-500' },
  success: { bg: 'bg-emerald-50/80 dark:bg-emerald-900/10', border: 'border-emerald-200/60 dark:border-emerald-800/30', text: 'text-emerald-800 dark:text-emerald-300', iconColor: 'text-emerald-500' },
  info: { bg: 'bg-blue-50/80 dark:bg-blue-900/10', border: 'border-blue-200/60 dark:border-blue-800/30', text: 'text-blue-800 dark:text-blue-300', iconColor: 'text-blue-500' },
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)', borderRadius: 16, padding: '16px 20px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-base)' }}>IA Financeira</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-[#16a34a]/8 text-[#16a34a] px-1.5 py-0.5 rounded-md">PRO</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onOpenChat}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-white text-[11px] font-bold"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
        >
          <MessageCircle className="w-3 h-3" />
          Conversar
        </motion.button>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-shimmer" style={{ height: 56, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const style = typeStyles[insight.type] || typeStyles.info;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border backdrop-blur-sm ${style.bg} ${style.border}`}
              >
                <span className="text-lg flex-shrink-0 leading-none mt-0.5">{insight.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold ${style.text} leading-tight`}>{insight.title}</p>
                  <p className={`text-[11px] ${style.text} opacity-80 leading-relaxed mt-0.5`}>{insight.message}</p>
                </div>
                {insight.action_label && insight.action_path && (
                  <a href={insight.action_path}
                    className={`flex-shrink-0 text-[10px] font-bold ${style.text} border ${style.border} rounded-lg px-2 py-1 hover:opacity-80 transition-opacity`}>
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
