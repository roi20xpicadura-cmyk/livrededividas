import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatBRL, useDemoStore } from '../demoStore';

const TYPE_COLORS: Record<string, string> = {
  'Renda Fixa': '#7C3AED',
  'Tesouro': '#A78BFA',
  'Ações': '#16A34A',
  'Cripto': '#F59E0B',
};

export default function DemoInvestments() {
  const investments = useDemoStore((s) => s.investments);
  const total = investments.reduce((a, i) => a + i.value, 0);
  const weightedYield =
    investments.reduce((a, i) => a + i.yieldPct * i.value, 0) / (total || 1);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] md:text-[22px] font-[800] text-[#1A0D35]">Investimentos</h2>
        <p className="text-[12px] md:text-[13px] text-[#7B6A9B]">Carteira consolidada</p>
      </div>

      <div
        className="rounded-[20px] p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A0D35 0%, #4C1D95 100%)' }}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid grid-cols-2 gap-4">
          <div>
            <div className="text-white/60 text-[10.5px] uppercase tracking-wider font-bold">Patrimônio</div>
            <div className="mt-1 text-[26px] font-[900] tabular-nums">{formatBRL(total)}</div>
          </div>
          <div>
            <div className="text-white/60 text-[10.5px] uppercase tracking-wider font-bold">Rendimento mensal</div>
            <div className={`mt-1 text-[20px] font-[900] tabular-nums flex items-center gap-1.5 ${weightedYield >= 0 ? 'text-[#86EFAC]' : 'text-[#FCA5A5]'}`}>
              {weightedYield >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {weightedYield.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição */}
      <div className="rounded-[16px] p-4 bg-white border border-[rgba(124,58,237,0.12)]">
        <div className="text-[13px] font-[800] text-[#1A0D35] mb-3">Distribuição</div>
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          {investments.map((i) => (
            <motion.div
              key={i.id}
              initial={{ width: 0 }}
              animate={{ width: `${(i.value / total) * 100}%` }}
              transition={{ duration: 0.8 }}
              style={{ background: TYPE_COLORS[i.type] }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {Object.entries(
            investments.reduce<Record<string, number>>((acc, i) => {
              acc[i.type] = (acc[i.type] ?? 0) + i.value;
              return acc;
            }, {}),
          ).map(([type, v]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] }} />
              <span className="text-[#2A1A4F] font-semibold">{type}</span>
              <span className="text-[#7B6A9B] tabular-nums ml-auto">{((v / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[16px] bg-white border border-[rgba(124,58,237,0.12)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#F0EEFF] text-[13px] font-[800] text-[#1A0D35]">Ativos</div>
        {investments.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-4 py-3 border-t border-[#F0EEFF] first:border-t-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[i.type] }} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-[#1A0D35] truncate">{i.name}</div>
                <div className="text-[10.5px] text-[#7B6A9B]">{i.type}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[13px] font-[800] text-[#1A0D35] tabular-nums">{formatBRL(i.value)}</div>
              <div className={`text-[10.5px] font-bold tabular-nums ${i.yieldPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {i.yieldPct >= 0 ? '+' : ''}{i.yieldPct.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
