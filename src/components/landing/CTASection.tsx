import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const perks = ['Grátis para sempre', 'Sem cartão', 'Setup em 2 min', 'Cancele quando quiser'];

export default function CTASection() {
  return (
    <section className="py-20 md:py-24 px-4 bg-primary">
      <div className="max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[11px] uppercase tracking-[2px] text-primary-foreground/80 font-semibold"
        >
          COMECE HOJE
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-4 text-primary-foreground font-black leading-[1.1] tracking-[-1.5px]"
          style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}
        >
          Suas finanças sob controle.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-3 text-lg text-primary-foreground/85"
        >
          Grátis para sempre. Sem cartão de crédito.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8"
        >
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-[10px] bg-card text-primary font-black text-base hover:bg-fin-green-pale hover:scale-[1.02] transition-all duration-200"
          >
            Criar minha conta grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {perks.map((p) => (
            <span key={p} className="flex items-center gap-1.5 text-xs text-primary-foreground/85">
              <Check className="w-3.5 h-3.5" /> {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
