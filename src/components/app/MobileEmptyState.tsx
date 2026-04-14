import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/haptics';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function MobileEmptyState({ icon: Icon, title, subtitle, ctaLabel, onCta }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px', minHeight: 320 }}>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="flex items-center justify-center"
        style={{
          width: 80, height: 80, borderRadius: 'var(--radius-2xl)',
          background: 'var(--color-green-50)', marginBottom: 20,
        }}
      >
        <Icon style={{ width: 36, height: 36, color: 'var(--color-green-600)' }} />
      </motion.div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-strong)', marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: 280 }}>{subtitle}</p>
      {ctaLabel && onCta && (
        <button
          onClick={() => { haptic.light(); onCta(); }}
          className="w-full"
          style={{
            marginTop: 24, height: 52, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-green-600)', color: 'white',
            fontSize: 16, fontWeight: 700, border: 'none', maxWidth: 280,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
