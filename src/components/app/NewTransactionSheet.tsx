import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCategories } from '@/lib/objectives';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  profileType: string;
  initialType?: 'income' | 'expense';
}

export default function NewTransactionSheet({ open, onClose, onSuccess, profileType, initialType = 'expense' }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [origin, setOrigin] = useState<'personal' | 'business'>(profileType === 'business' ? 'business' : 'personal');
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const cats = useMemo(() => getCategories(profileType, type), [profileType, type]);
  const flatCats = useMemo(() => {
    if (Array.isArray(cats) && typeof cats[0] === 'string') return cats as string[];
    return (cats as { group: string; items: string[] }[]).flatMap(g => g.items);
  }, [cats]);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setOrigin(profileType === 'business' ? 'business' : 'personal');
      setTimeout(() => amountRef.current?.focus(), 350);
    }
  }, [open, initialType, profileType]);

  useEffect(() => { setCategory(''); }, [type]);

  const canSubmit = !!amount && parseFloat(amount) > 0 && !!description.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    const finalOrigin = profileType === 'both' ? origin : (profileType === 'business' ? 'business' : 'personal');
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

  const accent = type === 'expense' ? '#dc2626' : '#16a34a';
  const accentBg = type === 'expense' ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)';

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

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ padding: '4px 0 16px' }}>
        {/* Type toggle */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18,
          background: 'var(--color-bg-sunken)', borderRadius: 12, padding: 4,
        }}>
          {[
            { id: 'expense' as const, label: '💸 Despesa', color: '#dc2626' },
            { id: 'income' as const, label: '💰 Receita', color: '#16a34a' },
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
            placeholder={type === 'expense' ? 'Ex: Supermercado, Uber, iFood...' : 'Ex: Salário, Freelance, Venda...'}
            style={{ ...inputBase, height: 48, fontSize: 15 }}
          />
        </div>

        {/* Category + Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <div style={{ position: 'relative' }}>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ ...inputBase, paddingRight: 32, appearance: 'none' }}>
                <option value="">Selecione...</option>
                {flatCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputBase} />
          </div>
        </div>

        {/* Origin (only for 'both') */}
        {profileType === 'both' && (
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
                    border: `1.5px solid ${origin === o.id ? '#16a34a' : 'var(--color-border-base)'}`,
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
              background: recurring ? '#16a34a' : 'var(--color-border-base)',
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
            boxShadow: canSubmit ? `0 4px 14px ${type === 'expense' ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)'}` : 'none',
            transition: 'all 200ms',
          }}>
          {submitting ? 'Salvando...' : type === 'expense' ? '💸 Registrar despesa' : '💰 Registrar receita'}
        </motion.button>
      </div>
    </BottomSheet>
  );
}
