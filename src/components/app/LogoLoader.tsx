import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import koraIcon from '@/assets/korafinance-icon.png';

interface LogoLoaderProps {
  fullScreen?: boolean;
  label?: string;
}

const LogoLoader = forwardRef<HTMLDivElement, LogoLoaderProps>(function LogoLoader(
  { fullScreen = true, label },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const containerClass = fullScreen
    ? 'fixed inset-0 z-[9998] flex flex-col items-center justify-center'
    : 'absolute inset-0 w-full h-full min-h-screen flex flex-col items-center justify-center';

  return (
    <div
      ref={ref}
      className={`${containerClass} relative overflow-hidden`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, var(--color-bg-elevated) 0%, var(--color-bg-base) 56%, var(--color-bg-sunken) 100%)',
        gap: 24,
      }}
    >
      {/* Soft grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-strong) 1px, transparent 1px)',
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
            'radial-gradient(circle at 50% 42%, hsl(var(--primary) / 0.18), transparent 55%), radial-gradient(circle at 50% 60%, hsl(var(--primary) / 0.10), transparent 60%)',
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
                'conic-gradient(from 0deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary) / 0.42) 90deg, hsl(var(--primary) / 0.62) 180deg, hsl(var(--primary) / 0) 270deg)',
              filter: 'blur(8px)',
              opacity: reduceMotion ? 0.35 : 0.7,
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {[0, 1].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-[28px]"
              style={{
                border: '1.5px solid hsl(var(--primary) / 0.34)',
              }}
              initial={{ scale: 0.92, opacity: 0.55 }}
              animate={reduceMotion ? { scale: 1, opacity: 0.18 } : { scale: 1.5, opacity: 0 }}
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
              scale: reduceMotion ? 1 : [1, 1.04, 1],
              opacity: 1,
              y: reduceMotion ? 0 : [0, -2, 0],
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
                'linear-gradient(135deg, var(--color-green-500) 0%, var(--color-green-600) 55%, var(--color-green-700) 100%)',
              boxShadow:
                '0 22px 50px hsl(var(--primary) / 0.34), 0 0 0 1px var(--color-border-base), inset 0 1px 0 hsl(var(--primary-foreground) / 0.22)',
            }}
            aria-hidden
          >
            <img
              src={koraIcon}
              alt=""
              draggable={false}
              decoding="async"
              width={84}
              height={84}
              style={{ width: 84, height: 84, objectFit: 'cover' }}
            />
            {/* Glossy highlight */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, hsl(var(--primary-foreground) / 0.18) 0%, hsl(var(--primary-foreground) / 0) 45%)',
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
                  'linear-gradient(90deg, transparent, hsl(var(--primary-foreground) / 0.35), transparent)',
                filter: 'blur(2px)',
                transform: 'skewX(-20deg)',
              }}
              animate={reduceMotion ? undefined : { x: ['-120%', '260%'] }}
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
              letterSpacing: 0,
              color: 'var(--color-text-strong)',
            }}
          >
            Kora
          </span>
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 0,
              background: 'linear-gradient(90deg, var(--color-green-500), var(--color-green-300))',
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
            letterSpacing: 0,
            textTransform: 'uppercase',
            color: 'var(--color-text-subtle)',
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
            background: 'var(--color-border-weak)',
          }}
        >
          <motion.div
            className="absolute inset-y-0"
            style={{
              width: '45%',
              borderRadius: 999,
              background:
                'linear-gradient(90deg, transparent, var(--color-green-400) 40%, var(--color-green-300) 70%, transparent)',
            }}
            animate={reduceMotion ? { x: '70%' } : { x: ['-110%', '240%'] }}
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
              color: 'var(--color-text-muted)',
              fontWeight: 500,
              letterSpacing: 0,
            }}
          >
            {label}
          </motion.p>
        )}
      </div>
    </div>
  );
});

export default LogoLoader;
