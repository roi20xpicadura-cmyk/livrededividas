import { PricingCards } from '@/pages/LandingPage';
import { motion } from 'framer-motion';

export default function PricingSection() {
  return (
    <section id="precos" className="py-20 md:py-24 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[clamp(28px,4vw,40px)] font-black text-fin-green-dark text-center tracking-tight"
        >
          Preço justo. Valor real.
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10"
        >
          <PricingCards />
        </motion.div>
      </div>
    </section>
  );
}
