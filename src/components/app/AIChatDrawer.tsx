import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Loader2, CheckCircle2, RotateCcw,
  ArrowUp, ChevronLeft, ChevronRight, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/useProfile';
import { useKora, type KoraPendingAction } from '@/hooks/useKora';
import KoraPendingActionCard from '@/components/app/KoraPendingActionCard';
import AudioRecordButton from '@/components/app/AudioRecordButton';
import { toast } from 'sonner';
import koalaMascot from '@/assets/koala-mascot.png';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
  actions?: string[];
  pendingActions?: KoraPendingAction[];
};
type Conversation = { id: string; title: string | null; updated_at: string | null };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/* ─── Typing Indicator ─── */
const TypingIndicator = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))', boxShadow: '0 2px 8px rgba(124, 58, 237,0.3)' }}>
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)' }}>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-[6px] h-[6px] rounded-full"
              style={{ background: 'var(--color-green-500)' }}
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.15, ease: 'easeInOut' }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
});
TypingIndicator.displayName = 'TypingIndicator';

/* ─── Markdown Components ─── */
type MdProps = { children?: import('react').ReactNode };
const markdownComponents = {
  strong: ({ children }: MdProps) => <strong style={{ fontWeight: 800, color: 'var(--color-text-strong)' }}>{children}</strong>,
  p: ({ children }: MdProps) => <p style={{ margin: 0, marginBottom: 6 }}>{children}</p>,
  ul: ({ children }: MdProps) => <ul style={{ margin: '6px 0', paddingLeft: 0, listStyle: 'none' }}>{children}</ul>,
  li: ({ children }: MdProps) => (
    <li style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-500)', flexShrink: 0, marginTop: 8 }} />
      <span style={{ lineHeight: 1.6 }}>{children}</span>
    </li>
  ),
  code: ({ children }: MdProps) => (
    <code style={{
      background: 'var(--color-bg-sunken)', borderRadius: 6,
      padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: 13,
    }}>{children}</code>
  ),
  h3: ({ children }: MdProps) => <h3 style={{ fontSize: 14, fontWeight: 800, margin: '8px 0 4px', color: 'var(--color-text-strong)' }}>{children}</h3>,
};

/* ─── Message Bubble ─── */
interface MessageBubbleProps {
  msg: Msg;
  index: number;
  onConfirmAction?: (actionId: string) => Promise<boolean>;
  onRejectAction?: (actionId: string) => Promise<boolean>;
}
const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(({ msg, index, onConfirmAction, onRejectAction }, ref) => {
  const isUser = msg.role === 'user';
  const timeStr = msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.12), ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))', boxShadow: '0 2px 8px rgba(124, 58, 237,0.25)' }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: isUser ? '80%' : '85%' }}>
          <div className={`px-4 py-3 text-[14px] leading-[1.65] ${
            isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'
          }`} style={isUser ? {
            background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))',
            color: 'white',
            boxShadow: '0 2px 12px rgba(124, 58, 237,0.2)',
          } : {
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-weak)',
            color: 'var(--color-text-base)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {isUser ? msg.content : (
              <div className="ai-markdown-content">
                <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 px-1">
            <Clock className="w-[9px] h-[9px]" style={{ color: 'var(--color-text-disabled)' }} />
            <span className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>{timeStr}</span>
          </div>
        </div>
      </div>

      {msg.actions && msg.actions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="ml-[42px] mt-1.5 space-y-1.5">
          {msg.actions.map((action, ai) => (
            <motion.div key={ai} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + ai * 0.1 }}
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-green-200)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-green-600)' }} />
              <span className="text-[12px] font-semibold leading-snug" style={{ color: 'var(--color-success-text)' }}>{action}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {msg.pendingActions && msg.pendingActions.length > 0 && onConfirmAction && onRejectAction && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="ml-[42px] mt-2 space-y-2"
        >
          {msg.pendingActions.map((pa) => (
            <KoraPendingActionCard
              key={pa.action_id}
              action={pa}
              onConfirm={onConfirmAction}
              onReject={onRejectAction}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
});
MessageBubble.displayName = 'MessageBubble';

/* ─── Streaming Bubble ─── */
const StreamingBubble = forwardRef<HTMLDivElement, { content: string }>(({ content }, ref) => {
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))', boxShadow: '0 2px 8px rgba(124, 58, 237,0.25)' }}>
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] leading-[1.65]"
        style={{ maxWidth: '85%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', color: 'var(--color-text-base)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="ai-markdown-content">
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
          <motion.span className="inline-block w-[2px] h-[16px] rounded-full ml-0.5 align-middle"
            style={{ background: 'var(--color-green-500)' }}
            animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />
        </div>
      </div>
    </motion.div>
  );
});
StreamingBubble.displayName = 'StreamingBubble';

