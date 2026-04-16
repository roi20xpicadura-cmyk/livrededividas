import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, TrendingUp, Target, Flame, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import HeroMockup from './HeroMockup';

const ease = [0.16, 1, 0.3, 1] as const;

function FloatingCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1 + delay, duration: 0.5, ease }}
      className={`absolute bg-white rounded-[14px] border border-[#e2e8f0] p-3.5 hidden lg:block ${className}`}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
    >
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative pt-12 pb-16 md:pt-24 md:pb-32 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 58, 237,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-[1200px] mx-auto text-center">
        {/* Badge */}
        <motion.a
          href="#recursos"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] cursor-pointer hover:border-[#7C3AED] transition-colors mb-6 md:mb-8"
        >
          <span className="text-[9px] font-[800] bg-[#7C3AED] text-white px-2 py-0.5 rounded-full uppercase">Novo</span>
          <span className="text-[12px] md:text-[13px] font-medium text-[#5B21B6]">IA Financeira disponível para todos</span>
          <ArrowRight className="w-3 h-3 text-[#7C3AED]" />
        </motion.a>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease }}
          className="max-w-[800px] mx-auto leading-[1.05] font-[900] text-[#0f172a]"
          style={{ fontSize: 'clamp(36px, 8vw, 72px)', letterSpacing: 'clamp(-1.5px, -0.4vw, -3px)' }}
        >
          Controle total
          <br />
          das suas finanças.
          <br />
          <span className="text-[#7C3AED]">Pessoal e negócio.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease }}
          className="mt-4 md:mt-5 text-[16px] md:text-[20px] text-[#64748b] max-w-[560px] mx-auto leading-[1.7] px-2"
        >
          Para quem quer sair das dívidas, guardar dinheiro, fazer seu negócio crescer — ou simplesmente organizar a vida financeira.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease }}
          className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 justify-center px-2"
        >
          <Link
            to="/register"
            className="h-[52px] md:h-[54px] px-6 md:px-7 rounded-[14px] bg-[#7C3AED] text-white text-[15px] md:text-[16px] font-[800] hover:bg-[#1A0D35] active:scale-[0.97] transition-all duration-200 inline-flex items-center justify-center gap-2 hover:-translate-y-0.5"
            style={{ boxShadow: '0 8px 30px rgba(124, 58, 237,0.35), 0 2px 8px rgba(124, 58, 237,0.2)' }}
          >
            Começar grátis <ArrowRight className="w-[18px] h-[18px]" />
          </Link>
          <Link
            to="/pricing"
            className="h-[52px] md:h-[54px] px-6 rounded-[14px] bg-transparent border-[1.5px] border-[#e2e8f0] text-[#64748b] text-[14px] font-semibold hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-200 inline-flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" /> Ver demonstração
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="mt-4 md:mt-5 flex flex-wrap justify-center gap-4 md:gap-5 text-[11px] md:text-[12px] text-[#94a3b8]"
        >
          <span>✓ Sem cartão de crédito</span>
          <span>✓ Plano grátis para sempre</span>
          <span>✓ Cancele quando quiser</span>
        </motion.div>

        {/* Social proof */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-5 md:mt-6 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {['bg-[#7C3AED]', 'bg-[#2563eb]', 'bg-[#7c3aed]', 'bg-[#f59e0b]', 'bg-[#ef4444]'].map((c, i) => (
              <div key={i} className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${c} flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white border-2 border-white`}>
                {['AS', 'CS', 'MO', 'PF', 'RL'][i]}
              </div>
            ))}
          </div>
          <span className="text-[11px] md:text-[12px] text-[#94a3b8]">+2.400 organizando suas finanças</span>
        </motion.div>

        {/* Screenshot */}
        <div className="relative mt-12 md:mt-20 max-w-[1100px] mx-auto">
          {/* Blur orbs - hidden on mobile for performance */}
          <div className="hidden md:block absolute -left-20 top-1/4 w-[400px] h-[400px] rounded-full bg-[rgba(124, 58, 237,0.12)] blur-[80px] -z-10" />
          <div className="hidden md:block absolute -right-20 top-1/3 w-[300px] h-[300px] rounded-full bg-[rgba(37,99,235,0.08)] blur-[60px] -z-10" />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease }}
            className="rounded-2xl md:rounded-[20px] border border-[rgba(0,0,0,0.08)] overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 10px 40px rgba(0,0,0,0.10), 0 30px 80px rgba(0,0,0,0.06)' }}
          >
            {/* Browser bar - hidden on mobile */}
            <div className="hidden md:flex h-8 bg-[#f8fafc] border-b border-[#e2e8f0] items-center px-3 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white border border-[#e2e8f0] rounded-md px-3 py-0.5 text-[11px] text-[#94a3b8]">
                  app.korafinance.com.br
                </div>
              </div>
            </div>
            <HeroMockup />
          </motion.div>

          {/* Floating cards - desktop only */}
          <FloatingCard className="-left-10 xl:-left-16 top-8" delay={0}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-[11px] font-medium text-[#64748b]">Score Financeiro</span>
            </div>
            <span className="text-[28px] font-[900] text-[#0f172a] leading-none">847</span>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">
              ↑ +23 esse mês
            </div>
          </FloatingCard>

          <FloatingCard className="-right-10 xl:-right-16 top-4" delay={1}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#7c3aed]" />
              <span className="text-[11px] font-medium text-[#64748b]">Meta: Viagem</span>
            </div>
            <div className="w-36 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: '67%' }} />
            </div>
            <span className="text-[10px] text-[#94a3b8] mt-1 block">R$ 6.700 / R$ 10.000</span>
          </FloatingCard>

          <FloatingCard className="-left-6 xl:-left-12 bottom-16" delay={2}>
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-[#2563eb]" />
              <span className="text-[11px] font-semibold text-[#0f172a]">IA detectou algo</span>
            </div>
            <p className="text-[10px] text-[#64748b] italic max-w-[180px]">
              Gastos em alimentação 23% acima da média
            </p>
          </FloatingCard>

          <FloatingCard className="-right-6 xl:-right-12 bottom-20" delay={1.5}>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#f97316]" />
              <span className="text-[11px] font-semibold text-[#0f172a]">7 dias de streak 🔥</span>
            </div>
            <span className="text-[10px] text-[#64748b]">+150 XP conquistados hoje</span>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
