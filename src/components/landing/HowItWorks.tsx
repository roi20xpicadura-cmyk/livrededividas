import { motion } from 'framer-motion';
import { UserPlus, Settings, BarChart3 } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1];

const steps = [
  { num: '1', icon: UserPlus, title: 'Crie sua conta', desc: 'Em 30 segundos, sem cartão de crédito.', preview: 'Formulário de cadastro simples e rápido' },
  { num: '2', icon: Settings, title: 'Configure seu perfil', desc: 'Diga o que quer alcançar. A IA personaliza tudo.', preview: 'Onboarding com objetivos financeiros' },
  { num: '3', icon: BarChart3, title: 'Comece a controlar', desc: 'Seu painel completo, pronto para usar.', preview: 'Dashboard com gráficos e metas' },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28 px-4 bg-[#f8fafc]">
      <div className="max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-[clamp(28px,4vw,48px)] font-[900] text-[#0f172a] tracking-[-2px]">Simples de começar.</h2>
          <p className="text-[18px] text-[#64748b] mt-2">Em 3 minutos você já tem o painel completo.</p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          <div className="hidden md:block absolute top-[24px] left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] border-t-2 border-dashed border-[#bbf7d0] z-0" />
          {steps.map((step, i) => (
            <motion.div key={step.num} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.5, ease }} className="relative z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white text-[20px] font-[900] flex items-center justify-center mx-auto">{step.num}</div>
              <h3 className="text-[20px] font-[800] text-[#0f172a] mt-5 mb-2">{step.title}</h3>
              <p className="text-[15px] text-[#64748b] leading-[1.7] mb-6">{step.desc}</p>
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 h-[140px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-[#94a3b8]">
                  <step.icon className="w-8 h-8" />
                  <span className="text-[12px]">{step.preview}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
