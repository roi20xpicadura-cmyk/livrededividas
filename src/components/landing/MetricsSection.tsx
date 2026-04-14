import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { useEffect, useRef, useState } from 'react';

function StatItem({ value, suffix, label, index }: { value: number; suffix: string; label: string; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = useCountUp(visible ? value : 0, 2000, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={`text-center py-4 md:py-6 ${index < 3 ? 'md:border-r md:border-[#e2e8f0]' : ''}`}
    >
      <div className="text-[32px] md:text-[56px] font-[900] text-[#0f172a] tracking-[-1px] md:tracking-[-2px] leading-none">
        {value > 100 ? count.toLocaleString('pt-BR') : count}{suffix}
      </div>
      <div className="text-[12px] md:text-[15px] text-[#64748b] mt-1 md:mt-2">{label}</div>
    </motion.div>
  );
}

export default function MetricsSection() {
  return (
    <section className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-[1000px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0">
        <StatItem value={2400} suffix="+" label="usuários ativos" index={0} />
        <StatItem value={4} suffix="M+" label="em finanças gerenciadas" index={1} />
        <StatItem value={8} suffix="%" label="taxa de cancelamento" index={2} />
        <StatItem value={49} suffix="" label="avaliação 4.9 ★" index={3} />
      </div>
    </section>
  );
}
