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
    <div
      className={`${containerClass} relative overflow-hidden`}
      style={{ background: 'var(--color-bg-base, #0b0f14)', gap: 24 }}
    >
      {/* Ambient gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(34,197,94,0.18), transparent 55%)',
        }}
      />

      <div className="relative flex flex-col items-center" style={{ gap: 20 }}>
        {/* Logo with pulsing rings */}
        <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                border: '1.5px solid rgba(34,197,94,0.45)',
              }}
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 1,
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: [1, 1.06, 1],
              opacity: 1,
              y: [0, -3, 0],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.4 },
            }}
            className="relative flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-2xl, 20px)',
              background:
                'linear-gradient(135deg, var(--color-green-500, #22c55e), var(--color-green-700, #15803d))',
              boxShadow:
                '0 18px 40px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              fontSize: 34,
            }}
            aria-hidden
          >
            🐨
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-baseline"
          style={{ gap: 2 }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-strong, #f8fafc)',
            }}
          >
            Kora
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-green-500, #22c55e)',
            }}
          >
            Finance
          </span>
        </motion.div>

        {/* Animated progress bar */}
        <div
          className="relative overflow-hidden"
          style={{
            width: 140,
            height: 3,
            borderRadius: 999,
            background: 'rgba(148,163,184,0.18)',
          }}
        >
          <motion.div
            className="absolute inset-y-0"
            style={{
              width: '40%',
              borderRadius: 999,
              background:
                'linear-gradient(90deg, transparent, var(--color-green-500, #22c55e), transparent)',
            }}
            animate={{ x: ['-100%', '250%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {label && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 13,
              color: 'var(--color-text-subtle, #94a3b8)',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </motion.p>
        )}
      </div>
    </div>
  );
}
