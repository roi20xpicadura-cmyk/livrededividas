import { motion } from 'framer-motion';
import koraIcon from '@/assets/korafinance-icon.png';

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
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, #0f172a 0%, #050816 70%)',
        gap: 24,
      }}
    >
      {/* Soft grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 65%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 65%)',
        }}
      />

      {/* Ambient gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(124,58,237,0.28), transparent 55%), radial-gradient(circle at 50% 60%, rgba(34,197,94,0.16), transparent 60%)',
        }}
      />

      <div className="relative flex flex-col items-center" style={{ gap: 22 }}>
        {/* Logo with pulsing rings */}
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
          {/* Conic rotating ring */}
          <motion.span
            aria-hidden
            className="absolute"
            style={{
              inset: -6,
              borderRadius: '28px',
              background:
                'conic-gradient(from 0deg, rgba(124,58,237,0) 0deg, rgba(124,58,237,0.55) 90deg, rgba(34,197,94,0.55) 180deg, rgba(124,58,237,0) 270deg)',
              filter: 'blur(8px)',
              opacity: 0.7,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {[0, 1].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-[28px]"
              style={{
                border: '1.5px solid rgba(167,139,250,0.40)',
              }}
              initial={{ scale: 0.92, opacity: 0.55 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 1.2,
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{
              scale: [1, 1.04, 1],
              opacity: 1,
              y: [0, -2, 0],
            }}
            transition={{
              scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.5 },
            }}
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              background:
                'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
              boxShadow:
                '0 22px 50px rgba(124,58,237,0.45), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
            aria-hidden
          >
            <img
              src={koraIcon}
              alt=""
              draggable={false}
              style={{ width: 84, height: 84, objectFit: 'cover' }}
            />
            {/* Glossy highlight */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%)',
              }}
            />
            {/* Shine sweep */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                top: 0,
                bottom: 0,
                width: '40%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                filter: 'blur(2px)',
                transform: 'skewX(-20deg)',
              }}
              animate={{ x: ['-120%', '260%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
            />
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-baseline"
          style={{ gap: 1 }}
        >
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              color: '#f8fafc',
            }}
          >
            Kora
          </span>
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              background: 'linear-gradient(90deg, #a78bfa, #c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Finance
          </span>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{
            marginTop: -8,
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(203,213,225,0.55)',
            fontWeight: 600,
          }}
        >
          IA financeira pessoal
        </motion.p>

        {/* Animated progress bar */}
        <div
          className="relative overflow-hidden"
          style={{
            width: 160,
            height: 2,
            borderRadius: 999,
            background: 'rgba(148,163,184,0.14)',
          }}
        >
          <motion.div
            className="absolute inset-y-0"
            style={{
              width: '45%',
              borderRadius: 999,
              background:
                'linear-gradient(90deg, transparent, #a78bfa 40%, #22c55e 70%, transparent)',
            }}
            animate={{ x: ['-110%', '240%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {label && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 13,
              color: 'rgba(148,163,184,0.85)',
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
