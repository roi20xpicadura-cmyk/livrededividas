import { UserPlus, Settings, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { icon: UserPlus, num: '1', title: 'Crie sua conta', desc: 'Em 30 segundos, sem cartão de crédito. Google ou e-mail.' },
  { icon: Settings, num: '2', title: 'Configure seu painel', desc: 'Adicione seus lançamentos, metas e cartões. Onboarding guiado em 2 minutos.' },
  { icon: TrendingUp, num: '3', title: 'Acompanhe e cresça', desc: 'Veja DRE, gráficos e relatórios atualizados em tempo real.' },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-24 px-4 bg-card">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[clamp(28px,4vw,40px)] font-black text-fin-green-dark text-center tracking-tight"
        >
          Simples de configurar. Poderoso para usar.
        </motion.h2>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-6 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-[1px] border-t border-dashed border-fin-green-border" />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex flex-col items-center text-center relative"
            >
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-black text-lg flex items-center justify-center z-10">
                {s.num}
              </div>
              <s.icon className="w-8 h-8 text-primary mt-4" />
              <h3 className="font-extrabold text-[17px] text-fin-green-dark mt-3">{s.title}</h3>
              <p className="text-sm text-muted mt-2 leading-[1.7] max-w-[220px]">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
