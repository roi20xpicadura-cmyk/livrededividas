import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const useCases = [
  {
    emoji: '🏠',
    title: 'Quero organizar minha vida pessoal',
    accent: 'border-l-primary',
    bg: 'bg-card',
    bullets: ['Controle de gastos', 'Metas de poupança', 'Quitar dívidas', 'Cartões organizados'],
    badge: null,
  },
  {
    emoji: '💼',
    title: 'Quero crescer meu negócio',
    accent: 'border-l-blue-400',
    bg: 'bg-card',
    bullets: ['DRE automático', 'Fluxo de caixa', 'ROI de investimentos', 'Relatórios completos'],
    badge: null,
  },
  {
    emoji: '⚡',
    title: 'Quero controlar tudo',
    accent: 'border-l-primary',
    bg: 'bg-fin-green-pale',
    bullets: ['Pessoal + Negócio separados', 'Visão unificada', 'Todos os módulos'],
    badge: 'Mais completo',
  },
];

export default function UseCasesSection() {
  return (
    <section className="py-20 px-4 bg-card">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-4xl font-black text-fin-green-dark tracking-tight">Qual é o seu objetivo hoje?</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map((uc, i) => (
            <motion.div key={uc.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border-[1.5px] border-border border-l-[3px] ${uc.accent} ${uc.bg} p-7 transition-all hover:border-fin-green-border hover:-translate-y-1 duration-200`}>
              {uc.badge && (
                <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{uc.badge}</span>
              )}
              <span className="text-3xl block mb-4">{uc.emoji}</span>
              <h3 className="text-lg font-extrabold text-fin-green-dark mb-4">{uc.title}</h3>
              <ul className="space-y-2 mb-6">
                {uc.bullets.map(b => (
                  <li key={b} className="flex items-center gap-2 text-[13px] text-foreground">
                    <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    {b}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                Começar grátis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
