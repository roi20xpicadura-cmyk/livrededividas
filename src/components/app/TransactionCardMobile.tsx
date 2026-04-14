import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/plans';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { haptic } from '@/lib/haptics';

const CATEGORY_EMOJI: Record<string, string> = {
  'Alimentação': '🍔', 'Transporte': '🚗', 'Moradia': '🏠', 'Saúde': '💊',
  'Educação': '📚', 'Lazer': '🎮', 'Roupas': '👗', 'Salário': '💰',
  'Freelance': '💻', 'Investimento': '📈', 'Outro': '📋', 'Assinaturas': '📺',
  'Supermercado': '🛒', 'Restaurante': '🍽️', 'Combustível': '⛽', 'Farmácia': '💊',
  'Internet': '🌐', 'Celular': '📱', 'Energia': '⚡', 'Água': '💧',
  'Aluguel': '🏘️', 'Pet': '🐾', 'Viagem': '✈️', 'Presente': '🎁',
};

interface Props {
  transaction: {
    id: string; description: string; amount: number; type: string;
    category: string; date: string; origin: string;
  };
  currency?: string;
  onDelete: (id: string) => void;
}

export default function TransactionCardMobile({ transaction: tx, currency = 'R$', onDelete }: Props) {
  const [offset, setOffset] = useState(0);
  const emoji = CATEGORY_EMOJI[tx.category] || '📋';
  const isExpense = tx.type === 'expense';

  const handleTouchStart = (e: React.TouchEvent) => {
    const startX = e.touches[0].clientX;
    const el = e.currentTarget;
    const handleMove = (ev: TouchEvent) => {
      const dx = ev.touches[0].clientX - startX;
      if (dx < 0) setOffset(Math.max(dx, -80));
    };
    const handleEnd = () => {
      if (offset < -40) { setOffset(-80); haptic.light(); }
      else setOffset(0);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
    };
    el.addEventListener('touchmove', handleMove);
    el.addEventListener('touchend', handleEnd);
  };

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 'var(--radius-xl)', marginBottom: 8 }}>
      {/* Delete button behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
        style={{ width: 80, background: 'var(--color-danger-solid)' }}>
        <button onClick={() => { haptic.medium(); onDelete(tx.id); }} className="tap-target">
          <Trash2 style={{ width: 20, height: 20, color: 'white' }} />
        </button>
      </div>

      {/* Card */}
      <motion.div
        animate={{ x: offset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onTouchStart={handleTouchStart}
        className="relative flex items-center gap-3"
        style={{
          padding: '14px 16px',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-weak)',
        }}
      >
        <div className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 42, height: 42, borderRadius: 'var(--radius-lg)',
            background: isExpense ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            fontSize: 18,
          }}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-strong)' }}>
            {tx.description}
          </p>
          <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
              {format(parseISO(tx.date), 'dd MMM', { locale: ptBR })}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)' }}>
              {tx.category}
            </span>
          </div>
        </div>
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: isExpense ? 'var(--color-danger-solid)' : 'var(--color-success-solid)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {isExpense ? '-' : '+'}{formatCurrency(tx.amount, currency)}
        </span>
      </motion.div>
    </div>
  );
}
