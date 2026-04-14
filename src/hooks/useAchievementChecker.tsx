import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { toast } from 'sonner';

interface CheckData {
  transactionCount?: number;
  goalsCount?: number;
  goals?: { current_amount: number; target_amount: number }[];
  streakDays?: number;
  monthlyBalance?: number;
  totalSaved?: number;
  totalDebt?: number;
  debtsCount?: number;
  financialScore?: number;
  cardsCount?: number;
  investmentsCount?: number;
  paidDebtsCount?: number;
}

export function useAchievementChecker() {
  const { user } = useAuth();

  const check = useCallback(async (data: CheckData) => {
    if (!user) return;

    const { data: unlocked } = await supabase
      .from('achievements')
      .select('achievement_key')
      .eq('user_id', user.id);

    const unlockedSet = new Set(unlocked?.map(a => a.achievement_key) || []);

    const checks = [
      { key: 'first_transaction', condition: (data.transactionCount || 0) >= 1 },
      { key: 'transactions_50', condition: (data.transactionCount || 0) >= 50 },
      { key: 'transactions_200', condition: (data.transactionCount || 0) >= 200 },
      { key: 'first_goal', condition: (data.goalsCount || 0) >= 1 },
      { key: 'goal_achieved', condition: data.goals?.some(g => g.current_amount >= g.target_amount) },
      { key: 'streak_3', condition: (data.streakDays || 0) >= 3 },
      { key: 'streak_7', condition: (data.streakDays || 0) >= 7 },
      { key: 'streak_30', condition: (data.streakDays || 0) >= 30 },
      { key: 'month_positive', condition: (data.monthlyBalance || 0) > 0 },
      { key: 'saved_1k', condition: (data.totalSaved || 0) >= 1000 },
      { key: 'saved_10k', condition: (data.totalSaved || 0) >= 10000 },
      { key: 'zero_debt', condition: (data.totalDebt || 0) === 0 && (data.debtsCount || 0) > 0 },
      { key: 'score_800', condition: (data.financialScore || 0) >= 800 },
      { key: 'first_card', condition: (data.cardsCount || 0) >= 1 },
      { key: 'first_investment', condition: (data.investmentsCount || 0) >= 1 },
      { key: 'debt_paid', condition: (data.paidDebtsCount || 0) >= 1 },
    ];

    for (const c of checks) {
      if (!unlockedSet.has(c.key) && c.condition) {
        await supabase.from('achievements').insert({
          user_id: user.id,
          achievement_key: c.key,
        });

        const achievement = ACHIEVEMENTS.find(a => a.key === c.key);
        if (achievement) {
          // Update XP
          const { data: cfg } = await supabase
            .from('user_config')
            .select('xp_points')
            .eq('user_id', user.id)
            .single();

          await supabase.from('user_config')
            .update({ xp_points: (cfg?.xp_points || 0) + achievement.xp })
            .eq('user_id', user.id);

          // Show toast
          toast.custom(() => (
            <div className="flex items-center gap-3" style={{
              background: 'var(--color-bg-surface)',
              border: '2px solid var(--color-warning-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '14px 18px',
              boxShadow: '0 8px 32px rgba(217,119,6,0.2)',
              minWidth: 280,
            }}>
              <span style={{ fontSize: 32 }}>{achievement.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-warning-solid)', letterSpacing: '1px', textTransform: 'uppercase' }}>Conquista desbloqueada!</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>{achievement.name}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{achievement.desc}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-warning-solid)', background: 'var(--color-warning-bg)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>+{achievement.xp} XP</span>
            </div>
          ), { duration: 5000 });
        }
      }
    }
  }, [user]);

  return { checkAchievements: check };
}
