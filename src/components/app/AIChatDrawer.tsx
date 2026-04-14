import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowUp, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string; ts: Date };

const SUGGESTIONS = [
  '📊 Como estão minhas finanças este mês?',
  '🎯 Estou no caminho certo para minha meta?',
  '💡 Onde posso economizar mais?',
  '📈 Qual meu ROI atual?',
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

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.error || 'Erro ao conectar com a IA.'}`, ts: new Date() }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let assistantSoFar = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && prev.length > 0 && prev[prev.length - 2]?.role === 'user') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar, ts: new Date() }];
              });
            }
          } catch { /* partial */ }
        }
      }
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
            className="fixed top-0 right-0 z-[501] h-full w-full sm:w-[420px] bg-white border-l border-[#e2e8f0] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9]">
              <div className="w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-[#14532d]">Assistente FinDash IA</p>
                <p className="text-[11px] text-[#94a3b8]">Powered by Lovable AI</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#f8faf8] flex items-center justify-center hover:bg-[#f1f5f9] transition-colors">
                <X className="w-4 h-4 text-[#94a3b8]" />
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
                    <p className="text-[16px] font-extrabold text-[#14532d]">Olá! Sou seu assistente financeiro.</p>
                    <p className="text-[13px] text-[#64748b] max-w-[280px] mt-1 leading-relaxed">
                      Analiso seus dados em tempo real e respondo qualquer dúvida sobre suas finanças.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="border border-[#d4edda] bg-white rounded-full px-3.5 py-2 text-[12px] font-semibold text-[#166534] hover:bg-[#f0fdf4] transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3.5 py-3 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#16a34a] text-white rounded-[12px_0_12px_12px]'
                      : 'bg-[#f0fdf4] border border-[#d4edda] text-[#1a2e1a] rounded-[0_12px_12px_12px]'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm prose-green max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-[#f0fdf4] border border-[#d4edda] rounded-[0_12px_12px_12px] px-4 py-3 flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full bg-[#16a34a]"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#f1f5f9] p-3">
              <div className="relative">
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send(input)}
                  placeholder="Pergunte qualquer coisa..."
                  className="w-full border-[1.5px] border-[#e2e8f0] rounded-[10px] py-2.5 pl-3.5 pr-11 text-[13px] focus:border-[#16a34a] focus:outline-none transition-colors"
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
