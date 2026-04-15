import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, CheckCircle2, MessageSquare, Trash2, RotateCcw, ArrowUp, ChevronLeft, ArrowRight, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

type Msg = { role: 'user' | 'assistant'; content: string; ts: Date; actions?: string[] };
type Conversation = { id: string; title: string; updated_at: string };

const QUICK_QUESTIONS = [
  { icon: '📊', q: 'Como estão minhas finanças?', sub: 'Resumo completo do mês atual', bg: 'var(--color-info-bg)', border: 'var(--color-info-border)' },
  { icon: '🎯', q: 'Estou no caminho da minha meta?', sub: 'Análise de progresso e prazo', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' },
  { icon: '💡', q: 'Onde posso economizar?', sub: 'Identificar gastos desnecessários', bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/* ─── Typing Indicator ─── */
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))' }}>
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="rounded-[4px_18px_18px_18px] px-5 py-3.5"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-text-subtle)' }}
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15, ease: 'easeInOut' }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ msg, index }: { msg: Msg; index: number }) {
  const isUser = msg.role === 'user';
  const timeStr = msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.12), ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: isUser ? '80%' : '88%' }}>
          <div className={`px-4 py-3 text-[14px] leading-[1.6] ${
            isUser ? 'rounded-[18px_4px_18px_18px] text-white' : 'rounded-[4px_18px_18px_18px]'
          }`} style={isUser ? {
            background: 'var(--color-green-600)',
            boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
          } : {
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-weak)',
            color: 'var(--color-text-base)',
            boxShadow: 'var(--shadow-xs)',
          }}>
            {isUser ? msg.content : (
              <div className="ai-markdown-content">
                <ReactMarkdown components={{
                  strong: ({ children }) => <strong style={{ fontWeight: 800, color: 'var(--color-text-strong)' }}>{children}</strong>,
                  p: ({ children }) => <p style={{ margin: 0, marginBottom: 8 }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 0, listStyle: 'none' }}>{children}</ul>,
                  li: ({ children }) => (
                    <li style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green-600)', flexShrink: 0, marginTop: 8 }} />
                      <span>{children}</span>
                    </li>
                  ),
                  code: ({ children }) => (
                    <code style={{
                      background: 'var(--color-bg-sunken)', borderRadius: 6,
                      padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: 13,
                    }}>{children}</code>
                  ),
                }}>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
          <span className={`text-[10px] mt-1 px-1`} style={{ color: 'var(--color-text-subtle)' }}>{timeStr}</span>
        </div>
      </div>

      {msg.actions && msg.actions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="ml-[42px] mt-2 space-y-1.5">
          {msg.actions.map((action, ai) => (
            <motion.div key={ai} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + ai * 0.1 }}
              className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
              style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(22,163,74,0.1)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-green-600)' }} />
              </div>
              <span className="text-[12px] font-medium leading-snug" style={{ color: 'var(--color-success-text)' }}>{action}</span>
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
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))' }}>
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="rounded-[4px_18px_18px_18px] px-4 py-3 text-[14px] leading-[1.7]"
        style={{ maxWidth: '88%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', color: 'var(--color-text-base)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="ai-markdown-content">
          <ReactMarkdown components={{
            strong: ({ children }) => <strong style={{ fontWeight: 800, color: 'var(--color-text-strong)' }}>{children}</strong>,
            p: ({ children }) => <p style={{ margin: 0, marginBottom: 8 }}>{children}</p>,
            ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 0, listStyle: 'none' }}>{children}</ul>,
            li: ({ children }) => (
              <li style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green-600)', flexShrink: 0, marginTop: 8 }} />
                <span>{children}</span>
              </li>
            ),
          }}>{content}</ReactMarkdown>
          <motion.span className="inline-block w-[3px] h-4 rounded-sm ml-0.5 align-middle"
            style={{ background: 'var(--color-green-600)' }}
            animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Welcome Screen ─── */
