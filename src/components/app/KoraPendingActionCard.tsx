// src/components/app/KoraPendingActionCard.tsx
//
// Card exibido dentro da conversa da Kora v2 quando a IA propõe uma ação
// que precisa de confirmação (create_transaction, create_budget, etc.).
// Botões "Confirmar" e "Rejeitar" chamam o hook useKora.

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import type { KoraPendingAction } from '@/hooks/useKora';

interface KoraPendingActionCardProps {
  action: KoraPendingAction;
  onConfirm: (actionId: string) => Promise<boolean>;
  onReject: (actionId: string) => Promise<boolean>;
}

type Status = 'idle' | 'confirming' | 'rejecting' | 'confirmed' | 'rejected' | 'error';

export default function KoraPendingActionCard({
  action,
  onConfirm,
  onReject,
}: KoraPendingActionCardProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleConfirm = async () => {
    setStatus('confirming');
    setErrMsg(null);
    const ok = await onConfirm(action.action_id);
    if (ok) {
      setStatus('confirmed');
    } else {
      setStatus('error');
      setErrMsg('Não consegui aplicar essa ação. Tenta de novo.');
    }
  };

  const handleReject = async () => {
    setStatus('rejecting');
    const ok = await onReject(action.action_id);
    if (ok) setStatus('rejected');
    else setStatus('error');
  };

  // Estado terminal: não mostra botões
  if (status === 'confirmed') {
    return (
      <div
        className="flex items-start gap-2 rounded-xl px-3 py-2.5"
        style={{
          background: 'var(--color-success-bg)',
          border: '1px solid var(--color-green-200)',
        }}
      >
        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-green-600)' }} />
        <span
          className="text-[12px] font-semibold leading-snug"
          style={{ color: 'var(--color-success-text)' }}
        >
          {action.description}
        </span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div
        className="flex items-start gap-2 rounded-xl px-3 py-2.5 opacity-60"
        style={{
          background: 'var(--color-bg-sunken)',
          border: '1px solid var(--color-border-weak)',
        }}
      >
        <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-subtle)' }} />
        <span
          className="text-[12px] leading-snug line-through"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          {action.description}
        </span>
      </div>
    );
  }

  const busy = status === 'confirming' || status === 'rejecting';

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-base)',
      }}
    >
      <p
        className="text-[13px] font-semibold leading-snug mb-2"
        style={{ color: 'var(--color-text-base)' }}
      >
        {action.description}
      </p>

      {errMsg && (
        <p
          className="text-[11px] mb-2"
          style={{ color: 'var(--color-danger-text)' }}
        >
          {errMsg}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-opacity disabled:opacity-60"
          style={{
            background: 'var(--color-green-600)',
            color: 'white',
          }}
          aria-label="Confirmar ação"
        >
          {status === 'confirming' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Confirmar
        </button>
        <button
          onClick={handleReject}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity disabled:opacity-60"
          style={{
            background: 'var(--color-bg-sunken)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border-weak)',
          }}
          aria-label="Rejeitar ação"
        >
          {status === 'rejecting' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Rejeitar
        </button>
      </div>
    </div>
  );
}
