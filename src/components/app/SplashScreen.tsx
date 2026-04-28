import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import koraIcon from '@/assets/korafinance-icon.png';

const SplashScreen = forwardRef<HTMLDivElement>(function SplashScreen(_, ref) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      // Background hardcoded como fallback caso CSS vars não tenham carregado.
      style={{ background: 'var(--color-bg-base, hsl(var(--background)))' }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
        style={{ gap: 16 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-2xl)',
            background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
            boxShadow: '0 12px 40px hsl(var(--primary) / 0.26), 0 0 0 1px var(--color-border-base)',
          }}
        >
          <img
            src={koraIcon}
            alt=""
            draggable={false}
            decoding="async"
            width={72}
            height={72}
            style={{ width: 72, height: 72, objectFit: 'cover' }}
          />
        </motion.div>

        <div className="flex items-center" style={{ gap: 4 }}>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text-strong)' }}
          >
            Kora
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-green-600)' }}
          >
            Finance
          </motion.span>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{ fontSize: 13, color: 'var(--color-text-subtle)', fontWeight: 500 }}
        >
          Controle total das suas finanças
        </motion.p>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute flex"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 48px)', gap: 6 }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={reduceMotion ? { opacity: 0.65 } : { scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-green-500)',
            }}
          />
        ))}
      </motion.div>
    </div>
  );
});

export default SplashScreen;