function WelcomeScreen({ onSend }: { onSend: (text: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="flex flex-col h-full overflow-y-auto" style={{ padding: '28px 20px' }}>

      {/* Compact AI identity */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))' }}>
          <Sparkles className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <p className="text-[18px] font-extrabold" style={{ color: 'var(--color-text-strong)' }}>FinDash IA</p>
          <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>Sua assistente financeira com IA</p>
        </div>
      </div>

      {/* Greeting card */}
      <div className="rounded-2xl p-5 mb-6" style={{
        background: 'var(--color-green-50)',
        border: '1px solid var(--color-green-200)',
      }}>
        <p className="text-[16px] font-extrabold mb-1" style={{ color: 'var(--color-text-strong)' }}>
          {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}! 👋
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Pergunte qualquer coisa sobre suas finanças — eu tenho acesso a todos os seus dados.
        </p>
      </div>

      {/* Quick questions */}
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.08em' }}>
        Perguntas rápidas
      </p>
      <div className="flex flex-col gap-2 mb-6">
        {QUICK_QUESTIONS.map((item, i) => (
          <motion.button key={i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
            whileHover={{ x: 4, borderColor: 'var(--color-green-400)' }} whileTap={{ scale: 0.98 }}
            onClick={() => onSend(item.q)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: item.bg, border: `1px solid ${item.border}` }}>
              <span className="text-[16px]">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>{item.q}</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>{item.sub}</p>
            </div>
            <ArrowRight className="w-[14px] h-[14px] flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
          </motion.button>
        ))}
      </div>

      {/* Quick actions */}
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.08em' }}>
        Ações rápidas
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: '💸', label: 'Lançar despesa', msg: 'Quero adicionar uma despesa', bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)' },
          { icon: '💰', label: 'Lançar receita', msg: 'Quero adicionar uma receita', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' },
          { icon: '📅', label: 'Nova meta', msg: 'Quero criar uma nova meta financeira', bg: '#f5f3ff', border: '#ddd6fe' },
          { icon: '💳', label: 'Adicionar cartão', msg: 'Quero adicionar um cartão de crédito', bg: 'var(--color-info-bg)', border: 'var(--color-info-border)' },
        ].map((action, i) => (
          <motion.button key={i}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
            whileHover={{ borderColor: 'var(--color-green-400)' }} whileTap={{ scale: 0.96 }}
            onClick={() => onSend(action.msg)}
            className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all"
            style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: action.bg, border: `1px solid ${action.border}` }}>
              <span className="text-[14px]">{action.icon}</span>
            </div>
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-strong)' }}>{action.label}</span>
          </motion.button>
        ))}
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

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
    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
  };

  // Drawer animation variants
  const drawerVariants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%', opacity: 0.5 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0.5 } };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          {!isMobile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[500]" style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
              onClick={onClose} />
          )}

          {/* Drawer / Fullscreen */}
          <motion.div
            {...drawerVariants}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className={`fixed z-[501] flex flex-col ${
              isMobile ? 'inset-0' : 'top-0 right-0 h-full w-[440px]'
            }`}
            style={{
              background: 'var(--color-bg-base)',
              borderLeft: isMobile ? 'none' : '1px solid var(--color-border-weak)',
            }}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center gap-3 px-5 py-4"
              style={{
                background: 'var(--color-bg-surface)',
                borderBottom: '1px solid var(--color-border-weak)',
                paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top))' : '16px',
              }}>
              {/* AI Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--color-green-600), #0d9488)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
                  <Sparkles className="w-[22px] h-[22px] text-white" />
                </div>
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2"
                  style={{ background: '#22c55e', borderColor: 'var(--color-bg-surface)', animation: 'pulse-green 2s ease infinite' }} />
              </div>

              {/* Name + Status */}
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-extrabold" style={{ color: 'var(--color-text-strong)' }}>FinDash IA</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-green-600)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-green-600)' }}>Online</span>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>·</span>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>Assistente financeira pessoal</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowHistory(!showHistory)}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all"
                  style={{
                    background: showHistory ? 'var(--color-green-50)' : 'var(--color-bg-sunken)',
                    border: `1px solid ${showHistory ? 'var(--color-green-400)' : 'var(--color-border-weak)'}`,
                  }}>
                  <Clock className="w-4 h-4" style={{ color: showHistory ? 'var(--color-green-600)' : 'var(--color-text-muted)' }} />
                </button>
                <button onClick={startNewChat}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all hover:border-[var(--color-green-400)]"
                  title="Nova conversa"
                  style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)' }}>
                  <RotateCcw className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button onClick={onClose}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all"
                  style={{ background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)' }}>
                  {isMobile ? <ChevronLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    : <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />}
                </button>
              </div>
            </div>

            {/* ─── History Panel ─── */}
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="overflow-hidden"
                  style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
                  <div className="p-3 max-h-[220px] overflow-y-auto space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>Conversas</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--color-text-subtle)', background: 'var(--color-bg-sunken)' }}>{conversations.length}</span>
                    </div>
                    {conversations.length === 0 && (
                      <div className="flex flex-col items-center py-4 gap-2">
                        <MessageSquare className="w-6 h-6" style={{ color: 'var(--color-text-disabled)' }} />
                        <p className="text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>Nenhuma conversa ainda</p>
                      </div>
                    )}
                    {conversations.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all group"
                        style={{
                          background: activeConvoId === c.id ? 'var(--color-green-50)' : 'transparent',
                          border: `1px solid ${activeConvoId === c.id ? 'var(--color-green-200)' : 'transparent'}`,
                        }}
                        onClick={() => loadMessages(c.id)}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: activeConvoId === c.id ? 'rgba(22,163,74,0.1)' : 'var(--color-bg-sunken)' }}>
                          <MessageSquare className="w-3.5 h-3.5" style={{ color: activeConvoId === c.id ? 'var(--color-green-600)' : 'var(--color-text-subtle)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] font-medium truncate block" style={{ color: 'var(--color-text-base)' }}>{c.title}</span>
                          <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{formatDate(c.updated_at)}</span>
                        </div>
                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3 h-3" style={{ color: 'var(--color-text-subtle)' }} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Messages / Welcome ─── */}
            <div className="flex-1 overflow-y-auto" style={{
              background: 'var(--color-bg-base)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border-base) transparent',
            }}>
              {messages.length === 0 && !loading && !streamingText ? (
                <WelcomeScreen onSend={send} />
              ) : (
                <div className="flex flex-col gap-4 p-5">
                  {messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} />)}

                  {streamActions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-[42px] space-y-1.5">
                      {streamActions.map((action, ai) => (
                        <div key={ai} className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
                          style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: 'rgba(22,163,74,0.1)' }}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-green-600)' }} />
                          </div>
                          <span className="text-[12px] font-medium leading-snug" style={{ color: 'var(--color-success-text)' }}>{action}</span>
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
            <div style={{
              background: 'var(--color-bg-surface)',
              borderTop: '1px solid var(--color-border-weak)',
              padding: '12px 16px',
              paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : '12px',
            }}>
              <div className="flex items-end gap-2">
                {/* Input wrapper */}
                <div className="flex-1 flex items-end gap-2 rounded-2xl px-3.5 py-2.5 transition-all"
                  style={{
                    background: 'var(--color-bg-sunken)',
                    border: '1.5px solid var(--color-border-base)',
                  }}
                  onFocus={() => {}}
                >
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
                      maxHeight: 120,
                      fontFamily: 'inherit',
                    }}
                  />
                  <motion.button
                    whileTap={hasText && !loading ? { scale: 0.88 } : undefined}
                    onClick={() => send(input)}
                    disabled={!hasText || loading}
                    className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: loading ? 'var(--color-border-weak)' : hasText ? 'var(--color-green-600)' : 'var(--color-border-weak)',
                      boxShadow: hasText && !loading ? '0 2px 8px rgba(22,163,74,0.3)' : 'none',
                      cursor: hasText && !loading ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-green-600)' }} />
                    ) : (
                      <ArrowUp className="w-4 h-4" style={{ color: hasText ? 'white' : 'var(--color-text-subtle)' }} />
                    )}
                  </motion.button>
                </div>
              </div>
              <p className="text-center mt-1.5" style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
                Powered by Claude (Anthropic) — Seus dados ficam privados 🔒
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
