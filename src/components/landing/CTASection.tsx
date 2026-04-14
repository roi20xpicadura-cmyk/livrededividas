import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="relative py-24 md:py-32 px-4 bg-[#0f172a] overflow-hidden">
      <div className="absolute inset-0 -z-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(22,163,74,0.20) 0%, transparent 70%)' }} />
        <div className="absolute left-1/4 top-1/4 w-[400px] h-[400px] rounded-full bg-[rgba(22,163,74,0.12)] blur-[100px]" />
        <div className="absolute right-1/4 bottom-1/4 w-[300px] h-[300px] rounded-full bg-[rgba(37,99,235,0.08)] blur-[80px]" />
      </div>
      <div className="relative z-10 max-w-[700px] mx-auto text-center">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-center justify-center gap-3 mb-8">
          <div className="flex -space-x-2">
            {['bg-[#16a34a]', 'bg-[#2563eb]', 'bg-[#7c3aed]'].map((c, i) => (
              <div key={i} className={`w-7 h-7 rounded-full ${c} flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0f172a]`}>{['AS', 'CS', 'MO'][i]}</div>
            ))}
          </div>
          <span className="text-[11px] text-white/40">+2.400 pessoas já organizam suas finanças</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-[clamp(32px,5vw,56px)] font-[900] text-white tracking-[-2px] leading-[1.1] mb-5">
          Sua vida financeira merece<br /><span className="text-[#4ade80]">uma segunda chance.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-[18px] text-white/60 leading-[1.7] mb-10">
          Comece hoje. É grátis. Sem cartão. Sem compromisso.<br />Apenas você e o controle da sua vida financeira.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
          <Link to="/register" className="h-[60px] px-10 rounded-2xl bg-[#16a34a] text-white text-[18px] font-[800] hover:bg-[#22c55e] transition-all duration-200 inline-flex items-center gap-2" style={{ boxShadow: '0 8px 40px rgba(22,163,74,0.4)' }}>
            Criar minha conta gratuita <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-5 flex flex-wrap justify-center gap-5 text-[12px] text-white/40">
          <span>✓ Grátis para sempre</span><span>✓ Sem cartão</span><span>✓ Cancele quando quiser</span>
        </motion.div>
      </div>
    </section>
  );
}
