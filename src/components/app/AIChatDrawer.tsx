import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowUp, Loader2, CheckCircle2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string; ts: Date; actions?: string[] };

const SUGGESTIONS = [
  '📊 Como estão minhas finanças este mês?',
  '🎯 Estou no caminho certo para minha meta?',
  '💡 Onde posso economizar mais?',
  '➕ Adicione uma despesa de R$50 em Alimentação',
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const allMsgs = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMsgs }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.error || 'Erro ao conectar com a IA.'}`, ts: new Date() }]);
        setLoading(false);
        return;
      }

      const data = await resp.json();
      const assistantMsg: Msg = {
        role: 'assistant',
        content: data.reply || 'Sem resposta.',
        ts: new Date(),
        actions: data.actions,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro de conexão. Tente novamente.', ts: new Date() }]);
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[500]" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 z-[501] h-full w-full sm:w-[420px] bg-card border-l border-border flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
              <div className="w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-foreground">Assistente FinDash IA</p>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#16a34a]" />
                  <p className="text-[11px] text-muted-foreground">Pode consultar e alterar seus dados</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-background flex items-center justify-center hover:bg-muted/30 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full gap-4 pb-8">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
                    <Sparkles className="w-12 h-12 text-[#16a34a]" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-[16px] font-extrabold text-foreground">Olá! Sou seu assistente financeiro.</p>
                    <p className="text-[13px] text-muted-foreground max-w-[280px] mt-1 leading-relaxed">
                      Analiso e <strong>gerencio</strong> seus dados. Peça para adicionar lançamentos, atualizar metas, e muito mais.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="border border-[#d4edda] bg-card rounded-full px-3.5 py-2 text-[12px] font-semibold text-[#166534] hover:bg-secondary transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i}>
                  <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] px-3.5 py-3 text-[13px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#16a34a] text-white rounded-[12px_0_12px_12px]'
                        : 'bg-secondary border border-[#d4edda] text-foreground rounded-[0_12px_12px_12px]'
                    }`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm prose-green max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
                    </div>
                  </div>

                  {/* Actions performed */}
                  {m.actions && m.actions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ml-9 mt-2 space-y-1.5"
                    >
                      {m.actions.map((action, ai) => (
                        <div key={ai} className="flex items-start gap-2 bg-[#f0fdf4] dark:bg-[#14532d]/20 border border-[#bbf7d0] dark:border-[#16a34a]/30 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-4 h-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
                          <span className="text-[12px] text-[#166534] dark:text-[#4ade80] font-medium leading-snug">{action}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-secondary border border-[#d4edda] rounded-[0_12px_12px_12px] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} className="w-2 h-2 rounded-full bg-[#16a34a]"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Analisando e processando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/50 p-3">
              <div className="relative">
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send(input)}
                  placeholder="Pergunte ou peça uma ação..."
                  className="w-full border-[1.5px] border-border rounded-[10px] py-2.5 pl-3.5 pr-11 text-[13px] focus:border-[#16a34a] focus:outline-none transition-colors"
                />
                <button onClick={() => send(input)} disabled={!input.trim() || loading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#16a34a] flex items-center justify-center disabled:opacity-40 transition-opacity">
                  {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ArrowUp className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
