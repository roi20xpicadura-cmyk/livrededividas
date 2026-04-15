import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, CheckCircle2, Zap, MessageSquare, Plus, Trash2, Mic, MicOff, Bot, User, Clock, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string; ts: Date; actions?: string[] };
type Conversation = { id: string; title: string; updated_at: string };

const SUGGESTIONS = [
  { icon: '📊', text: 'Como estão minhas finanças este mês?' },
  { icon: '🎯', text: 'Estou no caminho certo para minha meta?' },
  { icon: '💡', text: 'Onde posso economizar mais?' },
  { icon: '➕', text: 'Adicione uma despesa de R$50 em Alimentação' },
  { icon: '📋', text: 'Crie um orçamento de R$800 para Alimentação' },
  { icon: '💳', text: 'Adicione meu cartão Nubank com limite de R$5000' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

// Waveform typing indicator
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex justify-start"
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 shadow-md shadow-[#16a34a]/20">
        <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
          <Bot className="w-4 h-4 text-white" />
        </motion.div>
      </div>
      <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-[3px] h-5">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div key={i} className="w-[3px] rounded-full bg-[#16a34a]"
                animate={{ height: ['6px', '16px', '6px'] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: 'easeInOut' }} />
            ))}
          </div>
          <motion.span className="text-[11px] text-muted-foreground font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
            Analisando seus dados...
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

function MessageBubble({ msg, index }: { msg: Msg; index: number }) {
  const isUser = msg.role === 'user';
  const timeStr = msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.15), ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 shadow-md shadow-[#16a34a]/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex flex-col max-w-[82%]">
          <div className={`px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white rounded-2xl rounded-br-sm shadow-[#16a34a]/15'
              : 'bg-card/80 backdrop-blur-sm border border-border/60 text-foreground rounded-2xl rounded-tl-sm'
          }`}>
            {!isUser ? (
              <div className="prose prose-sm prose-green max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0 [&_strong]:text-foreground [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : msg.content}
          </div>
          <span className={`text-[10px] text-muted-foreground/60 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'text-right' : 'text-left'}`}>
            {timeStr}
          </span>
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center flex-shrink-0 mt-1 ml-2.5 shadow-sm">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {msg.actions && msg.actions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="ml-[42px] mt-2 space-y-1.5">
          {msg.actions.map((action, ai) => (
            <motion.div key={ai} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + ai * 0.1 }}
              className="flex items-start gap-2.5 bg-[#f0fdf4]/80 dark:bg-[#14532d]/15 backdrop-blur-sm border border-[#bbf7d0]/60 dark:border-[#16a34a]/20 rounded-xl px-3.5 py-2.5">
              <div className="w-5 h-5 rounded-full bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
              </div>
              <span className="text-[12px] text-[#166534] dark:text-[#4ade80] font-medium leading-snug">{action}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// Streaming message that builds up
function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 shadow-md shadow-[#16a34a]/20">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[82%] px-4 py-3 text-[13px] leading-relaxed bg-card/80 backdrop-blur-sm border border-border/60 text-foreground rounded-2xl rounded-tl-sm shadow-sm">
        <div className="prose prose-sm prose-green max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0 [&_strong]:text-foreground">
          <ReactMarkdown>{content}</ReactMarkdown>
          <motion.span
            className="inline-block w-1.5 h-4 bg-[#16a34a] rounded-sm ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function AIChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamActions, setStreamActions] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingText]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350);
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
        role: m.role as 'user' | 'assistant',
        content: m.content,
        ts: new Date(m.created_at),
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

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Navegador não suporta reconhecimento de voz. Tente Chrome ou Edge.', ts: new Date() }]);
      return;
    }
    if (isRecording && recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR'; recognition.interimResults = true; recognition.continuous = false;
    recognitionRef.current = recognition;
    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim = event.results[i][0].transcript;
      }
      setInput(finalTranscript || interim);
    };
    recognition.onend = () => { setIsRecording(false); recognitionRef.current = null; if (finalTranscript.trim()) send(finalTranscript.trim()); };
    recognition.onerror = (event: any) => {
      setIsRecording(false); recognitionRef.current = null;
      if (event.error === 'not-allowed') setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Permissão de microfone negada.', ts: new Date() }]);
    };
    recognition.start(); setIsRecording(true);
  }, [isRecording, messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
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

      // Request streaming
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
        // SSE streaming
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
              if (parsed.type === 'actions') {
                actions = parsed.actions || [];
                setStreamActions(actions);
              } else {
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) { fullText += content; setStreamingText(fullText); }
              }
            } catch { /* partial JSON, skip */ }
          }
        }

        const assistantMsg: Msg = { role: 'assistant', content: fullText || 'Sem resposta.', ts: new Date(), actions: actions.length > 0 ? actions : undefined };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setStreamActions([]);
        await saveMessage(convoId, assistantMsg);
      } else {
        // JSON fallback
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
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[500]" onClick={onClose} />
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed top-0 right-0 z-[501] h-full w-full sm:w-[440px] bg-background/95 backdrop-blur-xl border-l border-border/40 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-border/30">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#16a34a]/10 blur-2xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ repeat: Infinity, duration: 4 }} />
              </div>
              <div className="relative flex items-center gap-3">
                <motion.div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#16a34a]/25"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-foreground tracking-tight">FinDash IA</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <motion.div className="w-2 h-2 rounded-full bg-[#16a34a]"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }} />
                    <p className="text-[11px] text-muted-foreground">Online • Gemini Pro</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowHistory(!showHistory)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showHistory ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                    <Clock className="w-4 h-4" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={startNewChat}
                    className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
                    <Plus className="w-4 h-4" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* History panel */}
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="border-b border-border/30 overflow-hidden">
                  <div className="p-3 max-h-[220px] overflow-y-auto space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Conversas</p>
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">{conversations.length}</span>
                    </div>
                    {conversations.length === 0 && (
                      <div className="flex flex-col items-center py-4 gap-2">
                        <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
                        <p className="text-[12px] text-muted-foreground/50">Nenhuma conversa ainda</p>
                      </div>
                    )}
                    {conversations.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                          activeConvoId === c.id ? 'bg-[#16a34a]/8 border border-[#16a34a]/15 shadow-sm' : 'hover:bg-muted/40 border border-transparent'
                        }`}
                        onClick={() => loadMessages(c.id)}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${activeConvoId === c.id ? 'bg-[#16a34a]/15' : 'bg-muted/60'}`}>
                          <MessageSquare className={`w-3.5 h-3.5 ${activeConvoId === c.id ? 'text-[#16a34a]' : 'text-muted-foreground/60'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] text-foreground truncate block font-medium">{c.title}</span>
                          <span className="text-[10px] text-muted-foreground/50">{formatDate(c.updated_at)}</span>
                        </div>
                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !loading && !streamingText && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center h-full gap-5 pb-8">
                  <div className="relative">
                    <motion.div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center shadow-xl shadow-[#16a34a]/20"
                      animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                      <Sparkles className="w-10 h-10 text-white" />
                    </motion.div>
                    <motion.div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-[#16a34a] flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <Zap className="w-3.5 h-3.5 text-[#16a34a]" />
                    </motion.div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-[17px] font-extrabold text-foreground tracking-tight">Olá! Sou sua assistente financeira</h3>
                    <p className="text-[13px] text-muted-foreground max-w-[300px] leading-relaxed">
                      Analiso e <strong className="text-foreground">gerencio</strong> seus dados com IA avançada. Respostas em tempo real, personalizadas para você.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-1 max-w-[380px]">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }} whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                        onClick={() => send(`${s.icon} ${s.text}`)}
                        className="border border-border/60 bg-card/80 backdrop-blur-sm rounded-xl px-3.5 py-2.5 text-[12px] font-medium text-foreground hover:border-[#16a34a]/30 hover:bg-[#16a34a]/5 hover:shadow-sm transition-all">
                        <span className="mr-1.5">{s.icon}</span>{s.text}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} />)}

              {/* Streaming actions */}
              {streamActions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-[42px] space-y-1.5">
                  {streamActions.map((action, ai) => (
                    <div key={ai} className="flex items-start gap-2.5 bg-[#f0fdf4]/80 dark:bg-[#14532d]/15 border border-[#bbf7d0]/60 dark:border-[#16a34a]/20 rounded-xl px-3.5 py-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                      </div>
                      <span className="text-[12px] text-[#166534] dark:text-[#4ade80] font-medium leading-snug">{action}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Streaming response */}
              {streamingText && <StreamingBubble content={streamingText} />}

              {/* Loading indicator (before streaming starts) */}
              {loading && !streamingText && <TypingIndicator />}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/30 p-3 bg-background/80 backdrop-blur-sm">
              <AnimatePresence>
                {isRecording && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mb-2 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/15">
                    <motion.div className="w-2.5 h-2.5 rounded-full bg-red-500"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                    <span className="text-[11px] font-medium text-red-600 dark:text-red-400">Gravando áudio...</span>
                    <div className="flex items-end gap-[2px] h-4 ml-auto">
                      {[0, 1, 2, 3, 4, 5, 6].map(i => (
                        <motion.div key={i} className="w-[2px] rounded-full bg-red-400"
                          animate={{ height: ['3px', `${8 + Math.random() * 8}px`, '3px'] }}
                          transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.05 }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="relative flex items-center gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleVoice}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    isRecording ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-muted/60 hover:bg-muted text-muted-foreground'
                  }`}>
                  {isRecording ? (
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                      <MicOff className="w-4 h-4 text-white" />
                    </motion.div>
                  ) : <Mic className="w-4 h-4" />}
                </motion.button>
                <div className="relative flex-1">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send(input)}
                    placeholder={isRecording ? 'Ouvindo...' : 'Pergunte ou peça uma ação...'}
                    className={`w-full border-[1.5px] rounded-xl py-3 pl-4 pr-12 text-[13px] bg-card/60 backdrop-blur-sm focus:outline-none transition-all ${
                      isRecording ? 'border-red-300 dark:border-red-700' : 'border-border/60 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10'
                    }`} />
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => send(input)}
                    disabled={!input.trim() || loading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center disabled:opacity-30 transition-all shadow-sm shadow-[#16a34a]/20 disabled:shadow-none">
                    {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                  </motion.button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
                FinDash IA • Powered by Gemini Pro • Seus dados ficam privados
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
