import { ReactNode } from 'react';
import { Loader2, Check } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface Props {
  children: ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  loading?: boolean;
}

export function MobileFormLayout({ children, onSubmit, submitLabel, loading }: Props) {
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 180px)' }}>
      <div className="flex-1 scroll-container" style={{ padding: '0 0 100px' }}>
        {children}
      </div>
      <div className="sticky bottom-0 left-0 right-0 pb-safe" style={{
        padding: '12px 0', background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border-weak)',
      }}>
        <button
          onClick={() => { haptic.medium(); onSubmit(); }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
          style={{
            height: 52, borderRadius: 'var(--radius-xl)',
            background: loading ? 'var(--color-text-disabled)' : 'var(--color-green-600)',
            color: 'white', fontSize: 16, fontWeight: 700, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} /> : <><Check style={{ width: 18, height: 18 }} />{submitLabel}</>}
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

export function MobileField({ label, helper, error, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="block" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {helper && !error && (
        <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4 }}>{helper}</p>
      )}
      {error && (
        <p style={{ fontSize: 11, color: 'var(--color-danger-solid)', marginTop: 4, fontWeight: 600 }}>⚠ {error}</p>
      )}
    </div>
  );
}
