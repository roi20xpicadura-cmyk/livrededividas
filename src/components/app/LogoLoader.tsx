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
  const deviceMemory = typeof navigator !== 'undefined'
    ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8)
    : 8;
  const performanceMode = reduceMotion || deviceMemory <= 4;

  return (
    <div
      ref={ref}
      className={`${containerClass} relative overflow-hidden isolate`}
      role="status"
      aria-live="polite"
      style={{
        background:
          'radial-gradient(ellipse at 50% 24%, hsl(var(--primary) / 0.12), transparent 42%), linear-gradient(180deg, var(--color-bg-elevated) 0%, var(--color-bg-base) 54%, var(--color-bg-sunken) 100%)',
        gap: 22,
        transform: 'translateZ(0)',
      }}
    >
      {!performanceMode && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.18), transparent 64%)',
            willChange: 'opacity, transform',
          }}
          animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.03, 1] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative flex flex-col items-center" style={{ gap: 22 }}>
        <div className="relative flex items-center justify-center" style={{ width: 124, height: 124 }}>
          <motion.span
            aria-hidden
            className="absolute"
            style={{
              inset: 12,
              borderRadius: '32px',
              border: '1px solid hsl(var(--primary) / 0.20)',
              boxShadow: '0 0 0 10px hsl(var(--primary) / 0.045), 0 24px 70px hsl(var(--primary) / 0.20)',
              willChange: performanceMode ? undefined : 'transform, opacity',
            }}
            animate={performanceMode ? undefined : { scale: [0.98, 1.06, 0.98], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 4 }}
            animate={{
              scale: performanceMode ? 1 : [1, 1.025, 1],
              opacity: 1,
              y: performanceMode ? 0 : [0, -2, 0],
            }}
            transition={{
              scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.32 },
            }}
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background:
                'linear-gradient(135deg, var(--color-green-500) 0%, var(--color-green-600) 55%, var(--color-green-700) 100%)',
              boxShadow:
                '0 20px 54px hsl(var(--primary) / 0.28), 0 0 0 1px hsl(var(--primary-foreground) / 0.16), inset 0 1px 0 hsl(var(--primary-foreground) / 0.22)',
              willChange: performanceMode ? undefined : 'transform',
            }}
            aria-hidden
          >
            <img
              src={koraIcon}
              alt=""
              draggable={false}
              decoding="sync"
              loading="eager"
              width={88}
              height={88}
              style={{ width: 88, height: 88, objectFit: 'cover' }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, hsl(var(--primary-foreground) / 0.18) 0%, hsl(var(--primary-foreground) / 0) 45%)',
              }}
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
