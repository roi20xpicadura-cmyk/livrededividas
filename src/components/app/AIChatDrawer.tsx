import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Loader2, CheckCircle2, RotateCcw,
  ArrowUp, ChevronLeft, ChevronRight, Clock, Lock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/useProfile';

type Msg = { role: 'user' | 'assistant'; content: string; ts: Date; actions?: string[] };
type Conversation = { id: string; title: string; updated_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

function formatCompact(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ─── Typing Indicator ─── */
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
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
    </motion.div>
  );
}

/* ─── Streaming Bubble ─── */
function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
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
}

/* ─── Welcome Screen (redesigned) ─── */
function WelcomeScreen({ onSend, firstName, financialData }: {
  onSend: (text: string) => void;
  firstName: string;
  financialData: { balance: number; score: number; totalDebt: number; topCategory: string | null };
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const smartQuestions = useMemo(() => {
    const qs: { emoji: string; text: string; sub: string }[] = [];
    qs.push({ emoji: '📊', text: 'Como estão minhas finanças?', sub: 'Resumo completo do mês' });
    if (financialData.totalDebt > 0) {
      qs.push({ emoji: '💳', text: 'Quando vou quitar minhas dívidas?', sub: `R$ ${formatCompact(financialData.totalDebt)} em aberto` });
    } else {
      qs.push({ emoji: '📈', text: 'Como posso investir melhor?', sub: 'Sugestões para seu perfil' });
    }
    if (financialData.topCategory) {
      qs.push({ emoji: '💡', text: `Como reduzir gastos com ${financialData.topCategory}?`, sub: 'Sua maior categoria este mês' });
    } else {
      qs.push({ emoji: '💡', text: 'Onde posso economizar?', sub: 'Identificar gastos desnecessários' });
    }
    qs.push({ emoji: '🔮', text: 'Como estarão minhas finanças em 3 meses?', sub: 'Projeção com IA' });
    return qs.slice(0, 4);
  }, [financialData]);

  const quickActions = [
    { emoji: '💸', label: 'Lançar despesa', msg: 'Quero lançar uma despesa' },
    { emoji: '💰', label: 'Lançar receita', msg: 'Quero lançar uma receita' },
    { emoji: '📊', label: 'Resumo do mês', msg: 'Como estão minhas finanças esse mês?' },
    { emoji: '🎯', label: 'Minha meta', msg: 'Como está o progresso das minhas metas?' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ padding: '20px 16px 12px', gap: 14 }}>
      {/* Compact greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="flex-shrink-0 w-11 h-11 rounded-[13px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-green-600), #0d9488)',
            boxShadow: '0 3px 10px rgba(124, 58, 237,0.3)',
          }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 900,
            color: 'var(--color-text-strong)',
            letterSpacing: '-0.02em',
          }}>
            {greeting}{firstName ? `, ${firstName}` : ''}! 👋
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 1 }}>
            Kora IA • Assistente financeira pessoal
          </div>
        </div>
      </motion.div>

      {/* Financial snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{
          background: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-success-text)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10,
        }}>
          Seus dados de hoje
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              label: 'Saldo',
              value: `R$ ${formatCompact(financialData.balance)}`,
              color: financialData.balance >= 0 ? 'var(--color-green-600)' : 'var(--color-danger-solid)',
            },
            {
              label: 'Score',
              value: `${financialData.score}`,
              color: 'var(--color-green-600)',
            },
            {
              label: 'Dívidas',
              value: financialData.totalDebt > 0
                ? `R$ ${formatCompact(financialData.totalDebt)}`
                : 'Nenhuma ✓',
              color: financialData.totalDebt > 0 ? 'var(--color-danger-solid)' : 'var(--color-green-600)',
            },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: 'var(--color-text-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 3,
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 900,
                color: s.color,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.02em',
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--color-success-border)',
          fontSize: 12,
          color: 'var(--color-success-text)',
          opacity: 0.8,
        }}>
          Tenho acesso a todos os seus dados financeiros. Pergunte qualquer coisa! 💬
        </div>
      </motion.div>

      {/* Smart questions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}>
          Perguntas rápidas
        </div>
        <div className="flex flex-col gap-[7px]">
          {smartQuestions.map((q, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSend(q.text)}
              className="flex items-center gap-2.5 text-left transition-colors"
              style={{
                padding: '11px 14px',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-weak)',
                borderRadius: 12,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{q.emoji}</span>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-base)', marginBottom: 1 }}>{q.text}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{q.sub}</div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }} />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Quick actions 2x2 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}>
          Ações rápidas
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((a, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSend(a.msg)}
              className="flex items-center gap-2.5"
              style={{
                padding: '13px 12px',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-weak)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{a.emoji}</span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: 'var(--color-text-base)',
                lineHeight: 1.3,
              }}>
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Drawer ─── */
export default function AIChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamActions, setStreamActions] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [financialData, setFinancialData] = useState({ balance: 0, score: 0, totalDebt: 0, topCategory: null as string | null });
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const firstName = profile?.full_name?.split(' ')[0] || '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingText]);

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
    const income = txs.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txs.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
    const totalDebt = (debtRes.data || []).reduce((s, d) => s + Number(d.remaining_amount), 0);

    // Find top expense category
    const catMap: Record<string, number> = {};
    txs.filter(t => t.type === 'despesa').forEach(t => {
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
            {/* ─── Header (compact 56px) ─── */}
            <div className="flex items-center gap-2.5 px-4 shrink-0"
              style={{
                height: 56,
                background: 'var(--color-bg-surface)',
                borderBottom: '0.5px solid var(--color-border-ghost)',
                paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
                minHeight: isMobile ? 'calc(56px + env(safe-area-inset-top))' : 56,
              }}>
              {/* Avatar with online dot */}
              <div className="relative flex-shrink-0">
                <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-green-600), #0d9488)',
                    boxShadow: '0 2px 8px rgba(124, 58, 237,0.2)',
                  }}>
                  <Sparkles className="w-[17px] h-[17px] text-white" />
                </div>
                <div className="absolute -bottom-[1px] -right-[1px] w-[10px] h-[10px] rounded-full"
                  style={{ background: '#22c55e', border: '2px solid var(--color-bg-surface)' }} />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  Kora IA
                </div>
                <p className="text-[11px] truncate mt-px" style={{ color: 'var(--color-text-subtle)' }}>
                  Assistente financeira pessoal
                </p>
              </div>

              {/* Compact buttons */}
              <div className="flex items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.88 }} onClick={startNewChat}
                  className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
                  title="Nova conversa"
                  style={{ background: 'var(--color-bg-sunken)', border: 'none', cursor: 'pointer' }}>
                  <RotateCcw className="w-[15px] h-[15px]" style={{ color: 'var(--color-text-muted)' }} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
                  className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
                  style={{ background: 'var(--color-bg-sunken)', border: 'none', cursor: 'pointer' }}>
                  {isMobile
                    ? <ChevronLeft className="w-[17px] h-[17px]" style={{ color: 'var(--color-text-muted)' }} />
                    : <X className="w-[15px] h-[15px]" style={{ color: 'var(--color-text-muted)' }} />}
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
                  {messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} />)}

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
              borderTop: '0.5px solid var(--color-border-ghost)',
              padding: '10px 16px',
              paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom))' : '10px',
            }}>
              <div className="flex items-end gap-2 rounded-2xl px-3.5 py-2.5 transition-all ai-chat-input-wrapper"
                style={{
                  background: 'var(--color-bg-sunken)',
                  border: '1.5px solid var(--color-border-base)',
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
                    color: 'var(--color-text-base)',
                    maxHeight: 100,
                    fontFamily: 'inherit',
                  }}
                />
                <motion.button
                  whileTap={hasText && !loading ? { scale: 0.85 } : undefined}
                  onClick={() => send(input)}
                  disabled={!hasText || loading}
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: loading
                      ? 'var(--color-bg-sunken)'
                      : hasText
                        ? 'var(--color-green-600)'
                        : 'transparent',
                    cursor: hasText && !loading ? 'pointer' : 'default',
                    boxShadow: hasText && !loading ? '0 2px 8px rgba(124, 58, 237,0.3)' : 'none',
                    border: 'none',
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-green-500)' }} />
                  ) : (
                    <ArrowUp className="w-4 h-4" style={{ color: hasText ? 'white' : 'var(--color-text-disabled)' }} />
                  )}
                </motion.button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-[6px]">
                <Lock className="w-[10px] h-[10px]" style={{ color: 'var(--color-text-disabled)' }} />
                <p style={{ fontSize: 10, color: 'var(--color-text-disabled)', letterSpacing: '0.2px' }}>
                  🔒 Dados criptografados · 🚫 Sem anúncios · 🛡️ LGPD
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
