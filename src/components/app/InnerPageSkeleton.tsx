import { motion } from 'framer-motion';

/**
 * Lightweight skeleton shown WITHIN the AppLayout (header + bottom nav stay visible).
 * Avoids the jarring full-screen LogoLoader flash on every route change.
 */
export default function InnerPageSkeleton() {
  return (
    <div className="w-full flex flex-col" style={{ gap: 16, paddingTop: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
          style={{
            height: i === 0 ? 96 : 64,
            borderRadius: 16,
            background: 'var(--color-surface-subtle, rgba(124,58,237,0.06))',
            border: '1px solid var(--color-border-weak)',
          }}
        />
      ))}
    </div>
  );
}
