import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield } from 'lucide-react';
import { useState } from 'react';

const ease = [0.16, 1, 0.3, 1] as const;

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free', price: 0, priceAnnual: 0, sub: 'Para começar a organizar',
      features: [
        { label: '50 lançamentos/mês', included: true },
        { label: '2 metas financeiras', included: true },
        { label: '1 cartão de crédito', included: true },
        { label: 'Score financeiro', included: true },
        { label: 'Dashboard completo', included: true },
        { label: 'App mobile (PWA)', included: true },
        { label: 'IA Financeira', included: false },
        { label: 'DRE automático', included: false },
        { label: 'Integrações', included: false },
      ],
      cta: 'Começar grátis', featured: false, dark: false,
    },
    {
      name: 'Pro', price: 29, priceAnnual: 23, sub: 'Para quem leva a sério',
      features: [
        { label: 'Lançamentos ilimitados', included: true },
        { label: 'Metas ilimitadas', included: true },
        { label: 'Cartões ilimitados', included: true },
        { label: 'IA Financeira completa', included: true },
        { label: 'DRE automático', included: true },
        { label: 'Exportação CSV/PDF', included: true },
        { label: 'Todas as integrações', included: true },
        { label: 'Relatório mensal', included: true },
        { label: 'Suporte prioritário', included: true },
      ],
      cta: 'Assinar Pro →', featured: true, dark: false,
    },
    {
      name: 'Business', price: 79, priceAnnual: 63, sub: 'Para empreendedores',
      features: [
        { label: 'Tudo do Pro', included: true },
        { label: 'Múltiplas empresas', included: true },
        { label: 'Usuários adicionais', included: true },
        { label: 'API de webhooks', included: true },
        { label: 'Relatórios personalizados', included: true },
        { label: 'Suporte via WhatsApp', included: true },
        { label: 'Onboarding guiado', included: true },
        { label: 'SLA garantido 99.9%', included: true },
      ],
      cta: 'Assinar Business', featured: false, dark: true,
    },
  ];

  return (
    <section id="precos" className="py-16 md:py-28 px-4 bg-[#f8fafc]">
      <div className="max-w-[1100px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-4">
          <h2 className="text-[28px] md:text-[48px] font-[900] text-[#0f172a] tracking-[-1px] md:tracking-[-2px]">Preço justo. Valor real.</h2>
          <p className="text-[15px] md:text-[18px] text-[#64748b] mt-2">Comece grátis. Faça upgrade quando precisar.</p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8 md:mb-12">
          <span className={`text-[13px] md:text-[14px] font-semibold transition-colors ${!annual ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>Mensal</span>
          <button onClick={() => setAnnual(!annual)} className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${annual ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 shadow-sm ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-[13px] md:text-[14px] font-semibold transition-colors ${annual ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>Anual</span>
          {annual && <span className="text-[10px] md:text-[11px] font-bold text-[#854d0e] bg-[#fef9c3] px-2 py-0.5 rounded-full">-20%</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start">
          {plans.map((p, idx) => {
            const price = annual ? p.priceAnnual : p.price;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5, ease }}
                className={`relative rounded-[16px] md:rounded-[20px] p-6 md:p-8 ${
                  p.dark ? 'bg-[#0f172a] text-white'
                    : p.featured ? 'bg-white border-2 border-[#16a34a] md:scale-[1.04]'
                    : 'bg-white border border-[#e2e8f0]'
                }`}
                style={p.featured ? { boxShadow: '0 20px 60px rgba(22,163,74,0.15)' } : {}}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#16a34a] text-white text-[11px] md:text-[12px] font-bold whitespace-nowrap" style={{ boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                    Mais popular
                  </span>
                )}

                <div className={`text-[13px] md:text-[14px] font-semibold ${p.dark ? 'text-white/70' : 'text-[#64748b]'}`}>{p.name}</div>
                <div className="mt-2 mb-1">
                  <AnimatePresence mode="wait">
                    <motion.span key={price} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}
                      className={`text-[40px] md:text-[48px] font-[900] ${p.dark ? 'text-white' : 'text-[#0f172a]'}`}>
                      {price === 0 ? 'Grátis' : `R$ ${price}`}
                    </motion.span>
                  </AnimatePresence>
                  {price > 0 && <span className={`text-[13px] md:text-[14px] ${p.dark ? 'text-white/50' : 'text-[#94a3b8]'}`}>/mês</span>}
                </div>
                {annual && price > 0 && (
                  <div className="text-[11px] text-[#16a34a] font-semibold bg-[#f0fdf4] inline-block px-2 py-0.5 rounded-full mb-1">
                    Economize R$ {(p.price - p.priceAnnual) * 12}/ano
                  </div>
                )}
                <p className={`text-[12px] md:text-[13px] mb-5 md:mb-6 ${p.dark ? 'text-white/50' : 'text-[#94a3b8]'}`}>{p.sub}</p>

                <div className={`border-t mb-5 md:mb-6 ${p.dark ? 'border-white/10' : 'border-[#f1f5f9]'}`} />

                <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8">
                  {p.features.map(f => (
                    <li key={f.label} className="flex items-center gap-2 text-[12px] md:text-[13px]">
                      {f.included ? (
                        <div className="w-4 h-4 rounded-full bg-[#16a34a]/15 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-[#16a34a]" />
                        </div>
                      ) : (
                        <X className="w-4 h-4 text-[#cbd5e1] flex-shrink-0" />
                      )}
                      <span className={f.included ? (p.dark ? 'text-white/70' : 'text-[#0f172a]') : 'text-[#cbd5e1]'}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register" className={`block w-full py-3 md:py-3.5 rounded-[10px] md:rounded-[12px] text-[14px] md:text-[15px] font-[800] text-center transition-all duration-200 ${
                  p.dark ? 'bg-white text-[#0f172a] hover:bg-[#f1f5f9]'
                    : p.featured ? 'bg-[#16a34a] text-white hover:bg-[#14532d]'
                    : 'bg-white border-[1.5px] border-[#e2e8f0] text-[#0f172a] hover:border-[#16a34a] hover:text-[#16a34a]'
                }`} style={p.featured ? { boxShadow: '0 8px 24px rgba(22,163,74,0.35)' } : {}}>
                  {p.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p className="text-[11px] md:text-[12px] text-[#94a3b8] text-center mt-5 md:mt-6">
          Todos os planos incluem SSL, backups diários e suporte por e-mail.
        </p>

        {/* Money-back */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-6 md:mt-8 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 md:p-5 md:px-8 flex items-center gap-3 md:gap-4">
          <Shield className="w-7 md:w-8 h-7 md:h-8 text-[#16a34a] flex-shrink-0" />
          <div>
            <div className="text-[14px] md:text-[16px] font-bold text-[#0f172a]">Garantia de 7 dias</div>
            <div className="text-[12px] md:text-[14px] text-[#64748b]">Devolvemos 100% se não ficar satisfeito.</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
