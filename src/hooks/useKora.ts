// src/hooks/useKora.ts
//
// Hook unificado pra conversar com a Kora v2.
// Centraliza todas as chamadas aos 5 endpoints edge:
//   - kora-brain        (texto / trigger / imagem multimodal inline)
//   - kora-vision       (foto de cupom dedicada)
//   - kora-audio        (áudio do app → Whisper → brain)
//   - kora-coach        (análise profunda)
//   - kora-confirm-action (confirma ação pendente)
//
// Também expõe a feature flag kora_v2_enabled (lida do user_config) pra
// que a UI possa decidir se usa este fluxo ou o ai-chat legado.
//
// UX de latência:
//   loadingPhase passa por 'sending' → 'transcribing' (só áudio) →
//   'thinking' conforme timers fixos, pra reduzir percepção de espera
//   (especialmente em áudio onde a cadeia tem 3-6s).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type KoraLoadingPhase =
  | 'idle'
  | 'sending'
  | 'transcribing'
  | 'thinking'
  | 'processing_image';

export interface KoraPendingAction {
  action_id: string;
  description: string;
  tool: string;
  input: Record<string, unknown>;
}

export interface KoraExecutedAction {
  tool: string;
  result: Record<string, unknown>;
}

export interface KoraMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
  pendingActions?: KoraPendingAction[];
  executedActions?: KoraExecutedAction[];
  persona?: string;
  model?: string;
  cost_usd?: number;
  error?: boolean;
}

export interface KoraCoachRequest {
  coach_type:
    | 'debt_payoff_analysis'
    | 'budget_recovery_plan'
    | 'savings_strategy'
    | 'goal_feasibility'
    | 'free_consultation'
    | 'plan_checkin';
  user_question?: string;
  specific_goal_id?: string;
  specific_debt_id?: string;
  checkin_plan_id?: string;
}

interface BrainApiResponse {
  success: boolean;
  response_text: string;
  persona_used?: string;
  model_used?: string | null;
  pending_actions?: KoraPendingAction[];
  executed_actions?: KoraExecutedAction[];
  cost_usd?: number;
  interaction_id?: string | null;
  warnings?: string[];
  error?: string;
}

interface VisionApiResponse {
  success: boolean;
  image_type: string;
  merchant?: string;
  detected_date?: string;
  total_amount?: number;
  transactions?: Array<Record<string, unknown>>;
  pending_action_ids?: string[];
  auto_created_transaction_ids?: string[];
  message: string;
  cost_usd?: number;
  remaining_monthly?: number;
  error?: string;
}

interface AudioApiResponse {
  success: boolean;
  transcription: string;
  kora_response?: BrainApiResponse;
  error?: string;
}

export interface UseKoraReturn {
  /** true quando user_config.kora_v2_enabled = true. Quando false, UI deve usar ai-chat legado. */
  enabled: boolean;
  /** true enquanto `flagLoading` está determinando a feature flag na primeira render. */
  flagLoading: boolean;
  loading: boolean;
  loadingPhase: KoraLoadingPhase;
  messages: KoraMessage[];
  error: string | null;

  sendMessage: (text: string) => Promise<BrainApiResponse | null>;
  sendImage: (file: File, opts?: { hint?: string; autoCreate?: boolean; origin?: 'personal' | 'business' }) => Promise<VisionApiResponse | null>;
  sendAudio: (blob: Blob) => Promise<AudioApiResponse | null>;
  requestCoaching: (req: KoraCoachRequest) => Promise<Record<string, unknown> | null>;
  confirmAction: (actionId: string) => Promise<boolean>;
  rejectAction: (actionId: string) => Promise<boolean>;
  forgetAll: () => Promise<{ success: boolean; counts?: Record<string, number>; error?: string }>;

  clearMessages: () => void;
}