/* ─── Welcome Screen — minimal dark ─── */
const WelcomeScreen = forwardRef<HTMLDivElement, {
  onSend: (text: string) => void;
  firstName: string;
  financialData: { balance: number; score: number; totalDebt: number; topCategory: string | null };
}>(({ onSend, firstName }, ref) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const questions = [
    { emoji: '📊', text: 'Como estão minhas finanças?' },
    { emoji: '💳', text: 'Quando vou quitar minhas dívidas?' },
    { emoji: '💡', text: 'Onde posso economizar?' },
    { emoji: '🔮', text: 'Previsão dos próximos 3 meses' },
  ];

  return (
    <div ref={ref} style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 20px 16px',
      background: 'var(--color-bg-base)',
      gap: 32,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          width: 52, height: 52,
          borderRadius: 16,
          background: 'var(--color-green-600)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        }}>
          <Sparkles size={22} color="#FFFFFF" />
        </div>
        <h2 style={{
          fontSize: 22, fontWeight: 900,
          color: 'var(--color-text-strong)',
          letterSpacing: '-0.02em',
          marginBottom: 6,
        }}>
          {greeting}{firstName ? `, ${firstName}` : ''}! 👋
        </h2>
        <p style={{
          fontSize: 13,
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          margin: 0,
        }}>
          Como posso te ajudar hoje?
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {questions.map((q, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSend(q.text)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 16px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-weak)',
              borderRadius: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{q.emoji}</span>
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: 'var(--color-text-strong)',
              flex: 1,
            }}>
              {q.text}
            </span>
            <ChevronRight size={14} color="var(--color-text-muted)" />
          </motion.button>
        ))}
      </div>
    </div>
  );
});
WelcomeScreen.displayName = 'WelcomeScreen';

