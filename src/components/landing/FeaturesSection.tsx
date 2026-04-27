import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap, Home, BarChart3, Wallet, User, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;
const cardBase = "rounded-[16px] md:rounded-[20px] border border-[#e2e8f0] p-5 md:p-8 overflow-hidden relative transition-all duration-300 hover:border-[#C4B5FD] hover:-translate-y-[3px]";

function BentoCard({ children, className, index = 0 }: { children: React.ReactNode; className?: string; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5, ease }}
      className={`${cardBase} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="recursos" className="py-16 md:py-28 px-4 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-14">
          <h2 className="text-[28px] md:text-[48px] font-[900] text-[#0f172a] tracking-[-1px] md:tracking-[-2px]">Tudo que você precisa.</h2>
          <p className="text-[16px] md:text-[20px] text-[#64748b] mt-2">Nada do que você não precisa.</p>
        </motion.div>

        {/* Mobile: single column. Desktop: 12-col bento */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {/* AI Card */}
          <BentoCard className="md:col-span-7 bg-gradient-to-br from-[#F5F3FF] to-white" index={0}>
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <div className="w-9 md:w-11 h-9 md:h-11 rounded-full bg-[#7C3AED] flex items-center justify-center">
                <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-white" />
              </div>
              <span className="text-[9px] md:text-[10px] font-[800] bg-[#7C3AED] text-white px-2.5 py-0.5 rounded-full uppercase">✦ Exclusivo</span>
            </div>
            <h3 className="text-[20px] md:text-[28px] font-[900] text-[#0f172a] tracking-[-0.5px] md:tracking-[-0.8px] mb-2">IA Financeira que entende você</h3>
            <p className="text-[14px] md:text-[15px] text-[#64748b] mb-4 md:mb-6">
              Converse com sua IA financeira pessoal. Ela analisa seus dados reais e dá conselhos personalizados.
            </p>
            <div className="space-y-2 max-w-sm">
              <div className="bg-[#f1f5f9] rounded-[12px] rounded-tr-[4px] px-3 py-2 ml-auto w-fit text-[12px] text-[#0f172a]">
                Por que gastei tanto esse mês?
              </div>
              <div className="bg-[#EDE9FE] rounded-[12px] rounded-tl-[4px] px-3 py-2 mr-auto w-fit text-[12px] text-[#0f172a] max-w-[260px]">
                Você gastou R$ 847 em delivery, 43% acima da sua média.
              </div>
              <div className="bg-[#EDE9FE] rounded-[12px] rounded-tl-[4px] px-3 py-2 mr-auto w-fit text-[12px] text-[#0f172a] max-w-[260px]">
                Reduzir para R$ 500 economiza R$ 347/mês.
              </div>
            </div>
          </BentoCard>

          {/* Score */}
          <BentoCard className="md:col-span-5 bg-white" index={1}>
            <h3 className="text-[18px] md:text-[20px] font-[900] text-[#0f172a] mb-3 md:mb-4">Score de Saúde Financeira</h3>
            <div className="flex justify-center my-3 md:my-4">
              <div className="relative w-[100px] md:w-[120px] h-[100px] md:h-[120px]">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#7C3AED" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 52 * 0.847} ${2 * Math.PI * 52}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] md:text-[28px] font-[900] text-[#0f172a]">847</span>
                  <span className="text-[9px] md:text-[10px] text-[#94a3b8]">/1000</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-[11px] md:text-[12px]">
              {['Reserva de emergência', 'Controle de gastos', 'Metas ativas', 'Diversificação', 'Dívidas sob controle'].map((item, i) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-[#64748b]">{item}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(dot => (
                      <div key={dot} className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${dot <= 4 - (i > 2 ? 1 : 0) ? 'bg-[#7C3AED]' : 'bg-[#e2e8f0]'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* DRE */}
          <BentoCard className="md:col-span-5 bg-white" index={2}>
            <h3 className="text-[18px] md:text-[20px] font-[900] text-[#0f172a] mb-3 md:mb-4">DRE automático</h3>
            <div className="space-y-2 md:space-y-3 text-[13px]">
              {[
                { label: 'Receita Bruta', value: 'R$ 18.400', change: '▲ +12%', positive: true },
                { label: '(–) Despesas', value: 'R$ 11.200', change: '▼ -5%', positive: false },
                { label: '(=) Lucro', value: 'R$ 7.200', change: '▲ +34%', positive: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5 md:py-2 border-b border-[#f1f5f9] last:border-0">
                  <span className="text-[#64748b] text-[12px] md:text-[13px]">{row.label}</span>
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="font-[700] text-[#0f172a] text-[12px] md:text-[13px]">{row.value}</span>
                    <span className={`text-[10px] md:text-[11px] font-semibold ${row.positive ? 'text-[#7C3AED]' : 'text-[#ef4444]'}`}>{row.change}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] md:text-[11px] text-[#94a3b8] mt-2 md:mt-3">Gerado automaticamente todo mês</p>
          </BentoCard>

          {/* Integrations */}
          <BentoCard className="md:col-span-7 bg-white" index={3}>
            <h3 className="text-[18px] md:text-[20px] font-[900] text-[#0f172a] mb-3 md:mb-4">Conectado com tudo</h3>
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {[
                { name: 'Nubank', domain: 'nubank.com.br' },
                { name: 'Itaú', domain: 'itau.com.br' },
                { name: 'Hotmart', domain: 'hotmart.com' },
                { name: 'Shopify', domain: 'shopify.com' },
                { name: 'Stripe', domain: 'stripe.com' },
                { name: 'Kiwify', domain: 'kiwify.com.br' },
                { name: 'Inter', domain: 'bancointer.com.br' },
                { name: 'M. Pago', domain: 'mercadopago.com.br' },
                { name: 'Woo', domain: 'woocommerce.com' },
              ].map(b => (
                <div key={b.name} className="flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-lg md:rounded-xl border border-[#e2e8f0] hover:border-[#C4B5FD] hover:scale-110 transition-all duration-200">
                  <img src={`https://www.google.com/s2/favicons?domain=${b.domain}&sz=64`} alt={b.name} className="w-6 md:w-8 h-6 md:h-8" loading="lazy" />
                  <span className="text-[8px] md:text-[10px] text-[#64748b] text-center leading-tight truncate w-full">{b.name}</span>
                </div>
              ))}
              <div className="flex flex-col items-center justify-center gap-0.5 p-1.5 md:p-2 rounded-lg md:rounded-xl border border-dashed border-[#e2e8f0] text-[#94a3b8]">
                <Zap className="w-4 md:w-5 h-4 md:h-5" />
                <span className="text-[8px] md:text-[10px]">+14</span>
              </div>
            </div>
          </BentoCard>

          {/* Mobile + Gamification + Security - 3 cards in a row on desktop, stacked on mobile */}
          <BentoCard className="md:col-span-4 bg-gradient-to-br from-[#0f172a] via-[#1A0D35] to-[#2A0E5E] text-white relative" index={4}>
            {/* glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#7C3AED]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-[#A78BFA]/15 blur-3xl" />

            <div className="relative flex md:block items-start gap-4">
              <div className="flex-1">
                <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-[#C4B5FD] bg-[#7C3AED]/15 border border-[#7C3AED]/30 rounded-full px-2 py-0.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" /> iOS · Android
                </span>
                <h3 className="text-[18px] md:text-[20px] font-[900] mb-1 leading-tight">Suas finanças sempre com você</h3>
                <p className="text-[12px] md:text-[13px] text-white/60 leading-snug">
                  Lance em segundos, receba alertas em tempo real e acesse com biometria — até offline.
                </p>
              </div>

              {/* Phone mockup */}
              <div className="flex justify-center md:mt-5 shrink-0">
                <div className="relative w-[120px] md:w-[180px] aspect-[9/19] rounded-[22px] md:rounded-[32px] border-[3px] md:border-[4px] border-[#1a1a1a] bg-[#0a0a0a] p-[3px] md:p-[4px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
                  {/* side button */}
                  <div className="absolute -left-[5px] md:-left-[6px] top-[38%] w-[3px] md:w-[4px] h-10 md:h-14 rounded-l bg-[#1a1a1a]" />
                  <div className="absolute -right-[5px] md:-right-[6px] top-[28%] w-[3px] md:w-[4px] h-6 md:h-8 rounded-r bg-[#1a1a1a]" />
                  <div className="absolute -right-[5px] md:-right-[6px] top-[42%] w-[3px] md:w-[4px] h-10 md:h-14 rounded-r bg-[#1a1a1a]" />

                  {/* Screen */}
                  <div className="relative w-full h-full rounded-[18px] md:rounded-[26px] bg-gradient-to-b from-[#0b1220] to-[#1A0D35] overflow-hidden flex flex-col">
                    {/* notch */}
                    <div className="absolute top-1 md:top-1.5 left-1/2 -translate-x-1/2 w-[36%] h-[10px] md:h-[14px] rounded-full bg-black z-10" />

                    {/* status bar */}
                    <div className="flex justify-between items-center px-2 md:px-3 pt-1 md:pt-1.5 text-[6px] md:text-[8px] font-semibold text-white/80">
                      <span>9:41</span>
                      <span className="flex gap-[2px] items-end">
                        <span className="w-[2px] h-[3px] bg-white/80 rounded-[1px]" />
                        <span className="w-[2px] h-[5px] bg-white/80 rounded-[1px]" />
                        <span className="w-[2px] h-[7px] bg-white/80 rounded-[1px]" />
                      </span>
                    </div>

                    {/* App content */}
                    <div className="flex-1 px-2 md:px-2.5 pt-2 md:pt-3 flex flex-col gap-1.5 md:gap-2">
                      {/* Greeting */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[6px] md:text-[8px] text-white/50 leading-none">Olá,</p>
                          <p className="text-[8px] md:text-[10px] font-bold text-white leading-tight">Lucas 👋</p>
                        </div>
                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]" />
                      </div>

                      {/* Balance card — soft glow + shimmer sweep */}
                      <div className="rounded-md md:rounded-lg p-1.5 md:p-2 bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] relative overflow-hidden animate-balance-glow motion-reduce:animate-none [will-change:box-shadow]">
                        <div className="absolute -right-3 -top-3 w-10 h-10 rounded-full bg-white/10" />
                        {/* shimmer sweep */}
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer-sweep motion-reduce:hidden [will-change:transform]"
                        />
                        <p className="relative text-[5px] md:text-[7px] text-white/70 leading-none">Saldo do mês</p>
                        <p className="relative text-[11px] md:text-[15px] font-[900] text-white leading-tight mt-0.5">R$ 3.200</p>
                        <div className="relative flex items-center gap-1 mt-0.5">
                          <ArrowUpRight className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" />
                          <span className="text-[5px] md:text-[7px] text-white/90 font-semibold">+12% vs mês ant.</span>
                        </div>
                      </div>

                      {/* Mini chart bars — pulse staggered */}
                      <div className="flex items-end gap-[2px] md:gap-[3px] h-5 md:h-7 origin-bottom">
                        {[40, 65, 35, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-[1px] md:rounded-sm bg-gradient-to-t from-[#7C3AED]/30 to-[#A78BFA] origin-bottom animate-bar-rise motion-reduce:animate-none [will-change:transform]"
                            style={{ height: `${h}%`, animationDelay: `${i * 0.18}s` }}
                          />
                        ))}
                      </div>

                      {/* Tx list — micro-scroll marquee (mask top/bottom) */}
                      <div
                        className="relative overflow-hidden h-[34px] md:h-[46px]"
                        style={{
                          maskImage:
                            "linear-gradient(to bottom, transparent 0, black 18%, black 82%, transparent 100%)",
                          WebkitMaskImage:
                            "linear-gradient(to bottom, transparent 0, black 18%, black 82%, transparent 100%)",
                        }}
                      >
                        <div className="flex flex-col gap-1 md:gap-1.5 animate-tx-marquee motion-reduce:animate-none [will-change:transform]">
                          {[
                            ...[
                              { icon: ArrowDownLeft, label: 'Mercado', val: '-R$ 84', color: '#f87171' },
                              { icon: ArrowUpRight, label: 'Salário', val: '+R$ 5.000', color: '#4ade80' },
                              { icon: ArrowDownLeft, label: 'iFood', val: '-R$ 42', color: '#f87171' },
                              { icon: ArrowDownLeft, label: 'Uber', val: '-R$ 18', color: '#f87171' },
                              { icon: ArrowUpRight, label: 'PIX João', val: '+R$ 120', color: '#4ade80' },
                              { icon: ArrowDownLeft, label: 'Netflix', val: '-R$ 55', color: '#f87171' },
                            ],
                            ...[
                              { icon: ArrowDownLeft, label: 'Mercado', val: '-R$ 84', color: '#f87171' },
                              { icon: ArrowUpRight, label: 'Salário', val: '+R$ 5.000', color: '#4ade80' },
                              { icon: ArrowDownLeft, label: 'iFood', val: '-R$ 42', color: '#f87171' },
                              { icon: ArrowDownLeft, label: 'Uber', val: '-R$ 18', color: '#f87171' },
                              { icon: ArrowUpRight, label: 'PIX João', val: '+R$ 120', color: '#4ade80' },
                              { icon: ArrowDownLeft, label: 'Netflix', val: '-R$ 55', color: '#f87171' },
                            ],
                          ].map((tx, i) => (
                            <div key={i} className="flex items-center gap-1 md:gap-1.5">
                              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `${tx.color}25` }}>
                                <tx.icon className="w-1.5 h-1.5 md:w-2 md:h-2" style={{ color: tx.color }} />
                              </div>
                              <span className="text-[6px] md:text-[8px] text-white/80 flex-1 leading-none truncate">{tx.label}</span>
                              <span className="text-[6px] md:text-[8px] font-bold leading-none" style={{ color: tx.color }}>{tx.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom nav */}
                    <div className="relative mt-auto mb-1 md:mb-1.5 mx-1.5 md:mx-2 flex items-center justify-between bg-white/5 backdrop-blur rounded-full px-2 md:px-2.5 py-1 md:py-1.5 border border-white/10">
                      {[Home, BarChart3, Wallet, User].map((Icon, i) => (
                        <Icon key={i} className={`w-2 h-2 md:w-2.5 md:h-2.5 ${i === 0 ? 'text-[#A78BFA]' : 'text-white/40'}`} />
                      ))}
                      <div className="absolute -top-2 md:-top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#7C3AED] flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.5)]">
                        <Plus className="w-2 h-2 md:w-2.5 md:h-2.5 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-4 bg-white" index={5}>
            <h3 className="text-[18px] md:text-[20px] font-[900] text-[#0f172a] mb-3 md:mb-4">Finanças divertidas</h3>
            <div className="flex justify-around">
              {[
                { emoji: '🏆', label: 'Primeira meta!', color: '#f59e0b' },
                { emoji: '🔥', label: '7 dias!', color: '#f97316' },
                { emoji: '⭐', label: 'Score 800+', color: '#7C3AED' },
              ].map(a => (
                <div key={a.label} className="flex flex-col items-center gap-1.5 md:gap-2">
                  <div className="w-[44px] md:w-[52px] h-[44px] md:h-[52px] rounded-full flex items-center justify-center text-xl md:text-2xl" style={{ background: `${a.color}15`, border: `2px solid ${a.color}30` }}>
                    {a.emoji}
                  </div>
                  <span className="text-[10px] md:text-[11px] font-semibold text-[#0f172a] text-center">{a.label}</span>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="md:col-span-4 bg-[#f8fafc]" index={6}>
            <div className="flex md:block items-center gap-4">
              <Shield className="w-8 md:w-10 h-8 md:h-10 text-[#7C3AED] flex-shrink-0 md:mb-3" />
              <div>
                <h3 className="text-[18px] md:text-[20px] font-[900] text-[#0f172a] mb-2 md:mb-3">Seus dados seguros.</h3>
                <div className="space-y-2 md:space-y-3">
                  {[
                    { icon: '🔒', label: 'Criptografia TLS 1.3' },
                    { icon: '🛡️', label: 'Row Level Security' },
                    { icon: '📋', label: 'Conforme LGPD' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2 text-[12px] md:text-[13px] text-[#64748b]">
                      <span>{r.icon}</span>{r.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
