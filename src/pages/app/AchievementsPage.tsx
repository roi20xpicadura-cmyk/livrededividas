import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENTS, LEVELS, getCurrentLevel, getXPToNextLevel, getNextLevel } from '@/lib/achievements';
import { Trophy, Lock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function AchievementsPage() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [xp, setXp] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (!user) return;
    supabase.from('achievements').select('*').eq('user_id', user.id)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((a: any) => { map[a.achievement_key] = a.unlocked_at; });
        setUnlocked(map);
      });
    supabase.from('user_config').select('xp_points').eq('user_id', user.id).single()
      .then(({ data }) => setXp(data?.xp_points || 0));
  }, [user]);

  const level = getCurrentLevel(xp);
  const nextLevel = getNextLevel(xp);
  const xpToNext = getXPToNextLevel(xp);
  const xpProgress = nextLevel ? ((xp - level.minXP) / (nextLevel.minXP - level.minXP)) * 100 : 100;
  const unlockedCount = Object.keys(unlocked).length;

  const filtered = useMemo(() => {
    if (filter === 'unlocked') return ACHIEVEMENTS.filter(a => unlocked[a.key]);
    if (filter === 'locked') return ACHIEVEMENTS.filter(a => !unlocked[a.key]);
    return [...ACHIEVEMENTS].sort((a, b) => {
      const aU = !!unlocked[a.key], bU = !!unlocked[b.key];
      if (aU !== bU) return aU ? -1 : 1;
      return 0;
    });
  }, [filter, unlocked]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="p-7 flex flex-col gap-5 max-w-[1400px] mx-auto">
        {/* Header stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Conquistas</p>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{unlockedCount}/{ACHIEVEMENTS.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Total XP</p>
            <p className="text-2xl font-black" style={{ color: '#16a34a' }}>{xp}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Nível</p>
            <p className="text-2xl font-black" style={{ color: level.color }}>{level.name}</p>
          </div>
        </div>

        {/* Level progress */}
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" style={{ color: level.color }} />
              <span className="text-lg font-black" style={{ color: level.color }}>{level.name}</span>
            </div>
            {nextLevel && <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>Faltam {xpToNext} XP para {nextLevel.name}</span>}
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <motion.div initial={{ width: '0%' }} animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full" style={{ background: level.color }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-hint)' }}>{xp} XP</span>
            {nextLevel && <span className="text-[11px] font-bold" style={{ color: 'var(--text-hint)' }}>{nextLevel.minXP} XP</span>}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: filter === f ? '#f0fdf4' : 'var(--bg-surface)',
                color: filter === f ? '#16a34a' : 'var(--text-secondary)',
                border: filter === f ? '1.5px solid #d4edda' : '1.5px solid var(--border-default)',
              }}>
              {f === 'all' ? 'Todas' : f === 'unlocked' ? 'Desbloqueadas' : 'Bloqueadas'}
            </button>
          ))}
        </div>

        {/* Achievements grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a, i) => {
            const isUnlocked = !!unlocked[a.key];
            return (
              <motion.div key={a.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-[14px] relative overflow-hidden"
                style={{
                  background: isUnlocked ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  border: `1.5px solid ${isUnlocked ? '#d4edda' : 'var(--border-default)'}`,
                  filter: isUnlocked ? 'none' : 'grayscale(0.5)',
                  opacity: isUnlocked ? 1 : 0.7,
                }}>
                {!isUnlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4" style={{ color: 'var(--text-hint)' }} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{a.emoji}</span>
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isUnlocked ? a.desc : '???'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#16a34a' }}>+{a.xp} XP</span>
                  {isUnlocked && unlocked[a.key] && (
                    <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                      {format(new Date(unlocked[a.key]), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