/* ─── Main Drawer ─── */
export default function AIChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const kora = useKora();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamActions, setStreamActions] = useState<string[]>([]);
  const [, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [, setShowHistory] = useState(false);
  const [financialData, setFinancialData] = useState({ balance: 0, score: 0, totalDebt: 0, topCategory: null as string | null });
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const firstName = profile?.full_name?.split(' ')[0] || '';

  // Scroll only when a full message is added or loading toggles — not on every stream token (jank)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 350);
      loadConversations();
      loadFinancialSnapshot();
    }
  }, [open]);

  const loadFinancialSnapshot = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [txRes, debtRes, configRes] = await Promise.all([
      supabase.from('transactions').select('amount, type, category').eq('user_id', uid).gte('date', startOfMonth).is('deleted_at', null),
      supabase.from('debts').select('remaining_amount').eq('user_id', uid).is('deleted_at', null).neq('status', 'paid'),
      supabase.from('user_config').select('financial_score').eq('user_id', uid).maybeSingle(),
    ]);

    const txs = txRes.data || [];
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalDebt = (debtRes.data || []).reduce((s, d) => s + Number(d.remaining_amount), 0);

    // Find top expense category
    const catMap: Record<string, number> = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    setFinancialData({
      balance: income - expenses,
      score: Number(configRes.data?.financial_score) || 0,
      totalDebt,
      topCategory,
    });
  };

  const loadConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('chat_conversations').select('id, title, updated_at').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(20);
    if (data) setConversations(data);
  };

  const saveMessage = async (convoId: string, msg: Msg) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('chat_messages').insert({
      conversation_id: convoId, user_id: session.user.id,
      role: msg.role, content: msg.content, actions: msg.actions || [],
    });
  };

  const createConversation = async (firstMsg: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const title = firstMsg.slice(0, 60) + (firstMsg.length > 60 ? '...' : '');
    const { data, error } = await supabase.from('chat_conversations').insert({ user_id: session.user.id, title }).select('id').single();
    if (error || !data) return null;
    await loadConversations();
    return data.id;
  };

  const startNewChat = () => { setActiveConvoId(null); setMessages([]); setShowHistory(false); };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setLoading(true);
    setStreamingText('');
    setStreamActions([]);

    // Kora v2 branch: quando user_config.kora_v2_enabled=true, usa o novo
    // orquestrador em vez do ai-chat SSE legado. Persona, tools e memória
    // rodam no backend; aqui só processamos a response final.
    if (kora.enabled) {
      const result = await kora.sendMessage(text.trim());
      if (result) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response_text || 'Ok.',
          ts: new Date(),
          pendingActions: result.pending_actions,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Erro de conexão. Tente novamente.',
          ts: new Date(),
        }]);
      }
      setLoading(false);
      return;
    }

    const allMsgs = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Você precisa estar logado.', ts: new Date() }]);
        setLoading(false); return;
      }

      let convoId = activeConvoId;
      if (!convoId) {
        convoId = await createConversation(text.trim());
        if (!convoId) { setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao criar conversa.', ts: new Date() }]); setLoading(false); return; }
        setActiveConvoId(convoId);
      }
      await saveMessage(convoId, userMsg);

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMsgs, stream: true }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        const errorMsg = resp.status === 429 ? '⚠️ Muitas requisições. Aguarde.' : resp.status === 402 ? '⚠️ Créditos de IA esgotados.' : `⚠️ ${err.error || 'Erro ao conectar.'}`;
        const errAssistant: Msg = { role: 'assistant', content: errorMsg, ts: new Date() };
        setMessages(prev => [...prev, errAssistant]);
        await saveMessage(convoId, errAssistant);
        setLoading(false); return;
      }

      const contentType = resp.headers.get('Content-Type') || '';

      if (contentType.includes('text/event-stream') && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let actions: string[] = [];
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'actions') { actions = parsed.actions || []; setStreamActions(actions); }
              else { const content = parsed.choices?.[0]?.delta?.content; if (content) { fullText += content; setStreamingText(fullText); } }
            } catch { /* skip */ }
          }
        }

        const assistantMsg: Msg = { role: 'assistant', content: fullText || 'Sem resposta.', ts: new Date(), actions: actions.length > 0 ? actions : undefined };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setStreamActions([]);
        await saveMessage(convoId, assistantMsg);
      } else {
        const data = await resp.json();
        const assistantMsg: Msg = { role: 'assistant', content: data.reply || 'Sem resposta.', ts: new Date(), actions: data.actions };
        setMessages(prev => [...prev, assistantMsg]);
        await saveMessage(convoId, assistantMsg);
      }

      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convoId);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro de conexão. Tente novamente.', ts: new Date() }]);
    }
    setLoading(false);
    setStreamingText('');
    // `createConversation` and `saveMessage` are stable in practice (they only
    // read `user` via supabase each call); including them would recreate `send`
    // on every message and break auto-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, messages, activeConvoId, kora.enabled, kora.sendMessage]);

  const handleAudioRecorded = useCallback(async (blob: Blob) => {
    if (!kora.enabled) {
      toast.error('Áudio disponível apenas com Kora v2');
      return;
    }
    if (loading) return;

    // Mostra placeholder do user enquanto transcreve
    const placeholder: Msg = { role: 'user', content: '🎙️ Transcrevendo áudio...', ts: new Date() };
    setMessages((prev) => [...prev, placeholder]);
    setLoading(true);

    const result = await kora.sendAudio(blob);

    setLoading(false);

    if (!result || !result.success) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...placeholder, content: '⚠️ Erro ao processar áudio' };
        return next;
      });
      toast.error(result?.error || 'Falha na transcrição');
      return;
    }

    // Substitui placeholder pela transcrição real
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = {
        role: 'user',
        content: result.transcription || '(áudio sem transcrição)',
        ts: new Date(),
      };
      const brain = result.kora_response as { response_text?: string; pending_actions?: KoraPendingAction[] } | undefined;
      if (brain?.response_text) {
        next.push({
          role: 'assistant',
          content: brain.response_text,
          ts: new Date(),
          pendingActions: brain.pending_actions,
        });
      }
      return next;
    });
  }, [kora, loading]);

  const hasText = input.trim().length > 0;

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 100) + 'px';
  };

  const drawerVariants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%', opacity: 0.5 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0.5 } };

  return (
    <AnimatePresence>
      {open && (
        <>
          {!isMobile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[500]" style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(8px)' }}
              onClick={onClose} />
          )}

          <motion.div
            {...drawerVariants}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className={`fixed z-[501] flex flex-col ${
              isMobile ? 'inset-0' : 'top-0 right-0 h-full w-[440px]'
            }`}
            style={{
              background: 'var(--color-bg-base)',
              borderLeft: isMobile ? 'none' : '1px solid var(--color-border-weak)',
              boxShadow: isMobile ? 'none' : '-12px 0 40px rgba(0,0,0,0.12)',
            }}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center gap-2.5 px-4 shrink-0"
              style={{
                height: 56,
                background: 'var(--color-bg-surface)',
                borderBottom: '1px solid var(--color-border-weak)',
                paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
                minHeight: isMobile ? 'calc(56px + env(safe-area-inset-top))' : 56,
              }}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--color-green-600)' }}>
                  <img
                    src={koalaMascot}
                    alt="Kora, mascote koala"
                    width={36}
                    height={36}
                    loading="eager"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="absolute -bottom-[1px] -right-[1px] w-[9px] h-[9px] rounded-full"
                  style={{ background: 'var(--color-success-solid)', border: '2px solid var(--color-bg-surface)' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  Kora IA
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.88 }} onClick={startNewChat}
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center"
                  title="Nova conversa"
                  style={{ background: 'var(--color-bg-sunken)', border: 'none', cursor: 'pointer' }}>
                  <RotateCcw className="w-[14px] h-[14px]" style={{ color: 'var(--color-text-muted)' }} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center"
                  style={{ background: 'var(--color-bg-sunken)', border: 'none', cursor: 'pointer' }}>
                  {isMobile
                    ? <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    : <X className="w-[14px] h-[14px]" style={{ color: 'var(--color-text-muted)' }} />}
                </motion.button>
              </div>
            </div>

            {/* ─── Messages / Welcome ─── */}
            <div className="flex-1 overflow-y-auto" style={{
              background: 'var(--color-bg-base)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border-weak) transparent',
            }}>
              {messages.length === 0 && !loading && !streamingText ? (
                <WelcomeScreen onSend={send} firstName={firstName} financialData={financialData} />
              ) : (
                <div className="flex flex-col gap-4 p-4">
                  {messages.map((m, i) => (
                    <MessageBubble
                      key={i}
                      msg={m}
                      index={i}
                      onConfirmAction={kora.enabled ? kora.confirmAction : undefined}
                      onRejectAction={kora.enabled ? kora.rejectAction : undefined}
                    />
                  ))}

                  {streamActions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-[42px] space-y-1.5">
                      {streamActions.map((action, ai) => (
                        <div key={ai} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                          style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-green-200)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-green-600)' }} />
                          <span className="text-[12px] font-semibold leading-snug" style={{ color: 'var(--color-success-text)' }}>{action}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {streamingText && <StreamingBubble content={streamingText} />}
                  {loading && !streamingText && <TypingIndicator />}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* ─── Input Bar ─── */}
            <div className="shrink-0" style={{
              background: 'var(--color-bg-surface)',
              borderTop: '1px solid var(--color-border-weak)',
              padding: '12px 16px',
              paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : '12px',
            }}>
              <div className="flex items-end gap-2 rounded-[14px] px-3 py-2.5 transition-all ai-chat-input-wrapper"
                style={{
                  background: 'var(--color-bg-sunken)',
                  border: '1px solid var(--color-border-weak)',
                }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onInput={handleTextareaInput}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  placeholder="Converse com a Kora IA..."
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none leading-[1.5]"
                  style={{
                    fontSize: isMobile ? '16px' : '15px',
                    color: 'var(--color-text-strong)',
                    maxHeight: 100,
                    fontFamily: 'inherit',
                  }}
                />
                {kora.enabled && !hasText && (
                  <AudioRecordButton onRecorded={handleAudioRecorded} disabled={loading} />
                )}
                <motion.button
                  whileTap={hasText && !loading ? { scale: 0.85 } : undefined}
                  onClick={() => send(input)}
                  disabled={!hasText || loading}
                  className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: loading ? 'transparent' : hasText ? 'var(--color-green-600)' : 'transparent',
                    cursor: hasText && !loading ? 'pointer' : 'default',
                    border: 'none',
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-green-500)' }} />
                  ) : (
                    <ArrowUp size={15} style={{ color: hasText ? '#FFFFFF' : 'var(--color-text-muted)' }} />
                  )}
                </motion.button>
              </div>
              <div style={{
                textAlign: 'center',
                marginTop: 6,
                fontSize: 10,
                color: 'var(--color-text-muted)',
              }}>
                🔒 Dados criptografados · Sem anúncios · LGPD
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
