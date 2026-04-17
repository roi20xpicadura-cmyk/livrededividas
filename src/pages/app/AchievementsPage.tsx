import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ACHIEVEMENTS, CATEGORIES, getNextLevelName } from '@/lib/achievements';
import { useAchievements } from '@/hooks/useAchievements';

export default function AchievementsPage() {
  const { unlocked, progress, totalXP, level, count, total } = useAchievements();
  const [filter, setFilter] = useState<string>('todas');

  const filters = useMemo(() => [
    { id: 'todas', label: 'Todas' },
    { id: 'unlocked', label: 'Desbloqueadas' },
    { id: 'locked', label: 'Bloqueadas' },
    ...Object.entries(CATEGORIES).map(([id, cat]) => ({ id, label: cat.label })),
  ], []);

  const filtered = useMemo(() => ACHIEVEMENTS.filter(a => {
    if (filter === 'unlocked') return unlocked.includes(a.id);
    if (filter === 'locked') return !unlocked.includes(a.id);
    if (filter === 'todas') return true;
    return a.category === filter;
  }), [filter, unlocked]);

  const levelPct = Math.max(0, Math.min(100, Math.round(((totalXP - level.min) / (level.max - level.min)) * 100)));
  const nextLevelName = getNextLevelName(level.name);

  return (
    <div style={{ background: '#08080F', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ padding: '20px 20px 0', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 20 }}>
          Conquistas
        </h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'CONQUISTAS', value: `${count}/${total}`, color: '#A78BFA' },
            { label: 'TOTAL XP', value: totalXP.toLocaleString('pt-BR'), color: '#F59E0B' },
            { label: 'NÍVEL', value: level.name, color: '#4ADE80' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#110820',
              border: '1px solid rgba(167,139,250,0.1)',
              borderRadius: 12, padding: 12, textAlign: 'center',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {stat.label}
              </div>
              <div style={{ color: stat.color, fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Level progress */}
        <div style={{ background: '#110820', border: '1px solid rgba(167,139,250,0.1)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{level.emoji}</span>
              <div>
                <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 14 }}>{level.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{totalXP} XP</div>
              </div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'right' }}>
              Próximo nível<br />
              <span style={{ color: '#A78BFA', fontWeight: 700 }}>{level.max} XP</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', borderRadius: 99 }}
            />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 6, textAlign: 'right' }}>
            {levelPct}% para {nextLevelName}
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
          {filters.map(f => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(167,139,250,0.12)'}`,
                  background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: active ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((a, idx) => {
          const isUnlocked = unlocked.includes(a.id);
          const currentProg = progress[a.id] || 0;
          const progPct = a.progress ? Math.min(100, Math.round((currentProg / a.progress.total) * 100)) : 0;

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              style={{
                background: isUnlocked ? 'rgba(124,58,237,0.08)' : '#110820',
                border: `1px solid ${isUnlocked ? 'rgba(124,58,237,0.25)' : 'rgba(167,139,250,0.08)'}`,
                borderRadius: 16,
                padding: 16,
                opacity: isUnlocked ? 1 : 0.75,
                boxShadow: isUnlocked ? '0 0 24px rgba(124,58,237,0.08)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: isUnlocked ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0,
                  filter: isUnlocked ? 'none' : 'grayscale(1)',
                }}>
                  {a.emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <div style={{
                      color: isUnlocked ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                      fontWeight: 700, fontSize: 14,
                    }}>
                      {a.name}
                    </div>
                    <div style={{
                      background: isUnlocked ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isUnlocked ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      color: isUnlocked ? '#F59E0B' : 'rgba(255,255,255,0.25)',
                      flexShrink: 0,
                    }}>
                      +{a.xp} XP
                    </div>
                  </div>

                  <div style={{
                    color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5,
                    marginBottom: a.progress && !isUnlocked ? 10 : 0,
                  }}>
                    {a.description}
                  </div>

                  {a.progress && !isUnlocked && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          {currentProg} de {a.progress.total} {a.progress.label}
                        </span>
                        <span style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700 }}>{progPct}%</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progPct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{ height: '100%', background: '#7C3AED', borderRadius: 99 }}
                        />
                      </div>
                    </div>
                  )}

                  {isUnlocked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <span style={{ color: '#4ADE80', fontSize: 11, fontWeight: 700 }}>
                        ✓ Desbloqueada
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
