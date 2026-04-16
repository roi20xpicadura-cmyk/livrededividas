import { motion } from 'framer-motion';
import { UserPlus, Settings2, Sparkles } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua conta grátis',
    description: 'Em menos de 1 minuto. Sem cartão de crédito.',
    color: '#16a34a',
  },
  {
    number: '02',
    icon: Settings2,
    title: 'Configure seu perfil',
    description: 'Pessoal, negócio ou os dois. KoraFinance se adapta.',
    color: '#7c3aed',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'IA analisa suas finanças',
    description: 'Insights personalizados desde o primeiro lançamento.',
    color: '#0891b2',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-[1000px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-[clamp(28px,4vw,48px)] font-black tracking-[-2px]" style={{ color: '#0f172a' }}>Simples de começar.</h2>
          <p className="text-[18px] mt-2" style={{ color: '#64748b' }}>Em 3 minutos você já tem o painel completo.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5, ease }}
              className="relative bg-white rounded-[20px] p-7 md:p-8"
              style={{
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              {/* Large number watermark */}
              <div
                className="absolute top-4 right-5 select-none pointer-events-none"
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: step.color,
                  opacity: 0.06,
                  letterSpacing: '-4px',
                }}
              >
                {step.number}
              </div>

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: step.color + '14' }}
              >
                <step.icon style={{ width: 22, height: 22, color: step.color }} />
              </div>

              <h3 className="text-[18px] font-extrabold mb-2" style={{ color: '#0f172a' }}>
                {step.title}
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#64748b' }}>
                {step.description}
              </p>

              {/* Arrow connector on desktop */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white items-center justify-center" style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>→</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
