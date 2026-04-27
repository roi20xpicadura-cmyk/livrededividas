import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Eye, Sparkles, TrendingUp } from 'lucide-react';
import {
  CATEGORY_EMOJI,
  formatBRL,
  formatBRLShort,
  getCategoryBreakdown,
  getMonthSummary,
  useDemoStore,
} from '../demoStore';

export default function DemoOverview({ onGo }: { onGo: (tab: string) => void }) {
  const state = useDemoStore((s) => s);
  const summary = getMonthSummary(state);
  const breakdown = getCategoryBreakdown(state).slice(0, 5);
  const recent = state.txs.slice(0, 5);
  const totalExp = breakdown.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] md:text-[22px] font-[800] text-[#1A0D35]">Oi, Lucas 👋</h2>
          <p className="text-[12px] md:text-[13px] text-[#7B6A9B]">Aqui está o seu mês</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#166534] text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          ao vivo
        </div>
      </div>

      {/* Saldo card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] p-5 md:p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #1A0D35 0%, #4C1D95 60%, #7C3AED 100%)' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/60 text-[11px] uppercase tracking-wider font-bold">
            <Eye className="w-3 h-3" /> Saldo do mês
          </div>
          <div className="mt-1.5 text-[28px] md:text-[34px] font-[900] tabular-nums">
            {formatBRL(summary.balance)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-white/70">
            <TrendingUp className="w-3.5 h-3.5" />
            +12% vs mês anterior
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10">
            <div>
              <div className="flex items-center gap-1 text-white/60 text-[10px] uppercase tracking-wider font-bold">
                <ArrowUpRight className="w-3 h-3 text-[#86EFAC]" /> Entradas
              </div>
              <div className="text-[16px] md:text-[18px] font-[800] tabular-nums mt-0.5">
                {formatBRL(summary.income)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-white/60 text-[10px] uppercase tracking-wider font-bold">
                <ArrowDownRight className="w-3 h-3 text-[#FCA5A5]" /> Saídas
              </div>
              <div className="text-[16px] md:text-[18px] font-[800] tabular-nums mt-0.5">
                {formatBRL(summary.expenses)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Score + Kora insight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-[16px] p-4 bg-white border border-[rgba(124,58,237,0.12)]">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#7B6A9B]">Score Kora</div>
            <div className="text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded">Bom</div>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-[32px] font-[900] text-[#1A0D35] leading-none tabular-nums">724</div>
            <div className="text-[12px] text-[#7B6A9B] mb-1">/ 1000</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#F0EEFF] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '72.4%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }}
            />
          </div>
        </div>

        <div className="rounded-[16px] p-4 bg-gradient-to-br from-[#F5F3FF] to-white border border-[rgba(124,58,237,0.18)]">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-[#7C3AED]">
            <Sparkles className="w-3 h-3" /> Insight da Kora
          </div>
          <p className="mt-1.5 text-[13px] text-[#1A0D35] leading-snug">
            Você gastou <strong>R$ 171</strong> em delivery essa semana — 23% acima do mês passado. Quer um teto?
          </p>
          <button
            onClick={() => onGo('transactions')}
            className="mt-2 text-[12px] font-bold text-[#7C3AED] hover:underline"
          >
            Ver detalhes →
          </button>
        </div>
      </div>

      {/* Por categoria */}
      <div className="rounded-[16px] p-4 bg-white border border-[rgba(124,58,237,0.12)]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-[800] text-[#1A0D35]">Gastos por categoria</div>
          <button onClick={() => onGo('charts')} className="text-[11px] font-bold text-[#7C3AED]">ver tudo</button>
        </div>
        <div className="space-y-2.5">
          {breakdown.map((b, i) => (
            <div key={b.category}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-[#2A1A4F] font-semibold">
                  {CATEGORY_EMOJI[b.category] ?? '📦'} {b.category}
                </span>
                <span className="text-[#1A0D35] font-bold tabular-nums">{formatBRLShort(b.value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F0EEFF] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.value / totalExp) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? '#7C3AED' : i === 1 ? '#A78BFA' : '#C4B5FD' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recentes */}
      <div className="rounded-[16px] p-4 bg-white border border-[rgba(124,58,237,0.12)]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-[800] text-[#1A0D35]">Últimas movimentações</div>
          <button onClick={() => onGo('transactions')} className="text-[11px] font-bold text-[#7C3AED]">ver tudo</button>
        </div>
        <div className="divide-y divide-[#F0EEFF]">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[14px] flex-shrink-0">
                  {CATEGORY_EMOJI[t.category] ?? '📦'}
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#1A0D35] truncate">{t.description}</div>
                  <div className="text-[10.5px] text-[#7B6A9B]">{t.category} · {t.account}</div>
                </div>
              </div>
              <div className={`text-[13px] font-[800] tabular-nums flex-shrink-0 ${t.amount > 0 ? 'text-[#16A34A]' : 'text-[#1A0D35]'}`}>
                {t.amount > 0 ? '+' : ''}{formatBRL(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
