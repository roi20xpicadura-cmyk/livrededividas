import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

function CountUp({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return (
    <span ref={ref} className="text-[clamp(36px,5vw,48px)] font-black text-primary tabular-nums">
      {prefix}{value.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

const stats = [
  { target: 2000, prefix: '+', suffix: '', label: 'Empreendedores ativos' },
  { target: 48, prefix: 'R$ ', suffix: 'M+', label: 'Transações processadas' },
  { target: 98, prefix: '', suffix: '%', label: 'Taxa de satisfação' },
  { target: 4.9, prefix: '', suffix: '★', label: 'Avaliação média' },
];

export default function MetricsSection() {
  return (
    <section className="py-16 md:py-20 px-4 bg-fin-green-pale border-t border-b border-fin-green-border">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {s.target === 4.9 ? (
              <span className="text-[clamp(36px,5vw,48px)] font-black text-primary tabular-nums">4.9★</span>
            ) : (
              <CountUp target={s.target} prefix={s.prefix} suffix={s.suffix} />
            )}
            <p className="text-sm font-semibold text-fin-green-dark/70 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
