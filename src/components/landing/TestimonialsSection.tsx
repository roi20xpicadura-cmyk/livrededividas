import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  { name: 'Ana Silva', role: 'E-commerce Owner', quote: 'O FinDash Pro mudou completamente minha visão financeira. Consigo ver exatamente para onde vai cada centavo do meu negócio.', color: 'bg-primary' },
  { name: 'Carlos Santos', role: 'Freelancer', quote: 'Finalmente um painel que separa pessoal de negócio. Indispensável para quem é PJ.', color: 'bg-fin-blue' },
  { name: 'Marina Oliveira', role: 'Empreendedora', quote: 'A funcionalidade de metas me motivou a guardar mais. Já alcancei 3 objetivos financeiros!', color: 'bg-fin-purple' },
  { name: 'Pedro Costa', role: 'Loja Virtual', quote: 'O DRE automático me economiza 4 horas por mês. Simplesmente perfeito.', color: 'bg-fin-amber' },
  { name: 'Juliana Ferreira', role: 'Infoprodutora', quote: 'Uso no celular todo dia. Interface linda e rápida.', color: 'bg-destructive' },
  { name: 'Ricardo Lima', role: 'Agência Digital', quote: 'Migrei do Excel e nunca mais voltei. Vale muito mais do que o preço.', color: 'bg-fin-green-dark' },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-24 px-4 bg-card">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[clamp(28px,4vw,40px)] font-black text-fin-green-dark text-center tracking-tight mb-14"
        >
          O que nossos usuários dizem
        </motion.h2>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="break-inside-avoid bg-card border-[1.5px] border-border rounded-2xl p-6 hover:border-fin-green-light transition-colors duration-200"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                ))}
              </div>
              <div className="relative">
                <span className="absolute -top-4 -left-1 text-5xl text-fin-green-pale font-serif select-none">"</span>
                <p className="text-sm text-foreground leading-[1.8] italic pl-4">{t.quote}</p>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-[11px] font-bold text-white`}>
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
