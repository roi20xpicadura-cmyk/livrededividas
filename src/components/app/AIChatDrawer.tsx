import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Loader2, CheckCircle2, MessageSquare, Trash2, RotateCcw,
  ArrowUp, ChevronLeft, ChevronRight, ArrowDown, ArrowUpIcon, Target,
  CreditCard, Send, Clock, Bot, Lock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

type Msg = { role: 'user' | 'assistant'; content: string; ts: Date; actions?: string[] };
type Conversation = { id: string; title: string; updated_at: string };

const QUICK_QUESTIONS = [
  { icon: '📊', q: 'Como estão minhas finanças?', sub: 'Resumo completo do mês atual', gradient: 'linear-gradient(135deg, #dbeafe, #eff6ff)' },
  { icon: '🎯', q: 'Estou no caminho da minha meta?', sub: 'Análise de progresso e prazo', gradient: 'linear-gradient(135deg, #fce7f3, #fdf2f8)' },
  { icon: '💡', q: 'Onde posso economizar?', sub: 'Identificar gastos desnecessários', gradient: 'linear-gradient(135deg, #fef3c7, #fffbeb)' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/* ─── Typing Indicator ─── */
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
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
}

/* ─── Markdown Components ─── */
const markdownComponents = {
  strong: ({ children }: any) => <strong style={{ fontWeight: 800, color: 'var(--color-text-strong)' }}>{children}</strong>,
  p: ({ children }: any) => <p style={{ margin: 0, marginBottom: 6 }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ margin: '6px 0', paddingLeft: 0, listStyle: 'none' }}>{children}</ul>,
  li: ({ children }: any) => (
    <li style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-500)', flexShrink: 0, marginTop: 8 }} />
      <span style={{ lineHeight: 1.6 }}>{children}</span>
    </li>
  ),
  code: ({ children }: any) => (
    <code style={{
      background: 'var(--color-bg-sunken)', borderRadius: 6,
      padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: 13,
    }}>{children}</code>
  ),
  h3: ({ children }: any) => <h3 style={{ fontSize: 14, fontWeight: 800, margin: '8px 0 4px', color: 'var(--color-text-strong)' }}>{children}</h3>,
};

