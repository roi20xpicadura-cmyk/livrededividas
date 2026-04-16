import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoriesByProfile } from '@/lib/objectives';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  profileType: string;
  initialType?: 'income' | 'expense';
  /** When set, locks origin to this value and hides the origin picker. */
  forceOrigin?: 'personal' | 'business';
}

export default function NewTransactionSheet({ open, onClose, onSuccess, profileType, initialType = 'expense', forceOrigin }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const initialOrigin: 'personal' | 'business' =
    forceOrigin ?? (profileType === 'business' ? 'business' : 'personal');
  const [origin, setOrigin] = useState<'personal' | 'business'>(initialOrigin);
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const effectiveProfile: 'personal' | 'business' = forceOrigin ?? origin;
  const cats = useMemo(() => getCategoriesByProfile(type, effectiveProfile), [type, effectiveProfile]);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setOrigin(forceOrigin ?? (profileType === 'business' ? 'business' : 'personal'));
      setTimeout(() => amountRef.current?.focus(), 350);
    }
  }, [open, initialType, profileType, forceOrigin]);

  useEffect(() => { setCategory(''); }, [type, effectiveProfile]);

  const canSubmit = !!amount && parseFloat(amount) > 0 && !!description.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    const finalOrigin =
      forceOrigin ?? (profileType === 'both' ? origin : (profileType === 'business' ? 'business' : 'personal'));
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      origin: finalOrigin,
      category: category || 'Outros',
    });

    if (recurring && !error) {
      const day = parseInt(date.slice(8, 10));
      await supabase.from('recurring_transactions').insert({
        user_id: user.id,
        description: description.trim(),
        amount: parseFloat(amount),
        type,
        origin: finalOrigin,
        category: category || 'Outros',
        frequency: 'monthly',
        day_of_month: day,
        next_date: date,
        active: true,
      });
    }

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(type === 'income' ? '💰 Receita registrada!' : '💸 Despesa registrada!');
    setAmount(''); setDescription(''); setCategory(''); setRecurring(false);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    onSuccess?.();
    onClose();
  };

  const accent = type === 'expense' ? '#dc2626' : '#7C3AED';
  const accentBg = type === 'expense' ? 'rgba(220,38,38,0.2)' : 'rgba(124, 58, 237,0.2)';

  // Profile badge colors
  const isPersonal = effectiveProfile === 'personal';
  const badgeBg = isPersonal ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)';
  const badgeBorder = isPersonal ? 'rgba(124,58,237,0.25)' : 'rgba(37,99,235,0.25)';
  const badgeColor = isPersonal ? '#7C3AED' : '#2563eb';

  // Show profile badge whenever the sheet is locked to a profile (force) OR profile is 'both' and user picked one
  const showProfileBadge = !!forceOrigin || profileType === 'both';

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6,
  };
  const inputBase: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 14px',
    background: 'var(--color-bg-sunken)',
    border: '1.5px solid var(--color-border-base)',
    borderRadius: 12, fontSize: 14, fontWeight: 600,
    color: 'var(--color-text-base)', outline: 'none',
  };

  const placeholderText = type === 'expense'
    ? (effectiveProfile === 'business'
        ? 'Ex: Fornecedor, Marketing, Aluguel...'
        : 'Ex: Supermercado, Academia, Netflix...')
    : (effectiveProfile === 'business'
        ? 'Ex: Venda, Serviço prestado...'
        : 'Ex: Salário, Freelance, Bônus...');

  const submitLabel = submitting
    ? 'Salvando...'
    : type === 'expense'
      ? `💸 Registrar despesa ${effectiveProfile === 'business' ? 'do negócio' : 'pessoal'}`
      : `💰 Registrar receita ${effectiveProfile === 'business' ? 'do negócio' : 'pessoal'}`;

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ padding: '4px 0 16px' }}>
        {/* Profile badge */}
        {showProfileBadge && (
          <div style={{ display: 'flex', marginBottom: 14 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: badgeBg, border: `1px solid ${badgeBorder}`,
              borderRadius: 99, padding: '4px 12px',
            }}>
              <span style={{ fontSize: 12 }}>{isPersonal ? '🏠' : '💼'}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: badgeColor, letterSpacing: '0.02em' }}>
                {isPersonal ? 'Lançamento Pessoal' : 'Lançamento Negócio'}
              </span>
            </span>
          </div>
        )}

        {/* Type toggle */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18,
          background: 'var(--color-bg-sunken)', borderRadius: 12, padding: 4,
        }}>
          {[
            { id: 'expense' as const, label: '💸 Despesa', color: '#dc2626' },
            { id: 'income' as const, label: '💰 Receita', color: '#7C3AED' },
          ].map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              style={{
                height: 40, borderRadius: 9, border: 'none',
                background: type === t.id ? 'var(--color-bg-surface)' : 'transparent',
                fontSize: 14, fontWeight: 700,
                color: type === t.id ? t.color : 'var(--color-text-muted)',
                cursor: 'pointer',
                boxShadow: type === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Amount HERO */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={labelStyle}>Valor</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>R$</span>
            <input
              ref={amountRef}
              type="text" inputMode="decimal" pattern="[0-9.,]*"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(',', '.'))}
              placeholder="0,00"
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.03em', color: accent,
                width: 200, textAlign: 'center',
              }}
            />
          </div>
          <div style={{ height: 2, background: accentBg, borderRadius: 99, margin: '4px auto 0', width: '60%' }} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={placeholderText}
            style={{ ...inputBase, height: 48, fontSize: 15 }}
          />
        </div>

        {/* Category grid (profile-aware) */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Categoria</label>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
            maxHeight: 220, overflowY: 'auto', paddingRight: 2,
          }}>
            {cats.map(c => {
              const selected = category === c.label;
              return (
                <button key={c.label} type="button" onClick={() => setCategory(c.label)}
                  style={{
                    padding: '10px 4px',
                    background: selected ? 'rgba(124,58,237,0.18)' : 'var(--color-bg-sunken)',
                    border: `1px solid ${selected ? 'rgba(124,58,237,0.45)' : 'var(--color-border-weak)'}`,
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all 120ms',
                  }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{c.emoji}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: selected ? '#7C3AED' : 'var(--color-text-muted)',
                    textAlign: 'center', lineHeight: 1.25,
                  }}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputBase} />
        </div>

        {/* Origin picker — only when 'both' AND not forced by route */}
        {profileType === 'both' && !forceOrigin && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Origem</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { id: 'personal' as const, label: '🏠 Pessoal' },
                { id: 'business' as const, label: '💼 Negócio' },
              ]).map(o => (
                <button key={o.id} onClick={() => setOrigin(o.id)}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: `1.5px solid ${origin === o.id ? '#7C3AED' : 'var(--color-border-base)'}`,
                    background: origin === o.id ? 'var(--color-success-bg)' : 'var(--color-bg-surface)',
                    fontSize: 13, fontWeight: 700,
                    color: origin === o.id ? 'var(--color-success-text)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recurring toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: 'var(--color-bg-sunken)',
          borderRadius: 12, marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-base)' }}>Recorrente</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>Se repete todo mês</div>
          </div>
          <button onClick={() => setRecurring(!recurring)}
            style={{
              position: 'relative', width: 40, height: 22, borderRadius: 99, border: 'none',
              background: recurring ? '#7C3AED' : 'var(--color-border-base)',
              cursor: 'pointer', transition: 'background 150ms',
            }}>
            <span style={{
              position: 'absolute', top: 2, left: recurring ? 20 : 2,
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 150ms',
            }} />
          </button>
        </div>

        {/* Submit */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!canSubmit || submitting}
          style={{
            width: '100%', height: 52,
            background: !canSubmit ? 'var(--color-bg-sunken)' : accent,
            border: 'none', borderRadius: 14,
            color: !canSubmit ? 'var(--color-text-disabled)' : 'white',
            fontSize: 15, fontWeight: 800,
            cursor: !canSubmit ? 'not-allowed' : 'pointer',
            boxShadow: canSubmit ? `0 4px 14px ${type === 'expense' ? 'rgba(220,38,38,0.3)' : 'rgba(124, 58, 237,0.3)'}` : 'none',
            transition: 'all 200ms',
          }}>
          {submitLabel}
        </motion.button>
      </div>
    </BottomSheet>
  );
}
