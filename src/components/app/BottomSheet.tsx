import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string;
}

/**
 * ResponsiveModal — renders as a bottom sheet on mobile, centered modal on desktop.
 */
export default function BottomSheet({ open, onClose, title, children, maxHeight = '90vh' }: BottomSheetProps) {
  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {isMobile ? (
            /* ── Mobile: Bottom Sheet ── */
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[301] overflow-y-auto pb-safe"
              style={{
                background: 'var(--color-bg-surface)',
                borderRadius: '24px 24px 0 0',
                maxHeight,
                padding: '0 20px 20px',
              }}
            >
              {/* Drag handle */}
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: 'var(--color-border-strong)',
                  borderRadius: 99,
                  margin: '12px auto 16px',
                }}
              />

              {/* Close button (always shown on mobile so user can dismiss) */}
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="flex items-center justify-center"
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-sunken)',
                  color: 'var(--color-text-muted)',
                  border: 'none',
                  zIndex: 2,
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>

              {title && (
                <div className="flex items-center mb-4" style={{ paddingRight: 44 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-strong)' }}>{title}</h3>
                </div>
              )}

              {children}
            </motion.div>
          ) : (
            /* ── Desktop: Centered Modal ── */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[301] flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && onClose()}
            >
              <div
                className="w-full overflow-y-auto relative"
                style={{
                  maxWidth: 480,
                  maxHeight,
                  background: 'var(--color-bg-surface)',
                  borderRadius: 'var(--radius-2xl)',
                  border: '1px solid var(--color-border-base)',
                  boxShadow: 'var(--shadow-2xl)',
                  padding: 24,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!title && (
                  <button
                    onClick={onClose}
                    aria-label="Fechar"
                    className="flex items-center justify-center transition-colors"
                    style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 32, height: 32,
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-bg-sunken)',
                      border: 'none', zIndex: 2,
                    }}
                  >
                    <X style={{ width: 18, height: 18 }} />
                  </button>
                )}
                {title && (
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-strong)' }}>{title}</h3>
                    <button
                      onClick={onClose}
                      className="flex items-center justify-center transition-colors"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-muted)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-sunken)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <X style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                )}
                {children}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
