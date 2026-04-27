import { motion } from 'framer-motion';
import { Check, CheckCheck, Mic, Plus, Camera, Smile, ArrowRight, Zap, BarChart3, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

const ease = [0.16, 1, 0.3, 1] as const;

type Msg = {
  from: 'user' | 'bot';
  text?: string;
  time: string;
  card?: 'expense' | 'chart' | 'goal';
};

const conversation: Msg[] = [
  { from: 'user', text: 'gastei 84 no mercado agora', time: '14:32' },
  { from: 'bot', text: '✅ Lançado em *Mercado* — R$ 84,00\nSaldo do mês: R$ 3.116', time: '14:32', card: 'expense' },
  { from: 'user', text: 'quanto torrei em delivery esse mês?', time: '14:35' },
  { from: 'bot', card: 'chart', time: '14:35' },
  { from: 'user', text: 'ta longe da meta da viagem?', time: '14:36' },
  { from: 'bot', card: 'goal', time: '14:36' },
];

const prompts = [
  { icon: Receipt, label: '"paguei 250 de luz"', desc: 'Lança despesa instantânea' },
  { icon: BarChart3, label: '"resumo da semana"', desc: 'Gera relatório com gráfico' },
  { icon: Zap, label: '"quanto posso gastar hoje?"', desc: 'IA analisa orçamento e responde' },
];

function ExpenseCard() {
  return (
    <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-[#0f1f17] p-3 max-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide">Despesa lançada</span>
        <Check className="w-3 h-3 text-[#4ade80]" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
          <Receipt className="w-4 h-4 text-[#a78bfa]" />
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-bold text-white leading-tight">Mercado</div>
          <div className="text-[10px] text-white/50">Hoje · 14:32</div>
        </div>
        <div className="text-[13px] font-[900] text-[#f87171]">-R$ 84</div>
      </div>
    </div>
  );
}

function ChartCard() {
  const bars = [40, 70, 55, 90, 45, 65, 80];
  return (
    <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-[#0f1f17] p-3 max-w-[240px]">
      <div className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide mb-1">Delivery · Outubro</div>
      <div className="text-[18px] font-[900] text-white leading-tight">R$ 412,80</div>
      <div className="text-[10px] text-[#f87171] font-semibold mb-2">▲ 23% vs mês anterior</div>
      <div className="flex items-end gap-[3px] h-10">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-[#4ade80]/30 to-[#4ade80]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-white/40 mt-1">
        <span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span><span>D</span>
      </div>
    </div>
  );
}

function GoalCard() {
  return (
    <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-[#0f1f17] p-3 max-w-[230px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide">Meta: Viagem 🏖️</span>
        <span className="text-[10px] font-bold text-[#4ade80]">67%</span>
      </div>
      <div className="w-full h-2 bg-[#1f3a2a] rounded-full overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-[#4ade80] to-[#16a34a] rounded-full" style={{ width: '67%' }} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">R$ 6.700 / R$ 10.000</span>
        <span className="text-[#86efac] font-bold">faltam 4 meses</span>
      </div>
    </div>
  );
}

export default function WhatsAppSection() {
  return (
    <section className="relative py-16 md:py-28 px-4 overflow-hidden bg-gradient-to-b from-[#f0fdf4] via-white to-[#f0fdf4]">
      {/* Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#22c55e]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#4ade80]/10 blur-3xl" />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] mb-5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[11px] font-[800] text-[#15803d] uppercase tracking-[1px]">Exclusivo do KoraFinance</span>
          </div>
          <h2 className="text-[28px] md:text-[48px] font-[900] text-[#0f172a] tracking-[-1px] md:tracking-[-2px] leading-[1.1]">
            Sua vida financeira <br className="hidden md:block" />
            <span className="text-[#16a34a]">no WhatsApp.</span>
          </h2>
          <p className="text-[15px] md:text-[18px] text-[#64748b] mt-4 max-w-[560px] mx-auto leading-[1.6]">
            Mande uma mensagem como manda pra um amigo. A IA lança, calcula, responde — e tudo aparece no seu dashboard.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-10 lg:gap-16 items-center">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="flex justify-center"
          >
            <div className="relative w-[300px] md:w-[340px] aspect-[9/19] rounded-[44px] border-[10px] border-[#0a0a0a] bg-[#0a0a0a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
              {/* side buttons */}
              <div className="absolute -left-[12px] top-[22%] w-[3px] h-8 rounded-l bg-[#1a1a1a]" />
              <div className="absolute -left-[12px] top-[32%] w-[3px] h-14 rounded-l bg-[#1a1a1a]" />
              <div className="absolute -left-[12px] top-[44%] w-[3px] h-14 rounded-l bg-[#1a1a1a]" />
              <div className="absolute -right-[12px] top-[28%] w-[3px] h-20 rounded-r bg-[#1a1a1a]" />

              {/* Screen */}
              <div className="relative w-full h-full rounded-[34px] overflow-hidden flex flex-col bg-[#0b141a]">
                {/* Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[32%] h-[22px] rounded-full bg-black z-20" />

                {/* WhatsApp header */}
                <div className="bg-[#1f2c33] pt-9 pb-2 px-3 flex items-center gap-2.5 border-b border-black/40">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] flex items-center justify-center text-white text-[13px] font-[900] shadow-md">
                    K
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white leading-tight flex items-center gap-1">
                      Kora · IA Financeira
                      <span className="text-[9px] font-bold text-[#0b141a] bg-[#22c55e] px-1 py-[1px] rounded">✓</span>
                    </div>
                    <div className="text-[10px] text-[#86efac] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" /> online
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-hidden px-3 py-3 space-y-2"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 20% 30%, rgba(34,197,94,0.05) 0, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34,197,94,0.04) 0, transparent 50%)',
                    backgroundColor: '#0b141a',
                  }}
                >
                  {conversation.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.12, duration: 0.35 }}
                      className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-lg px-2.5 py-1.5 ${
                          m.from === 'user'
                            ? 'bg-[#005c4b] rounded-tr-sm'
                            : 'bg-[#202c33] rounded-tl-sm'
                        }`}
                      >
                        {m.text && (
                          <p className="text-[12px] text-white leading-snug whitespace-pre-line">{m.text}</p>
                        )}
                        {m.card === 'expense' && <ExpenseCard />}
                        {m.card === 'chart' && <ChartCard />}
                        {m.card === 'goal' && <GoalCard />}
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[9px] text-white/50">{m.time}</span>
                          {m.from === 'user' && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input bar */}
                <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-1.5 pb-4">
                  <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center gap-2">
                    <Smile className="w-4 h-4 text-white/50" />
                    <span className="text-[11px] text-white/40 flex-1">Mensagem</span>
                    <Plus className="w-4 h-4 text-white/50" />
                    <Camera className="w-4 h-4 text-white/50" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#22c55e] flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right side: prompts + features */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[22px] md:text-[28px] font-[900] text-[#0f172a] tracking-[-0.5px] mb-2"
            >
              É só mandar a mensagem.
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="text-[14px] md:text-[15px] text-[#64748b] mb-6 leading-[1.7]"
            >
              Sem app pra abrir, sem categoria pra escolher, sem formulário. Você fala — a Kora entende, lança e mostra na hora.
            </motion.p>

            <div className="space-y-2.5 mb-7">
              {prompts.map((p, i) => (
                <motion.div
                  key={p.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease }}
                  className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#86efac] hover:shadow-[0_8px_24px_rgba(34,197,94,0.12)] transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#22c55e] group-hover:border-[#22c55e] transition-colors">
                    <p.icon className="w-4 h-4 text-[#16a34a] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[#0f172a] truncate">{p.label}</div>
                    <div className="text-[12px] text-[#64748b]">{p.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#cbd5e1] group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all" />
                </motion.div>
              ))}
            </div>

            {/* Mini stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              {[
                { v: '<2s', l: 'resposta média' },
                { v: '24/7', l: 'sempre online' },
                { v: '🇧🇷', l: 'fala português' },
              ].map(s => (
                <div key={s.l} className="text-center p-3 rounded-xl bg-white/60 border border-[#e2e8f0]">
                  <div className="text-[18px] font-[900] text-[#16a34a]">{s.v}</div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">{s.l}</div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/register"
                className="h-[52px] px-6 rounded-[14px] bg-[#16a34a] text-white text-[15px] font-[800] hover:bg-[#15803d] transition-all duration-200 inline-flex items-center justify-center gap-2 hover:-translate-y-0.5"
                style={{ boxShadow: '0 8px 30px rgba(22,163,74,0.35)' }}
              >
                Ativar WhatsApp IA grátis <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="self-center text-[12px] text-[#94a3b8]">
                ✓ Disponível em todos os planos
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}