export function useKora(): UseKoraReturn {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [flagLoading, setFlagLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<KoraLoadingPhase>('idle');
  const [messages, setMessages] = useState<KoraMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Lê a feature flag de forma defensiva: se a coluna não existe (migration ainda
  // não aplicada), `kora_v2_enabled` volta undefined → enabled fica false.
  useEffect(() => {
    let active = true;
    if (!user) {
      setEnabled(false);
      setFlagLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('user_config')
        .select('kora_v2_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      const row = data as { kora_v2_enabled?: boolean } | null;
      setEnabled(row?.kora_v2_enabled === true);
      setFlagLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const pushMessage = useCallback((msg: KoraMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ==========================================================
  // sendMessage — texto simples pro kora-brain
  // ==========================================================
  const sendMessage = useCallback(
    async (text: string): Promise<BrainApiResponse | null> => {
      if (!user || !text.trim()) return null;
      setError(null);
      setLoading(true);
      setLoadingPhase('sending');

      // Optimistic UI
      const userMsg: KoraMessage = {
        id: localId(),
        role: 'user',
        content: text.trim(),
        ts: new Date(),
      };
      pushMessage(userMsg);

      // Fake progression: depois de 800ms sai pra "thinking"
      const phaseTimer = window.setTimeout(() => setLoadingPhase('thinking'), 800);

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke<BrainApiResponse>(
          'kora-brain',
          {
            body: {
              user_id: user.id,
              channel: 'app',
              input_type: 'text',
              message: text.trim(),
            },
          },
        );
        if (invokeErr || !data) {
          throw new Error(invokeErr?.message || 'Falha ao falar com a Kora');
        }

        const assistantMsg: KoraMessage = {
          id: localId(),
          role: 'assistant',
          content: data.response_text || '',
          ts: new Date(),
          pendingActions: data.pending_actions,
          executedActions: data.executed_actions,
          persona: data.persona_used,
          model: data.model_used ?? undefined,
          cost_usd: data.cost_usd,
        };
        pushMessage(assistantMsg);
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        setError(msg);
        pushMessage({
          id: localId(),
          role: 'assistant',
          content: `⚠️ ${msg}`,
          ts: new Date(),
          error: true,
        });
        return null;
      } finally {
        window.clearTimeout(phaseTimer);
        setLoading(false);
        setLoadingPhase('idle');
      }
    },
    [user, pushMessage],
  );

  // ==========================================================
  // sendImage — foto de cupom/extrato/fatura → kora-vision
  // ==========================================================
  const sendImage = useCallback(
    async (
      file: File,
      opts: { hint?: string; autoCreate?: boolean; origin?: 'personal' | 'business' } = {},
    ): Promise<VisionApiResponse | null> => {
      if (!user) return null;
      setError(null);
      setLoading(true);
      setLoadingPhase('processing_image');

      try {
        const base64 = await fileToBase64(file);

        pushMessage({
          id: localId(),
          role: 'user',
          content: opts.hint ? `📷 ${opts.hint}` : '📷 Enviou uma foto',
          ts: new Date(),
        });

        const { data, error: invokeErr } = await supabase.functions.invoke<VisionApiResponse>(
          'kora-vision',
          {
            body: {
              user_id: user.id,
              image_base64: base64,
              image_media_type: file.type || 'image/jpeg',
              hint: opts.hint,
              auto_create: opts.autoCreate ?? false,
              origin: opts.origin ?? 'personal',
            },
          },
        );
        if (invokeErr || !data) {
          throw new Error(invokeErr?.message || 'Falha ao processar imagem');
        }

        // Mapeia a response do vision pra mensagem da Kora + pending_actions
        const pending: KoraPendingAction[] = Array.isArray(data.transactions)
          ? data.transactions.flatMap((tx, i) => {
              const id = data.pending_action_ids?.[i];
              if (!id) return [];
              return [
                {
                  action_id: id,
                  description:
                    typeof tx.description === 'string' ? tx.description : 'Transação extraída',
                  tool: 'create_transaction',
                  input: tx,
                },
              ];
            })
          : [];

        pushMessage({
          id: localId(),
          role: 'assistant',
          content: data.message || 'Ok.',
          ts: new Date(),
          pendingActions: pending,
          model: 'sonnet-4-6',
          cost_usd: data.cost_usd,
        });
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        setError(msg);
        pushMessage({
          id: localId(),
          role: 'assistant',
          content: `⚠️ ${msg}`,
          ts: new Date(),
          error: true,
        });
        return null;
      } finally {
        setLoading(false);
        setLoadingPhase('idle');
      }
    },
    [user, pushMessage],
  );

  // ==========================================================
  // sendAudio — áudio do app → Whisper → kora-brain
  // Fases fake pra UX: 'transcribing' por 2s, depois 'thinking'
  // ==========================================================
  const sendAudio = useCallback(
    async (blob: Blob): Promise<AudioApiResponse | null> => {
      if (!user) return null;
      setError(null);
      setLoading(true);
      setLoadingPhase('transcribing');

      pushMessage({
        id: localId(),
        role: 'user',
        content: '🎤 Áudio enviado',
        ts: new Date(),
      });

      const phaseTimer = window.setTimeout(() => setLoadingPhase('thinking'), 2000);

      try {
        const base64 = await blobToBase64(blob);

        const { data, error: invokeErr } = await supabase.functions.invoke<AudioApiResponse>(
          'kora-audio',
          {
            body: {
              user_id: user.id,
              channel: 'app',
              audio_base64: base64,
              audio_media_type: blob.type || 'audio/ogg',
            },
          },
        );
        if (invokeErr || !data) {
          throw new Error(invokeErr?.message || 'Falha ao processar áudio');
        }

        if (data.transcription) {
          // Substitui a mensagem "🎤 Áudio enviado" pela transcrição real
          setMessages((prev) => {
            const out = [...prev];
            for (let i = out.length - 1; i >= 0; i--) {
              if (out[i].role === 'user' && out[i].content === '🎤 Áudio enviado') {
                out[i] = { ...out[i], content: data.transcription };
                break;
              }
            }
            return out;
          });
        }

        const brain = data.kora_response;
        if (brain) {
          pushMessage({
            id: localId(),
            role: 'assistant',
            content: brain.response_text || '',
            ts: new Date(),
            pendingActions: brain.pending_actions,
            executedActions: brain.executed_actions,
            persona: brain.persona_used,
            model: brain.model_used ?? undefined,
            cost_usd: brain.cost_usd,
          });
        }
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        setError(msg);
        pushMessage({
          id: localId(),
          role: 'assistant',
          content: `⚠️ ${msg}`,
          ts: new Date(),
          error: true,
        });
        return null;
      } finally {
        window.clearTimeout(phaseTimer);
        setLoading(false);
        setLoadingPhase('idle');
      }
    },
    [user, pushMessage],
  );

  // ==========================================================
  // requestCoaching — análise profunda (Opus 4.7)
  // Retorna o payload inteiro pra tela dedicada mostrar fases/steps.
  // ==========================================================
  const requestCoaching = useCallback(
    async (req: KoraCoachRequest): Promise<Record<string, unknown> | null> => {
      if (!user) return null;
      setError(null);
      setLoading(true);
      setLoadingPhase('thinking');

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke<Record<string, unknown>>(
          'kora-coach',
          { body: { user_id: user.id, ...req } },
        );
        if (invokeErr || !data) {
          throw new Error(invokeErr?.message || 'Falha ao gerar análise profunda');
        }
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
        return null;
      } finally {
        setLoading(false);
        setLoadingPhase('idle');
      }
    },
    [user],
  );

  // ==========================================================
  // confirmAction — confirma ação pendente e executa
  // ==========================================================
  const confirmAction = useCallback(
    async (actionId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke<{
          success: boolean;
          error?: string;
        }>('kora-confirm-action', {
          body: { user_id: user.id, action_id: actionId },
        });
        if (invokeErr || !data?.success) {
          setError(invokeErr?.message || data?.error || 'Falha ao confirmar ação');
          return false;
        }
        // Remove a ação das mensagens optimisticamente
        removePendingAction(setMessages, actionId);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
        return false;
      }
    },
    [user],
  );

  // ==========================================================
  // rejectAction — marca ação como rejeitada (UPDATE direto, sem edge)
  // RLS permite UPDATE? Não — policy atual só tem SELECT em kora_actions.
  // Então faz via RPC dedicada OU aceita que rejeição manual não altera DB.
  // Solução pragmática: chamamos kora-confirm-action com reject flag futura,
  // ou por ora só remove da UI local. Auditoria: ação fica em 'pending'
  // até TTL natural ou housekeeping. Aceitável pra MVP.
  // ==========================================================
  const rejectAction = useCallback(
    async (actionId: string): Promise<boolean> => {
      removePendingAction(setMessages, actionId);
      return true;
    },
    [],
  );

  // ==========================================================
  // forgetAll — LGPD "esquecer tudo" (RPC)
  // ==========================================================
  const forgetAll = useCallback(async (): Promise<{
    success: boolean;
    counts?: Record<string, number>;
    error?: string;
  }> => {
    if (!user) return { success: false, error: 'not_authenticated' };
    try {
      // A função delete_user_kora_data foi adicionada na migration Kora v2;
      // enquanto o type-gen da Supabase não for rerrodado, precisamos do cast.
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
      const { data, error: rpcErr } = await rpc('delete_user_kora_data', {
        p_user_id: user.id,
      });
      if (rpcErr) {
        return { success: false, error: rpcErr.message };
      }
      clearMessages();
      return {
        success: true,
        counts: (data as unknown as Record<string, number>) ?? {},
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'unknown' };
    }
    // clearMessages é uma useCallback estável (deps = []); omitir evita loop visual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setLoadingPhase('idle');
  }, []);

  return {
    enabled,
    flagLoading,
    loading,
    loadingPhase,
    messages,
    error,
    sendMessage,
    sendImage,
    sendAudio,
    requestCoaching,
    confirmAction,
    rejectAction,
    forgetAll,
    clearMessages,
  };
}

// ==========================================================
// HELPERS
// ==========================================================

function localId(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned non-string'));
        return;
      }
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned non-string'));
        return;
      }
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

function removePendingAction(
  setter: React.Dispatch<React.SetStateAction<KoraMessage[]>>,
  actionId: string,
): void {
  setter((prev) =>
    prev.map((m) => {
      if (!m.pendingActions?.length) return m;
      const filtered = m.pendingActions.filter((a) => a.action_id !== actionId);
      return filtered.length === m.pendingActions.length ? m : { ...m, pendingActions: filtered };
    }),
  );
}
