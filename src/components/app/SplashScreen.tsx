import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
        style={{ gap: 16 }}
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-2xl)',
            background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
            boxShadow: '0 12px 40px rgba(22, 163, 74, 0.3)',
          }}
        >
          <BarChart3 className="text-white" style={{ width: 36, height: 36 }} />
        </motion.div>

        <div className="flex items-center" style={{ gap: 4 }}>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text-strong)' }}
          >
            KoraFinance
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-green-600)' }}
          >
            Pro
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
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
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
}