/* ─── Message Bubble ─── */
function MessageBubble({ msg, index }: { msg: Msg; index: number }) {
  const isUser = msg.role === 'user';
  const timeStr = msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.12), ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: isUser ? '80%' : '85%' }}>
          <div className={`px-4 py-3 text-[14px] leading-[1.65] ${
            isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'
          }`} style={isUser ? {
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white',
            boxShadow: '0 2px 12px rgba(22,163,74,0.25)',
          } : {
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-weak)',
            color: 'var(--color-text-base)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          }}>
            {isUser ? msg.content : (
              <div className="ai-markdown-content">
                <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 px-1">
            <Clock className="w-[9px] h-[9px]" style={{ color: 'var(--color-text-subtle)', opacity: 0.6 }} />
            <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)', opacity: 0.6 }}>{timeStr}</span>
          </div>
        </div>
      </div>

      {msg.actions && msg.actions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="ml-[42px] mt-1.5 space-y-1.5">
          {msg.actions.map((action, ai) => (
            <motion.div key={ai} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + ai * 0.1 }}
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--color-success-bg)', border: '1px solid hsl(142 71% 45% / 0.15)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-green-600)' }} />
              <span className="text-[12px] font-semibold leading-snug" style={{ color: 'var(--color-success-text)' }}>{action}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Streaming Bubble ─── */
function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}>
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] leading-[1.65]"
        style={{ maxWidth: '85%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', color: 'var(--color-text-base)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div className="ai-markdown-content">
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
          <motion.span className="inline-block w-[2px] h-[16px] rounded-full ml-0.5 align-middle"
            style={{ background: 'var(--color-green-500)' }}
            animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Welcome Screen ─── */
function WelcomeScreen({ onSend }: { onSend: (text: string) => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const actions = [
    { label: 'Lançar despesa', msg: 'Quero adicionar uma despesa', icon: ArrowDown, gradient: 'linear-gradient(135deg, #fef2f2, #fff1f2)', color: '#dc2626', iconBg: 'hsl(0 72% 51% / 0.08)' },
    { label: 'Lançar receita', msg: 'Quero adicionar uma receita', icon: ArrowUpIcon, gradient: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', color: '#16a34a', iconBg: 'hsl(142 71% 45% / 0.08)' },
    { label: 'Nova meta', msg: 'Quero criar uma nova meta financeira', icon: Target, gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#7c3aed', iconBg: 'hsl(263 70% 50% / 0.08)' },
    { label: 'Novo cartão', msg: 'Quero adicionar um cartão de crédito', icon: CreditCard, gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', iconBg: 'hsl(217 91% 60% / 0.08)' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="flex flex-col p-5 gap-4">

      {/* Greeting card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl px-5 py-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid hsl(142 71% 45% / 0.15)' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(22,163,74,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -10, left: '40%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(22,163,74,0.04)' }} />
        <p className="text-[17px] font-black relative" style={{ color: 'var(--color-text-strong)' }}>
          {greeting}! 👋
        </p>
        <p className="text-[13px] mt-1 relative" style={{ color: 'hsl(142 64% 24%)', lineHeight: 1.5 }}>
          Pergunte qualquer coisa — eu tenho acesso a todos os seus dados.
        </p>
      </motion.div>

      {/* Quick questions */}
      <div>
        <p className="text-[10px] font-extrabold uppercase mb-2.5 px-1" style={{ color: 'var(--color-text-subtle)', letterSpacing: '1.2px' }}>
          Perguntas rápidas
        </p>
        <div className="flex flex-col gap-2">
          {QUICK_QUESTIONS.map((item, i) => (
            <motion.button key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSend(item.q)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left group"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(142 71% 45% / 0.3)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(22,163,74,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-weak)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: item.gradient }}>
                <span className="text-[18px]">{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>{item.q}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-subtle)' }} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-extrabold uppercase mb-2.5 px-1" style={{ color: 'var(--color-text-subtle)', letterSpacing: '1.2px' }}>
          Ações rápidas
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button key={i}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSend(action.msg)}
                className="flex flex-col items-center gap-2 rounded-2xl py-4 px-3 transition-all"
                style={{ background: action.gradient, border: '1px solid var(--color-border-weak)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: action.iconBg, backdropFilter: 'blur(4px)' }}>
                  <Icon className="w-[18px] h-[18px]" style={{ color: action.color }} />
                </div>
                <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-base)' }}>{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Drawer ─── */
export default function AIChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamActions, setStreamActions] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingText]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 350);
      loadConversations();
    }
  }, [open]);

  const loadConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('chat_conversations').select('id, title, updated_at').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(20);
    if (data) setConversations(data);
  };

  const loadMessages = async (convoId: string) => {
    const { data } = await supabase.from('chat_messages').select('role, content, actions, created_at').eq('conversation_id', convoId).order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map(m => ({
        role: m.role as 'user' | 'assistant', content: m.content, ts: new Date(m.created_at),
        actions: m.actions && m.actions.length > 0 ? m.actions : undefined,
      })));
    }
    setActiveConvoId(convoId);
    setShowHistory(false);
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

  const deleteConversation = async (convoId: string) => {
    await supabase.from('chat_messages').delete().eq('conversation_id', convoId);
    await supabase.from('chat_conversations').delete().eq('id', convoId);
    if (activeConvoId === convoId) { setActiveConvoId(null); setMessages([]); }
    await loadConversations();
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
  }, [loading, messages, activeConvoId]);

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
              className="fixed inset-0 z-[500]" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)' }}
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
              boxShadow: isMobile ? 'none' : '-8px 0 30px rgba(0,0,0,0.08)',
            }}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center gap-3 px-4 shrink-0"
              style={{
                height: 64,
                background: 'var(--color-bg-surface)',
                borderBottom: '1px solid var(--color-border-weak)',
                paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
                minHeight: isMobile ? 'calc(64px + env(safe-area-inset-top))' : 64,
              }}>
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 2px 10px rgba(22,163,74,0.3)' }}>
                  <Sparkles className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-bg-surface)', padding: 2 }}>
                  <div className="w-full h-full rounded-full" style={{ background: '#22c55e' }} />
                </div>
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-black" style={{ color: 'var(--color-text-strong)', letterSpacing: '-0.3px' }}>FinDash IA</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>·</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    <span className="text-[12px] font-bold" style={{ color: '#16a34a' }}>Online</span>
                  </div>
                </div>
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>Assistente financeira pessoal</p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={startNewChat}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  title="Nova conversa"
                  style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)' }}>
                  <RotateCcw className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)' }}>
                  {isMobile
                    ? <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    : <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />}
                </motion.button>
              </div>
            </div>

            {/* ─── Messages / Welcome ─── */}
            <div className="flex-1 overflow-y-auto ai-chat-messages" style={{
              background: 'var(--color-bg-base)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border-base) transparent',
            }}>
              {messages.length === 0 && !loading && !streamingText ? (
                <WelcomeScreen onSend={send} />
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} />)}

                  {streamActions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-[42px] space-y-1.5">
                      {streamActions.map((action, ai) => (
                        <div key={ai} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                          style={{ background: 'var(--color-success-bg)', border: '1px solid hsl(142 71% 45% / 0.15)' }}>
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
              <div className="flex items-end gap-2.5 rounded-2xl px-4 py-3 transition-all"
                style={{
                  background: 'var(--color-bg-sunken)',
                  border: '1.5px solid var(--color-border-base)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onInput={handleTextareaInput}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  placeholder="Pergunte sobre suas finanças..."
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none leading-[1.5]"
                  style={{
                    fontSize: isMobile ? '16px' : '15px',
                    color: 'var(--color-text-base)',
                    maxHeight: 100,
                    fontFamily: 'inherit',
                  }}
                />
                <motion.button
                  whileTap={hasText && !loading ? { scale: 0.85 } : undefined}
                  onClick={() => send(input)}
                  disabled={!hasText || loading}
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: loading ? 'var(--color-border-weak)' : hasText ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'transparent',
                    boxShadow: hasText && !loading ? '0 2px 10px rgba(22,163,74,0.3)' : 'none',
                    cursor: hasText && !loading ? 'pointer' : 'default',
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-green-600)' }} />
                  ) : (
                    <ArrowUp className="w-4 h-4" style={{ color: hasText ? 'white' : 'var(--color-text-subtle)' }} />
                  )}
                </motion.button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Lock className="w-[9px] h-[9px]" style={{ color: 'var(--color-text-subtle)', opacity: 0.5 }} />
                <p style={{ fontSize: 10, color: 'var(--color-text-subtle)', opacity: 0.5 }}>
                  Dados criptografados · Privacidade garantida
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
