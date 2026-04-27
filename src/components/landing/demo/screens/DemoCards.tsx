import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';
import { formatBRL, useDemoStore } from '../demoStore';

export default function DemoCards() {
  const cards = useDemoStore((s) => s.cards);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] md:text-[22px] font-[800] text-[#1A0D35]">Cartões</h2>
        <p className="text-[12px] md:text-[13px] text-[#7B6A9B]">{cards.length} cartões conectados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => {
          const pct = (c.used / c.limit) * 100;
          return (
            <div
              key={c.id}
              className="relative rounded-[20px] p-5 text-white overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${c.color} 0%, #1A0D35 100%)` }}
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between mb-6">
                <div>
                  <div className="text-white/60 text-[10.5px] uppercase tracking-wider font-bold">{c.brand}</div>
                  <div className="text-[15px] font-[800] mt-0.5">{c.name}</div>
                </div>
                <CreditCard className="w-6 h-6 text-white/70" />
              </div>
              <div className="relative">
                <div className="flex items-end justify-between text-[11px] text-white/70 mb-1.5">
                  <span>Fatura aberta</span>
                  <span className="tabular-nums">{formatBRL(c.used)} / {formatBRL(c.limit)}</span>
                </div>
                <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-[11px] text-white/70">
                  <span>Fecha dia {c.closing}</span>
                  <span>Vence dia {c.due}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[16px] p-4 bg-white border border-[rgba(124,58,237,0.12)]">
        <div className="text-[13px] font-[800] text-[#1A0D35] mb-3">Resumo</div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Limite total" value={cards.reduce((a, c) => a + c.limit, 0)} />
          <Stat label="Usado" value={cards.reduce((a, c) => a + c.used, 0)} />
          <Stat label="Disponível" value={cards.reduce((a, c) => a + c.limit - c.used, 0)} accent />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider font-bold text-[#7B6A9B]">{label}</div>
      <div className={`mt-1 text-[15px] md:text-[17px] font-[800] tabular-nums ${accent ? 'text-[#16A34A]' : 'text-[#1A0D35]'}`}>
        {formatBRL(value)}
      </div>
    </div>
  );
}
