import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENTS, getLevel } from '@/lib/achievements';

export function useAchievements() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const calculateProgress = useCallback(async (uid: string) => {
    const prog: Record<string, number> = {};

    const { data: txs } = await supabase
      .from('transactions')
      .select('date, type, amount, source')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    const total = txs?.length || 0;
    prog['launches_10'] = Math.min(total, 10);
    prog['launches_100'] = Math.min(total, 100);

    const waTxs = (txs || []).filter((t: any) => t.source === 'whatsapp').length;
    prog['whatsapp_10'] = Math.min(waTxs, 10);

    // Streak: consecutive days ending today
    const dates = [...new Set((txs || []).map((t: any) => t.date as string))].sort().reverse();
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < dates.length; i++) {
      const expected = checkDate.toISOString().split('T')[0];
      if (dates[i] === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Allow starting from yesterday if no entry today
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterday = checkDate.toISOString().split('T')[0];
        if (dates[i] === yesterday) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      } else break;
    }
    prog['streak_3'] = Math.min(streak, 3);
    prog['streak_7'] = Math.min(streak, 7);
    prog['streak_30'] = Math.min(streak, 30);

    // Positive months streak
    try {
      const { data: monthStats } = await supabase.rpc('get_monthly_balances' as any, { p_user_id: uid });
      let positive = 0;
      for (const m of (monthStats || []) as any[]) {
        if (Number(m.balance) > 0) positive++;
        else break;
      }
      prog['positive_3months'] = Math.min(positive, 3);
    } catch {
      prog['positive_3months'] = 0;
    }

    // Goals completed
    const { data: goals } = await supabase
      .from('goals')
      .select('current_amount, target_amount')
      .eq('user_id', uid)
      .is('deleted_at', null);
    const completed = (goals || []).filter((g: any) => Number(g.current_amount) >= Number(g.target_amount)).length;
    if (completed > 0) prog['goal_complete'] = 1;

    setProgress(prog);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: achieved } = await supabase
        .from('achievements')
        .select('achievement_key')
        .eq('user_id', user.id);
      if (!active) return;
      const ids = (achieved || []).map((a: any) => a.achievement_key);
      setUnlocked(ids);
      await calculateProgress(user.id);
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user, calculateProgress]);

  const totalXP = ACHIEVEMENTS
    .filter(a => unlocked.includes(a.id))
    .reduce((sum, a) => sum + a.xp, 0);

  return {
    unlocked,
    progress,
    totalXP,
    level: getLevel(totalXP),
    loading,
    count: unlocked.length,
    total: ACHIEVEMENTS.length,
  };
}
