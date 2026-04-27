import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { demoStore, formatBRL, formatBRLShort, useDemoStore } from '../demoStore';

export default function DemoGoals() {
  const goals = useDemoStore((s) => s.goals);
  const [contributing, setContributing] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [creating, setCreating] = useState(false);

  const total = goals.reduce((a, g) => a + g.current, 0);
  const totalTarget = goals.reduce((a, g) => a + g.target, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] md:text-[22px] font-[800] text-[#1A0D35]">Metas</h2>
          <p className="text-[12px] md:text-[13px] text-[#7B6A9B]">{goals.length} metas ativas</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7C3AED] text-white text-[12.5px] font-bold hover:bg-[#6D28D9] transition-colors"
          style={{ boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}
        >
          <Plus className="w-4 h-4" /> Nova meta
        </button>
      </div>

      {/* Progresso geral */}
      <div
        className="rounded-[20px] p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)' }}
      >
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="text-white/60 text-[10.5px] uppercase tracking-wider font-bold">Progresso total</div>
          <div className="mt-1 text-[26px] font-[900] tabular-nums">
            {formatBRL(total)} <span className="text-white/50 text-[14px] font-bold">/ {formatBRLShort(totalTarget)}</span>
          </div>
          <div className="mt-3 h-2 bg-white/15 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(total / totalTarget) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          return (
            <div key={g.id} className="rounded-[16px] p-4 bg-white border border-[rgba(124,58,237,0.12)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] leading-none">{g.emoji}</div>
                  <div>
                    <div className="text-[13.5px] font-[800] text-[#1A0D35]">{g.title}</div>
                    <div className="text-[10.5px] text-[#7B6A9B]">até {g.due}</div>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full tabular-nums">
                  {pct.toFixed(0)}%
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#F0EEFF] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }}
                />
              </div>
              <div className="mt-2 flex items-end justify-between text-[12px]">
                <div className="text-[#7B6A9B]">
                  <span className="text-[#1A0D35] font-[800] tabular-nums">{formatBRLShort(g.current)}</span>
                  <span className="text-[#7B6A9B]"> / {formatBRLShort(g.target)}</span>
                </div>
                <button
                  onClick={() => { setContributing(g.id); setContribAmount(''); }}
                  className="text-[11.5px] font-bold text-[#7C3AED] hover:underline"
                >
                  + aportar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {contributing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setContributing(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-[800] text-[#1A0D35]">Aportar na meta</h3>
                <button onClick={() => setContributing(null)} className="p-1 rounded-lg hover:bg-[#F0EEFF]">
                  <X className="w-4 h-4 text-[#7B6A9B]" />
                </button>
              </div>
              <div className="flex items-center px-3 py-2.5 rounded-xl border border-[rgba(124,58,237,0.18)] focus-within:border-[#7C3AED]">
                <span className="text-[18px] font-[800] text-[#7B6A9B] mr-1.5">R$</span>
                <input
                  autoFocus
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="flex-1 text-[20px] font-[800] text-[#1A0D35] focus:outline-none placeholder:text-[#B8A8D8] tabular-nums"
                />
              </div>
              <button
                onClick={() => {
                  const v = parseFloat(contribAmount.replace(',', '.'));
                  if (v > 0) demoStore.contributeGoal(contributing!, v);
                  setContributing(null);
                }}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[13.5px] font-[800] hover:bg-[#6D28D9]"
              >
                Aportar
              </button>
            </motion.div>
          </motion.div>
        )}

        {creating && (
          <NewGoalSheet onClose={() => setCreating(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewGoalSheet({ onClose }: { onClose: () => void }) {
  const [emoji, setEmoji] = useState('🎯');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [due, setDue] = useState('Dez/2026');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-[800] text-[#1A0D35]">Nova meta</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F0EEFF]">
            <X className="w-4 h-4 text-[#7B6A9B]" />
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          {['🎯','🏖️','🚗','🏠','💍','📱','🛡️','✈️'].map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-lg text-[18px] flex items-center justify-center border ${
                emoji === e ? 'bg-[#F5F3FF] border-[#7C3AED]' : 'border-[rgba(124,58,237,0.12)]'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome da meta"
          className="w-full px-3 py-2.5 rounded-xl border border-[rgba(124,58,237,0.18)] text-[13px] text-[#1A0D35] focus:outline-none focus:border-[#7C3AED] mb-2"
        />
        <div className="flex items-center px-3 py-2.5 rounded-xl border border-[rgba(124,58,237,0.18)] mb-2">
          <span className="text-[14px] font-[800] text-[#7B6A9B] mr-1.5">R$</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Valor alvo"
            inputMode="decimal"
            className="flex-1 text-[14px] font-bold text-[#1A0D35] focus:outline-none placeholder:text-[#B8A8D8] tabular-nums"
          />
        </div>
        <input
          value={due}
          onChange={(e) => setDue(e.target.value)}
          placeholder="Prazo (Ex: Dez/2026)"
          className="w-full px-3 py-2.5 rounded-xl border border-[rgba(124,58,237,0.18)] text-[13px] text-[#1A0D35] focus:outline-none focus:border-[#7C3AED]"
        />
        <button
          onClick={() => {
            const t = parseFloat(target.replace(',', '.'));
            if (!title.trim() || !t) return;
            demoStore.addGoal({ emoji, title: title.trim(), target: t, due });
            onClose();
          }}
          className="w-full mt-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[13.5px] font-[800] hover:bg-[#6D28D9]"
        >
          Criar meta
        </button>
      </motion.div>
    </motion.div>
  );
}
