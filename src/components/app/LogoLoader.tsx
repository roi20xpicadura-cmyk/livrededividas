import { motion } from 'framer-motion';

interface LogoLoaderProps {
  fullScreen?: boolean;
  label?: string;
}

export default function LogoLoader({ fullScreen = false, label }: LogoLoaderProps) {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-[9998] flex flex-col items-center justify-center'
    : 'min-h-[60vh] w-full flex flex-col items-center justify-center';

  return (
    <div className={containerClass} style={{ background: 'var(--color-bg-base, #0b0f14)', gap: 16 }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center"
        style={{ gap: 10 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, -6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-2xl)',
            background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
            boxShadow: '0 10px 30px rgba(34,197,94,0.25)',
            fontSize: 30,
          }}
          aria-hidden
        >
          🐨
        </motion.div>
        <div className="flex items-baseline" style={{ gap: 2 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text-strong)' }}>
            Kora
          </span>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-green-600)' }}>
            Finance
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex"
        style={{ gap: 6 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-green-500)',
            }}
          />
        ))}
      </motion.div>

      {label && (
        <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', fontWeight: 500 }}>
          {label}
        </p>
      )}
    </div>
  );
}
