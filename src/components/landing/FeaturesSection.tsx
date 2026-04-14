import { motion } from 'framer-motion';
import { Sparkles, Shield, Smartphone, Trophy, Zap, Check } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1];
const cardBase = "rounded-[20px] border border-[#e2e8f0] p-6 md:p-8 overflow-hidden relative transition-all duration-300 hover:border-[#86efac] hover:-translate-y-[3px]";

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
    <section id="recursos" className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-[clamp(28px,4vw,48px)] font-[900] text-[#0f172a] tracking-[-2px]">Tudo que você precisa.</h2>
          <p className="text-[20px] text-[#64748b] mt-2">Nada do que você não precisa.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* AI Card */}
          <BentoCard className="md:col-span-7 bg-gradient-to-br from-[#f0fdf4] to-white" index={0}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#16a34a] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-[800] bg-[#16a34a] text-white px-2.5 py-0.5 rounded-full uppercase">✦ Exclusivo no Brasil</span>
            </div>
            <h3 className="text-[22px] md:text-[28px] font-[900] text-[#0f172a] tracking-[-0.8px] mb-2">IA Financeira que entende você</h3>
            <p className="text-[15px] text-[#64748b] mb-6 max-w-md">
              Converse com sua IA financeira pessoal. Ela analisa seus dados reais e dá conselhos personalizados — não respostas genéricas.
            </p>
            <div className="space-y-2 max-w-sm">
              <div className="bg-[#f1f5f9] rounded-[14px] rounded-tr-[4px] px-3.5 py-2.5 ml-auto w-fit text-[12px] text-[#0f172a]">
                Por que gastei tanto esse mês?
              </div>
              <div className="bg-[#dcfce7] rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5 mr-auto w-fit text-[12px] text-[#0f172a] max-w-[280px]">
                Analisei seus dados: você gastou R$ 847 em delivery, 43% acima da sua média.
              </div>
              <div className="bg-[#dcfce7] rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5 mr-auto w-fit text-[12px] text-[#0f172a] max-w-[280px]">
                Sugestão: reduzir para R$ 500 economiza R$ 347/mês — o suficiente para sua meta de viagem.
              </div>
            </div>
          </BentoCard>

          {/* Score */}
          <BentoCard className="md:col-span-5 bg-white" index={1}>
            <h3 className="text-[20px] font-[900] text-[#0f172a] mb-4">Score de Saúde Financeira</h3>
            <div className="flex justify-center my-4">
              <div className="relative w-[120px] h-[120px]">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#16a34a" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 52 * 0.847} ${2 * Math.PI * 52}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[28px] font-[900] text-[#0f172a]">847</span>
                  <span className="text-[10px] text-[#94a3b8]">/1000</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-[12px]">
              {['Reserva de emergência', 'Controle de gastos', 'Metas ativas', 'Diversificação', 'Dívidas sob controle'].map((item, i) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-[#64748b]">{item}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(dot => (
                      <div key={dot} className={`w-2 h-2 rounded-full ${dot <= 4 - (i > 2 ? 1 : 0) ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* DRE */}
          <BentoCard className="md:col-span-5 bg-white" index={2}>
            <h3 className="text-[20px] font-[900] text-[#0f172a] mb-4">DRE automático para seu negócio</h3>
            <div className="space-y-3 text-[13px]">
              {[
                { label: 'Receita Bruta', value: 'R$ 18.400', change: '▲ +12%', positive: true },
                { label: '(–) Despesas', value: 'R$ 11.200', change: '▼ -5%', positive: false },
                { label: '(=) Lucro', value: 'R$ 7.200', change: '▲ +34%', positive: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#f1f5f9] last:border-0">
                  <span className="text-[#64748b]">{row.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-[700] text-[#0f172a]">{row.value}</span>
                    <span className={`text-[11px] font-semibold ${row.positive ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>{row.change}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-3">Gerado automaticamente todo mês</p>
          </BentoCard>

          {/* Integrations */}
          <BentoCard className="md:col-span-7 bg-white" index={3}>
            <h3 className="text-[20px] font-[900] text-[#0f172a] mb-4">Conectado com tudo que você usa</h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { name: 'Nubank', domain: 'nubank.com.br' },
                { name: 'Itaú', domain: 'itau.com.br' },
                { name: 'Hotmart', domain: 'hotmart.com' },
                { name: 'Shopify', domain: 'shopify.com' },
                { name: 'Stripe', domain: 'stripe.com' },
                { name: 'Kiwify', domain: 'kiwify.com.br' },
                { name: 'Inter', domain: 'bancointer.com.br' },
                { name: 'M. Pago', domain: 'mercadopago.com.br' },
                { name: 'WooCommerce', domain: 'woocommerce.com' },
              ].map(b => (
                <div key={b.name} className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#e2e8f0] hover:border-[#86efac] hover:scale-110 transition-all duration-200">
                  <img src={`https://www.google.com/s2/favicons?domain=${b.domain}&sz=64`} alt={b.name} className="w-8 h-8" loading="lazy" />
                  <span className="text-[10px] text-[#64748b] text-center leading-tight">{b.name}</span>
                </div>
              ))}
              <div className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-dashed border-[#e2e8f0] text-[#94a3b8]">
                <Zap className="w-5 h-5" />
                <span className="text-[10px]">+14</span>
              </div>
            </div>
          </BentoCard>

          {/* Mobile */}
          <BentoCard className="md:col-span-4 bg-gradient-to-br from-[#0f172a] to-[#1e3a1e] text-white" index={4}>
            <h3 className="text-[20px] font-[900] mb-1">Nativo no celular</h3>
            <p className="text-[14px] text-white/60 mb-4">iOS, Android e PWA</p>
            <div className="flex justify-center">
              <div className="w-[120px] h-[220px] rounded-[24px] border-4 border-[#333] bg-[#1a1a1a] p-1.5 overflow-hidden">
                <div className="w-full h-full rounded-[18px] bg-gradient-to-b from-[#0f172a] to-[#14532d] flex flex-col items-center justify-center gap-2 text-center">
                  <Smartphone className="w-6 h-6 text-[#4ade80]" />
                  <span className="text-[9px] text-white/70">FinDash Pro</span>
                  <span className="text-[16px] font-[900] text-white">R$ 3.200</span>
                  <span className="text-[8px] text-[#4ade80]">↑ +12% este mês</span>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Gamification */}
          <BentoCard className="md:col-span-4 bg-white" index={5}>
            <h3 className="text-[20px] font-[900] text-[#0f172a] mb-4">Finanças podem ser divertidas</h3>
            <div className="flex justify-around">
              {[
                { emoji: '🏆', label: 'Primeira meta!', color: '#f59e0b' },
                { emoji: '🔥', label: '7 dias seguidos!', color: '#f97316' },
                { emoji: '⭐', label: 'Score 800+', color: '#16a34a' },
              ].map(a => (
                <div key={a.label} className="flex flex-col items-center gap-2">
                  <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl" style={{ background: `${a.color}15`, border: `2px solid ${a.color}30` }}>
                    {a.emoji}
                  </div>
                  <span className="text-[11px] font-semibold text-[#0f172a] text-center">{a.label}</span>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Security */}
          <BentoCard className="md:col-span-4 bg-[#f8fafc]" index={6}>
            <Shield className="w-10 h-10 text-[#16a34a] mb-3" />
            <h3 className="text-[20px] font-[900] text-[#0f172a] mb-3">Seus dados. Sua privacidade.</h3>
            <div className="space-y-3">
              {[
                { icon: '🔒', label: 'Criptografia TLS 1.3' },
                { icon: '🛡️', label: 'Row Level Security' },
                { icon: '📋', label: 'Conforme LGPD' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2.5 text-[13px] text-[#64748b]">
                  <span>{r.icon}</span>{r.label}
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
