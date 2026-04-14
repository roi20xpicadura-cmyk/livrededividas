import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Plus, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { getCategories } from '@/lib/objectives';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BottomSheet from './BottomSheet';

interface QuickAddFABProps {
  embedded?: boolean;
}

export default function QuickAddFAB({ embedded }: QuickAddFABProps = {}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { config } = useProfile();
  const profileType = config?.profile_type || 'personal';

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const [cat, setCat] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const descRef = useRef<HTMLInputElement>(null);

  const cats = useMemo(() => getCategories(profileType, type), [profileType, type]);
  const flatCats = useMemo(() => {
    if (Array.isArray(cats) && typeof cats[0] === 'string') return cats as string[];
    return (cats as { group: string; items: string[] }[]).flatMap(g => g.items);
  }, [cats]);

  useEffect(() => {
    if (open) setTimeout(() => descRef.current?.focus(), 400);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const v = parseFloat(val);
    if (!desc.trim() || isNaN(v) || v <= 0 || !cat) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      date,
      description: desc.trim(),
      amount: v,
      type,
      origin: profileType === 'personal' ? 'personal' : 'business',
      category: cat,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('✓ Lançamento adicionado!');
    setDesc('');
    setVal('');
    setCat('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setOpen(false);
  }, [user, desc, val, cat, date, type, profileType]);

  return (
    <>
      {/* FAB Button */}
      <motion.button
        onClick={() => { setOpen(true); if ('vibrate' in navigator) navigator.vibrate(20); }}
        className={embedded ? 'flex items-center justify-center' : 'fixed z-[45] flex items-center justify-center'}
        style={embedded ? {
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--color-green-600)',
          boxShadow: 'var(--shadow-lg)', color: 'white',
        } : {
          bottom: 84, right: 16,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--color-green-600)',
          boxShadow: 'var(--shadow-xl)', color: 'white',
        }}
        whileTap={{ scale: 0.88, rotate: 45 }}
        aria-label="Adicionar lançamento rápido"
      >
        <Plus style={{ width: 24, height: 24 }} />
      </motion.button>

      {/* Quick Add Bottom Sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Novo lançamento rápido">
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setCat(''); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold border-2 transition-all"
                style={{
                  borderColor: type === t
                    ? t === 'income' ? 'var(--color-success-solid)' : 'var(--color-danger-solid)'
                    : 'var(--color-border-base)',
                  background: type === t
                    ? t === 'income' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'
                    : 'transparent',
                  color: type === t
                    ? t === 'income' ? 'var(--color-success-text)' : 'var(--color-danger-text)'
                    : 'var(--color-text-muted)',
                  minHeight: 48,
                }}
              >
                {t === 'income' ? <ArrowUp style={{ width: 16, height: 16 }} /> : <ArrowDown style={{ width: 16, height: 16 }} />}
                {t === 'income' ? 'Receita' : 'Despesa'}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Descrição
            </label>
            <input
              ref={descRef}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Supermercado Extra"
              style={{
                width: '100%',
                height: 52,
                padding: '0 14px',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--color-border-base)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-base)',
                outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-green-600)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border-base)'; }}
            />
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.,]*"
                  value={val}
                  onChange={e => setVal(e.target.value)}
                  placeholder="0,00"
                  style={{
                    width: '100%',
                    height: 52,
                    paddingLeft: 32,
                    paddingRight: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-xl)',
                    border: '1.5px solid var(--color-border-base)',
                    background: 'var(--color-bg-surface)',
                    color: 'var(--color-text-base)',
                    outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-green-600)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border-base)'; }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  height: 52,
                  padding: '0 14px',
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xl)',
                  border: '1.5px solid var(--color-border-base)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-base)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Categoria
            </label>
            <div className="relative">
              <select
                value={cat}
                onChange={e => setCat(e.target.value)}
                style={{
                  width: '100%',
                  height: 52,
                  padding: '0 36px 0 14px',
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xl)',
                  border: '1.5px solid var(--color-border-base)',
                  background: 'var(--color-bg-surface)',
                  color: cat ? 'var(--color-text-base)' : 'var(--color-text-disabled)',
                  appearance: 'none',
                  outline: 'none',
                }}
              >
                <option value="">Selecione...</option>
                {flatCats.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !desc.trim() || !val || !cat}
            className="w-full transition-all"
            style={{
              height: 52,
              borderRadius: 'var(--radius-xl)',
              background: submitting ? 'var(--color-text-disabled)' : 'var(--color-green-600)',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: !desc.trim() || !val || !cat ? 0.5 : 1,
            }}
          >
            {submitting ? 'Adicionando...' : 'Adicionar lançamento'}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
