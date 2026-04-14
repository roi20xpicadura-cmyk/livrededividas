import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="relative py-20 md:py-32 px-4 bg-[#0f172a] overflow-hidden">
      <div className="absolute inset-0 -z-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(22,163,74,0.20) 0%, transparent 70%)' }} />
        <div className="absolute left-1/4 top-1/4 w-[300px] md:w-[400px] h-[300px] md:h-[400px] rounded-full bg-[rgba(22,163,74,0.12)] blur-[80px] md:blur-[100px]" />
        <div className="absolute right-1/4 bottom-1/4 w-[200px] md:w-[300px] h-[200px] md:h-[300px] rounded-full bg-[rgba(37,99,235,0.08)] blur-[60px] md:blur-[80px]" />
      </div>
      <div className="relative z-10 max-w-[700px] mx-auto text-center">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-center justify-center gap-3 mb-6 md:mb-8">
          <div className="flex -space-x-2">
            {['bg-[#16a34a]', 'bg-[#2563eb]', 'bg-[#7c3aed]'].map((c, i) => (
              <div key={i} className={`w-6 md:w-7 h-6 md:h-7 rounded-full ${c} flex items-center justify-center text-[8px] md:text-[9px] font-bold text-white border-2 border-[#0f172a]`}>{['AS', 'CS', 'MO'][i]}</div>
            ))}
          </div>
          <span className="text-[10px] md:text-[11px] text-white/40">+2.400 pessoas organizando finanças</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-[28px] md:text-[56px] font-[900] text-white tracking-[-1px] md:tracking-[-2px] leading-[1.1] mb-4 md:mb-5 px-2">
          Sua vida financeira merece<br /><span className="text-[#4ade80]">uma segunda chance.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="text-[15px] md:text-[18px] text-white/60 leading-[1.7] mb-8 md:mb-10 px-4">
          Comece hoje. É grátis. Sem cartão. Sem compromisso.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
          <Link to="/register" className="h-[52px] md:h-[60px] px-8 md:px-10 rounded-2xl bg-[#16a34a] text-white text-[16px] md:text-[18px] font-[800] hover:bg-[#22c55e] transition-all duration-200 inline-flex items-center gap-2"
            style={{ boxShadow: '0 8px 40px rgba(22,163,74,0.4)' }}>
            Criar conta gratuita <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="mt-4 md:mt-5 flex flex-wrap justify-center gap-4 md:gap-5 text-[11px] md:text-[12px] text-white/40">
          <span>✓ Grátis para sempre</span><span>✓ Sem cartão</span><span>✓ Cancele quando quiser</span>
        </motion.div>
      </div>
    </section>
  );
}
