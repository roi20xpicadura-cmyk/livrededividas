import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Mic, Plus, Camera, Smile, Send, ArrowRight, Sparkles, Receipt, BarChart3, Wallet, Target, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ease = [0.16, 1, 0.3, 1] as const;

type Persona = 'personal' | 'business';

type CardData =
  | { type: 'expense'; label: string; value: number; date?: string }
  | { type: 'chart'; title: string; total: number; change?: string; bars: number[] }
  | { type: 'goal'; label: string; current: number; target: number; emoji?: string }
  | { type: 'balance'; label: string; value: number; sub?: string };

type Msg = {
  from: 'user' | 'bot';
  text?: string;
  time: string;
  cards?: CardData[];
  loading?: boolean;
};

const INITIAL_MSGS: Record<Persona, Msg[]> = {
  personal: [
    {
      from: 'bot',
      text: 'Oi! 👋 Sou a *Kora*, sua IA financeira. Você é o *Lucas* nessa demo — saldo de R$ 3.200, meta de viagem ativa.\n\nManda qualquer coisa, tipo: "gastei 50 no mercado" ou "quanto tenho?" 💚',
      time: '14:30',
    },
  ],
  business: [
    {
      from: 'bot',
      text: 'Oi! 👋 Sou a *Kora*, sua IA financeira do negócio. Você é a *Mariana* nessa demo — loja Hotmart, R$ 18.4k de receita esse mês.\n\nManda qualquer coisa, tipo: "qual meu lucro?" ou "recebi 1200 de venda" 💚',
      time: '14:30',
    },
  ],
};

const STARTER_SUGGESTIONS: Record<Persona, string[]> = {
  personal: ['gastei 84 no mercado', 'quanto torrei em delivery?', 'ta longe da meta?'],
  business: ['recebi 1200 de venda', 'qual meu lucro?', 'quanto gastei em tráfego?'],
};

const STORAGE_KEY = 'kora_wa_demo_v1';
const STORAGE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type PersistedState = {
  persona: Persona;
  messagesByPersona: Partial<Record<Persona, Msg[]>>;
  suggestionsByPersona: Partial<Record<Persona, string[]>>;
  savedAt: number;
};

function loadPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > STORAGE_MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function formatBRL(v: number) {
  const abs = Math.abs(v);
  return `${v < 0 ? '-' : ''}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: abs % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function renderInlineMarkdown(text: string) {
  // *bold* → <strong>
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
      <strong key={i} className="font-bold text-white">{p.slice(1, -1)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function CardRenderer({ card }: { card: CardData }) {
  if (card.type === 'expense') {
    return (
      <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-[#0f1f17] p-3 max-w-[240px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide">
            {card.value < 0 ? 'Despesa lançada' : 'Receita lançada'}
          </span>
          <Check className="w-3 h-3 text-[#4ade80]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white leading-tight truncate">{card.label}</div>
            <div className="text-[10px] text-white/50">{card.date || 'agora'}</div>
          </div>
          <div className={`text-[13px] font-[900] ${card.value < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
            {formatBRL(card.value)}
          </div>
        </div>
      </div>
    );
  }
  if (card.type === 'chart') {
    const max = Math.max(...card.bars, 1);
    return (
      <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-[#0f1f17] p-3 max-w-[260px]">
        <div className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide mb-1">{card.title}</div>
        <div className="text-[18px] font-[900] text-white leading-tight">{formatBRL(card.total)}</div>
        {card.change && (
          <div className={`text-[10px] font-semibold mb-2 ${card.change.startsWith('+') ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
            ▲ {card.change} vs período anterior
          </div>
        )}
        <div className="flex items-end gap-[3px] h-12 mt-1">
          {card.bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-[#4ade80]/30 to-[#4ade80]"
              style={{ height: `${(h / max) * 100}%`, minHeight: '4px' }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (card.type === 'goal') {
    const pct = Math.min(100, Math.round((card.current / card.target) * 100));
    return (
      <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-[#0f1f17] p-3 max-w-[250px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide truncate">
            {card.emoji} Meta: {card.label}
          </span>
          <span className="text-[10px] font-bold text-[#4ade80] flex-shrink-0 ml-1">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-[#1f3a2a] rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease }}
            className="h-full bg-gradient-to-r from-[#4ade80] to-[#16a34a] rounded-full"
          />
        </div>
        <div className="text-[10px] text-white/60">
          {formatBRL(card.current)} / {formatBRL(card.target)}
        </div>
      </div>
    );
  }
  if (card.type === 'balance') {
    return (
      <div className="mt-2 rounded-xl border border-[#1f3a2a] bg-gradient-to-br from-[#16a34a]/30 to-[#0f1f17] p-3 max-w-[220px]">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-3 h-3 text-[#86efac]" />
          <span className="text-[10px] font-bold text-[#86efac] uppercase tracking-wide">{card.label}</span>
        </div>
        <div className="text-[20px] font-[900] text-white leading-tight">{formatBRL(card.value)}</div>
        {card.sub && <div className="text-[10px] text-[#86efac] mt-0.5">{card.sub}</div>}
      </div>
    );
  }
  return null;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function WhatsAppSection() {
  const persisted = typeof window !== 'undefined' ? loadPersisted() : null;
  const initialPersona: Persona = persisted?.persona ?? 'personal';
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [messagesByPersona, setMessagesByPersona] = useState<Record<Persona, Msg[]>>({
    personal: persisted?.messagesByPersona?.personal ?? INITIAL_MSGS.personal,
    business: persisted?.messagesByPersona?.business ?? INITIAL_MSGS.business,
  });
  const [suggestionsByPersona, setSuggestionsByPersona] = useState<Record<Persona, string[]>>({
    personal: persisted?.suggestionsByPersona?.personal ?? STARTER_SUGGESTIONS.personal,
    business: persisted?.suggestionsByPersona?.business ?? STARTER_SUGGESTIONS.business,
  });
  const messages = messagesByPersona[persona];
  const suggestions = suggestionsByPersona[persona];
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist to localStorage whenever conversation changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload: PersistedState = {
        persona,
        messagesByPersona,
        suggestionsByPersona,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [persona, messagesByPersona, suggestionsByPersona]);

  // Switch persona resets conversation
  const switchPersona = (p: Persona) => {
    if (p === persona) return;
    setPersona(p);
    setErrorMsg(null);
  };

  const resetConversation = () => {
    setMessagesByPersona(prev => ({ ...prev, [persona]: INITIAL_MSGS[persona] }));
    setSuggestionsByPersona(prev => ({ ...prev, [persona]: STARTER_SUGGESTIONS[persona] }));
    setErrorMsg(null);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setErrorMsg(null);
    setInput('');

    const userMsg: Msg = { from: 'user', text, time: nowTime() };
    const newMsgs = [...messages, userMsg];
    setMessagesByPersona(prev => ({ ...prev, [persona]: [...newMsgs, { from: 'bot', loading: true, time: nowTime() }] }));
    setLoading(true);

    try {
      const history = newMsgs
        .filter(m => m.text)
        .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text! }));

      const { data, error } = await supabase.functions.invoke('whatsapp-demo', {
        body: { persona, messages: history },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessagesByPersona(prev => ({
        ...prev,
        [persona]: [
          ...newMsgs,
          {
            from: 'bot',
            text: data.text || '...',
            cards: data.cards || [],
            time: nowTime(),
          },
        ],
      }));
      if (Array.isArray(data.suggestions) && data.suggestions.length) {
        setSuggestionsByPersona(prev => ({ ...prev, [persona]: data.suggestions }));
      }
    } catch (err: any) {
      setMessagesByPersona(prev => ({ ...prev, [persona]: newMsgs }));
      setErrorMsg(err?.message || 'Erro ao conversar com a Kora. Tenta de novo?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-16 md:py-28 px-4 overflow-hidden bg-gradient-to-b from-[#f0fdf4] via-white to-[#f0fdf4]">
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#22c55e]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#4ade80]/10 blur-3xl" />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] mb-5">
            <Sparkles className="w-3 h-3 text-[#16a34a]" />
            <span className="text-[11px] font-[800] text-[#15803d] uppercase tracking-[1px]">Demo ao vivo · IA real</span>
          </div>
          <h2 className="text-[28px] md:text-[48px] font-[900] text-[#0f172a] tracking-[-1px] md:tracking-[-2px] leading-[1.1]">
            Converse com a Kora <br className="hidden md:block" />
            <span className="text-[#16a34a]">no WhatsApp. Agora.</span>
          </h2>
          <p className="text-[15px] md:text-[18px] text-[#64748b] mt-4 max-w-[580px] mx-auto leading-[1.6]">
            Não é vídeo. Não é gif. É a IA real do KoraFinance respondendo às suas mensagens com uma carteira fictícia. Teste agora 👇
          </p>
        </motion.div>

        {/* Persona toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-white border border-[#e2e8f0] rounded-full shadow-sm">
            {([
              { id: 'personal' as const, label: '👤 Vida pessoal', sub: 'Lucas' },
              { id: 'business' as const, label: '💼 Meu negócio', sub: 'Mariana' },
            ]).map(opt => (
              <button
                key={opt.id}
                onClick={() => switchPersona(opt.id)}
                className={`relative px-4 md:px-5 py-2 rounded-full text-[13px] md:text-[14px] font-bold transition-colors ${
                  persona === opt.id ? 'text-white' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {persona === opt.id && (
                  <motion.div
                    layoutId="persona-pill"
                    className="absolute inset-0 bg-[#16a34a] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-10 lg:gap-16 items-start">
          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="flex justify-center lg:sticky lg:top-24"
          >
            <div className="relative w-[320px] md:w-[360px] aspect-[9/19] rounded-[44px] border-[10px] border-[#0a0a0a] bg-[#0a0a0a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
              <div className="absolute -left-[12px] top-[22%] w-[3px] h-8 rounded-l bg-[#1a1a1a]" />
              <div className="absolute -left-[12px] top-[32%] w-[3px] h-14 rounded-l bg-[#1a1a1a]" />
              <div className="absolute -left-[12px] top-[44%] w-[3px] h-14 rounded-l bg-[#1a1a1a]" />
              <div className="absolute -right-[12px] top-[28%] w-[3px] h-20 rounded-r bg-[#1a1a1a]" />

              <div className="relative w-full h-full rounded-[34px] overflow-hidden flex flex-col bg-[#0b141a]">
                {/* Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[32%] h-[22px] rounded-full bg-black z-20" />

                {/* Header */}
                <div className="bg-[#1f2c33] pt-9 pb-2 px-3 flex items-center gap-2.5 border-b border-black/40">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] flex items-center justify-center text-white text-[13px] font-[900] shadow-md">
                    K
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white leading-tight flex items-center gap-1">
                      Kora · IA Financeira
                      <span className="text-[9px] font-bold text-[#0b141a] bg-[#22c55e] px-1 py-[1px] rounded">✓</span>
                    </div>
                    <div className="text-[10px] text-[#86efac] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                      {loading ? 'digitando...' : 'online'}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scroll-smooth"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 20% 30%, rgba(34,197,94,0.05) 0, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34,197,94,0.04) 0, transparent 50%)',
                    backgroundColor: '#0b141a',
                  }}
                >
                  <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-lg px-2.5 py-1.5 ${
                            m.from === 'user' ? 'bg-[#005c4b] rounded-tr-sm' : 'bg-[#202c33] rounded-tl-sm'
                          }`}
                        >
                          {m.loading ? (
                            <div className="flex items-center gap-1 py-1 px-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <>
                              {m.text && (
                                <p className="text-[12.5px] text-white leading-snug whitespace-pre-line">
                                  {renderInlineMarkdown(m.text)}
                                </p>
                              )}
                              {m.cards?.map((c, ci) => <CardRenderer key={ci} card={c} />)}
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className="text-[9px] text-white/50">{m.time}</span>
                                {m.from === 'user' && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {errorMsg && (
                    <div className="text-center text-[11px] text-[#fca5a5] bg-[#7f1d1d]/30 rounded-lg py-1.5 px-2">
                      {errorMsg}
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    send();
                  }}
                  className="bg-[#1f2c33] px-2 py-2 flex items-center gap-1.5 pb-4"
                >
                  <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center gap-2">
                    <Smile className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      disabled={loading}
                      placeholder={loading ? 'Kora pensando...' : 'Mensagem'}
                      maxLength={300}
                      className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/40 outline-none min-w-0"
                    />
                    <Plus className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <Camera className="w-4 h-4 text-white/50 flex-shrink-0" />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="w-9 h-9 rounded-full bg-[#22c55e] flex items-center justify-center disabled:opacity-50 hover:bg-[#16a34a] transition-colors"
                  >
                    {input.trim() ? <Send className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>

          {/* Right side */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[20px] md:text-[24px] font-[900] text-[#0f172a] tracking-[-0.5px] mb-2"
            >
              💡 Sugestões pra testar
            </motion.h3>
            <p className="text-[13px] md:text-[14px] text-[#64748b] mb-5">
              Toca em uma das opções abaixo ou digita o que quiser no celular ao lado.
            </p>

            <div className="space-y-2.5 mb-7">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s + i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="w-full group flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#86efac] hover:shadow-[0_8px_24px_rgba(34,197,94,0.12)] disabled:opacity-50 transition-all duration-200 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#22c55e] group-hover:border-[#22c55e] transition-colors">
                    {[Receipt, BarChart3, Target, Wallet][i % 4] && (() => {
                      const Icon = [Receipt, BarChart3, Target, Wallet][i % 4];
                      return <Icon className="w-4 h-4 text-[#16a34a] group-hover:text-white transition-colors" />;
                    })()}
                  </div>
                  <span className="flex-1 text-[14px] font-semibold text-[#0f172a] truncate">"{s}"</span>
                  <ArrowRight className="w-4 h-4 text-[#cbd5e1] group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { v: '<2s', l: 'resposta média' },
                { v: '24/7', l: 'sempre online' },
                { v: '🇧🇷', l: 'fala português' },
              ].map(s => (
                <div key={s.l} className="text-center p-3 rounded-xl bg-white/60 border border-[#e2e8f0]">
                  <div className="text-[18px] font-[900] text-[#16a34a]">{s.v}</div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#15803d] p-5 md:p-6 text-white">
              <div className="text-[13px] text-white/80 mb-1">Curtiu? 🎉</div>
              <div className="text-[18px] md:text-[20px] font-[900] mb-3 leading-tight">
                Conecta a Kora aos seus dados reais.
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Link
                  to="/register"
                  className="h-[46px] px-5 rounded-[12px] bg-white text-[#15803d] text-[14px] font-[800] hover:bg-[#f0fdf4] transition-colors inline-flex items-center justify-center gap-2"
                >
                  Criar conta grátis <ArrowRight className="w-4 h-4" />
                </Link>
                <span className="text-[12px] text-white/80">✓ Disponível em todos os planos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}