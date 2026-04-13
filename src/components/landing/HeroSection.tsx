import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import HeroMockup from './HeroMockup';

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const avatarColors = ['bg-primary', 'bg-fin-blue', 'bg-fin-purple', 'bg-fin-amber', 'bg-destructive'];
const avatarInitials = ['AS', 'CS', 'MO', 'PF', 'RL'];

export default function HeroSection() {
  const line1 = 'Controle total das suas'.split(' ');
  const line2 = ['finanças.'];
  const line3 = 'Pessoal e negócio.'.split(' ');

  return (
    <section className="pt-16 pb-20 md:pt-24 md:pb-28 px-4 bg-card">
      <div className="max-w-4xl mx-auto text-center">
        {/* Announcement badge */}
        <motion.a
          href="#recursos"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-fin-green-border bg-fin-green-pale text-fin-green-dark text-[13px] font-medium cursor-pointer hover:border-primary transition-colors duration-200 mb-8"
        >
          🎉 Novo: Módulo de Investimentos lançado <ArrowRight className="w-3.5 h-3.5" />
        </motion.a>

        {/* Headline */}
        <h1 className="max-w-[780px] mx-auto leading-[1.05] tracking-[-2px]" style={{ fontSize: 'clamp(42px, 6vw, 72px)' }}>
          {line1.map((word, i) => (
            <motion.span key={`l1-${i}`} custom={i} variants={wordVariants} initial="hidden" animate="visible" className="inline-block font-black text-foreground mr-[0.3em]">
              {word}
            </motion.span>
          ))}
          <br />
          {line2.map((word, i) => (
            <motion.span key={`l2-${i}`} custom={line1.length + i} variants={wordVariants} initial="hidden" animate="visible" className="inline-block font-black text-foreground mr-[0.3em]">
              {word}
            </motion.span>
          ))}
          <br />
          {line3.map((word, i) => (
            <motion.span key={`l3-${i}`} custom={line1.length + line2.length + i} variants={wordVariants} initial="hidden" animate="visible" className="inline-block font-black text-primary mr-[0.3em]">
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-5 text-lg text-muted max-w-[520px] mx-auto leading-[1.7]"
        >
          Do lançamento diário ao DRE completo — tudo em um painel inteligente, bonito e feito para empreendedores brasileiros.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-9 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            to="/register"
            className="px-7 py-3.5 rounded-[10px] bg-primary text-primary-foreground text-base font-extrabold hover:bg-fin-green-dark active:scale-[0.97] transition-all duration-200 inline-flex items-center justify-center gap-2"
          >
            Começar grátis — é de graça <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/pricing"
            className="px-7 py-3.5 rounded-[10px] bg-card border-[1.5px] border-border text-foreground text-base font-semibold hover:border-primary hover:text-primary transition-all duration-200 inline-flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" /> Ver demonstração
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-2">
            {avatarColors.map((c, i) => (
              <div key={i} className={`w-8 h-8 rounded-full ${c} flex items-center justify-center text-[10px] font-bold text-white border-2 border-card`}>
                {avatarInitials[i]}
              </div>
            ))}
          </div>
          <span className="text-[13px] text-muted">Mais de 2.000 empreendedores já usam</span>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <HeroMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
