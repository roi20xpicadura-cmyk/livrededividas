import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Mic, Plus, Camera, Smile, Send, ArrowRight, Sparkles, Receipt, BarChart3, Wallet, Target, RotateCcw, X, Loader2, Zap, Shield, Globe2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import koraIcon from '@/assets/korafinance-icon.png';

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

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recCanceledRef = useRef(false);
  const MAX_REC_SECONDS = 30;

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

  const stopTimer = () => {
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (recording || loading || transcribing) return;
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorMsg('Seu navegador não suporta gravação de áudio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recCanceledRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        stopTimer();
        setRecording(false);
        if (recCanceledRef.current) {
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size < 1500) {
          setErrorMsg('Áudio muito curto. Segura o botão por mais tempo.');
          return;
        }
        await transcribeAndSend(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = window.setInterval(() => {
        setRecSeconds(s => {
          if (s + 1 >= MAX_REC_SECONDS) {
            try { mr.stop(); } catch {}
          }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.name === 'NotAllowedError' ? 'Permissão de microfone negada.' : 'Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = (cancel = false) => {
    if (!recording || !mediaRecorderRef.current) return;
    recCanceledRef.current = cancel;
    try { mediaRecorderRef.current.stop(); } catch {}
  };

  const transcribeAndSend = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const buf = await blob.arrayBuffer();
      // Convert to base64
      let binary = '';
      const bytes = new Uint8Array(buf);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const audioBase64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('whatsapp-demo-transcribe', {
        body: { audio: audioBase64, mime: blob.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text: string = (data?.text || '').trim();
      if (!text) {
        setErrorMsg('Não consegui entender o áudio. Tenta de novo?');
        return;
      }
      await send(text);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao transcrever áudio.');
    } finally {
      setTranscribing(false);
    }
  };

  useEffect(() => () => stopTimer(), []);

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
    <section className="relative py-16 sm:py-20 md:py-32 px-3 sm:px-4 overflow-x-clip bg-[#0a0613]">
      {/* Background — premium violet mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.35),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_90%,rgba(34,197,94,0.18),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_80%,rgba(167,139,250,0.20),transparent_70%)]" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(167,139,250,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Top + bottom fade */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#0a0613] to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0613] to-transparent" />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-8 sm:mb-10 md:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-[#a78bfa]/30 bg-[#7C3AED]/10 backdrop-blur-md mb-5 sm:mb-6 shadow-[0_0_30px_rgba(124,58,237,0.25)]">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-[800] text-white uppercase tracking-[1.2px] sm:tracking-[1.5px]">Demo ao vivo · IA real</span>
          </div>
          <h2 className="text-[26px] sm:text-[34px] md:text-[56px] font-[900] text-white tracking-[-1px] sm:tracking-[-1.5px] md:tracking-[-2.5px] leading-[1.05]">
            Converse com a Kora<br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#a78bfa] via-[#c4b5fd] to-[#86efac] bg-clip-text text-transparent"> no WhatsApp.</span>
          </h2>
          <p className="text-[14px] sm:text-[15px] md:text-[18px] text-white/60 mt-4 sm:mt-5 max-w-[600px] mx-auto leading-[1.6] px-2">
            Não é vídeo. Não é gif. É a IA real do <span className="text-white font-semibold">KoraFinance</span> respondendo às suas mensagens com uma carteira fictícia.
          </p>
        </motion.div>

        {/* Persona toggle */}
        {/* Persona toggle */}
        <div className="flex justify-center mb-10 sm:mb-12">
          <div className="inline-flex p-1 bg-white/[0.04] border border-white/10 rounded-full backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {([
              { id: 'personal' as const, emoji: '👤', label: 'Vida pessoal', sub: 'Lucas' },
              { id: 'business' as const, emoji: '💼', label: 'Meu negócio', sub: 'Mariana' },
            ]).map(opt => (
              <button
                key={opt.id}
                onClick={() => switchPersona(opt.id)}
                className={`relative whitespace-nowrap px-3 min-[400px]:px-3.5 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-full text-[11.5px] min-[400px]:text-[12px] sm:text-[13px] md:text-[14px] font-bold transition-colors ${
                  persona === opt.id ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {persona === opt.id && (
                  <motion.div
                    layoutId="persona-pill"
                    className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] rounded-full shadow-[0_4px_20px_rgba(124,58,237,0.5)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2">
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                  <span className={`hidden md:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${persona === opt.id ? 'bg-white/20' : 'bg-white/5'}`}>{opt.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-10 sm:gap-12 lg:gap-20 items-start">
          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="flex justify-center lg:sticky lg:top-24 relative"
          >
            {/* Glow halo behind phone */}
            <div className="absolute -inset-4 sm:-inset-10 bg-gradient-to-br from-[#7C3AED]/30 via-[#8B5CF6]/20 to-[#22c55e]/20 blur-3xl rounded-full pointer-events-none" />

            {/* Floating decorative card — top right (lg+ only to avoid overlap on tablet) */}
            <motion.div
              initial={{ opacity: 0, x: 20, y: -10 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4, ease }}
              className="hidden lg:flex absolute -right-4 xl:-right-6 top-12 z-10 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-[0_20px_60px_-15px_rgba(124,58,237,0.5)] rotate-[6deg]"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#7B6A9B] uppercase tracking-wide">Despesa</div>
                <div className="text-[13px] font-[900] text-[#1A0D35] font-mono">-R$ 84,00</div>
              </div>
            </motion.div>

            {/* Floating decorative card — bottom left (lg+ only) */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 10 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.55, ease }}
              className="hidden lg:flex absolute -left-6 xl:-left-8 bottom-20 z-10 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.5)] -rotate-[5deg]"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#7B6A9B] uppercase tracking-wide">Meta · Viagem</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                    <div className="h-full w-[68%] bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full" />
                  </div>
                  <span className="text-[11px] font-[900] text-[#16a34a] font-mono">68%</span>
                </div>
              </div>
            </motion.div>

            <div className="relative w-[270px] min-[400px]:w-[300px] min-[520px]:w-[330px] sm:w-[340px] md:w-[360px] aspect-[9/19] rounded-[36px] sm:rounded-[44px] border-[7px] sm:border-[10px] border-[#0a0a0a] bg-[#0a0a0a] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(167,139,250,0.15)]">
              {/* Side buttons — hidden on mobile to avoid overflow */}
              <div className="hidden sm:block absolute -left-[12px] top-[22%] w-[3px] h-8 rounded-l bg-[#1a1a1a]" />
              <div className="hidden sm:block absolute -left-[12px] top-[32%] w-[3px] h-14 rounded-l bg-[#1a1a1a]" />
              <div className="hidden sm:block absolute -left-[12px] top-[44%] w-[3px] h-14 rounded-l bg-[#1a1a1a]" />
              <div className="hidden sm:block absolute -right-[12px] top-[28%] w-[3px] h-20 rounded-r bg-[#1a1a1a]" />

              <div className="relative w-full h-full rounded-[34px] overflow-hidden flex flex-col bg-[#0b141a]">
                {/* Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[32%] h-[22px] rounded-full bg-black z-20" />

                {/* Header */}
                <div className="bg-[#1f2c33] pt-9 pb-2 px-3 flex items-center gap-2.5 border-b border-black/40">
                  <img
                    src={koraIcon}
                    alt="Kora Finance"
                    loading="lazy"
                    decoding="async"
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover shadow-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white leading-tight flex items-center gap-1">
                      Kora Finance
                      <span className="text-[9px] font-bold text-[#0b141a] bg-[#22c55e] px-1 py-[1px] rounded">✓</span>
                    </div>
                    <div className="text-[10px] text-[#86efac] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                      {loading ? 'digitando...' : 'online'}
                    </div>
                  </div>
                  {messages.length > 1 && (
                    <button
                      type="button"
                      onClick={resetConversation}
                      title="Limpar conversa"
                      className="ml-1 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                  className="bg-[#1f2c33] px-2 py-2 pb-4 flex items-center gap-1.5 min-w-0 w-full"
                >
                  {recording ? (
                    <>
                      <button
                        type="button"
                        onClick={() => stopRecording(true)}
                        className="w-9 h-9 flex-shrink-0 rounded-full bg-[#2a3942] flex items-center justify-center text-white/70 hover:text-white"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0 bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse flex-shrink-0" />
                        <span className="text-[12px] text-white font-mono">
                          {String(Math.floor(recSeconds / 60)).padStart(1, '0')}:{String(recSeconds % 60).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-[2px] h-4 overflow-hidden">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <span
                              key={i}
                              className="flex-1 bg-white/40 rounded-sm animate-pulse"
                              style={{
                                height: `${30 + Math.abs(Math.sin((recSeconds + i) * 0.7)) * 70}%`,
                                animationDelay: `${i * 50}ms`,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-white/50 flex-shrink-0">máx 30s</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => stopRecording(false)}
                        className="w-9 h-9 flex-shrink-0 rounded-full bg-[#22c55e] flex items-center justify-center hover:bg-[#16a34a] transition-colors"
                        title="Enviar áudio"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0 bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center gap-2">
                        <Smile className="w-4 h-4 text-white/50 flex-shrink-0" />
                        <input
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          disabled={loading || transcribing}
                          placeholder={transcribing ? 'Transcrevendo...' : loading ? 'Kora pensando...' : 'Mensagem'}
                          maxLength={300}
                          className="flex-1 min-w-0 w-full bg-transparent text-[13px] text-white placeholder:text-white/40 outline-none"
                        />
                        <Plus className="hidden min-[340px]:block w-4 h-4 text-white/50 flex-shrink-0" />
                        <Camera className="hidden min-[360px]:block w-4 h-4 text-white/50 flex-shrink-0" />
                      </div>
                      {input.trim() ? (
                        <button
                          type="submit"
                          disabled={loading || transcribing}
                          className="w-9 h-9 flex-shrink-0 rounded-full bg-[#22c55e] flex items-center justify-center disabled:opacity-50 hover:bg-[#16a34a] transition-colors"
                        >
                          <Send className="w-4 h-4 text-white" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={loading || transcribing}
                          title="Gravar áudio"
                          className="w-9 h-9 flex-shrink-0 rounded-full bg-[#22c55e] flex items-center justify-center disabled:opacity-50 hover:bg-[#16a34a] transition-colors"
                        >
                          {transcribing ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <Mic className="w-4 h-4 text-white" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </form>
              </div>
            </div>
          </motion.div>

          {/* Right side */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 mb-3">
                <Sparkles className="w-3 h-3 text-[#a78bfa]" />
                <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-[1.2px]">Toca pra testar</span>
              </div>
              <h3 className="text-[22px] md:text-[28px] font-[900] text-white tracking-[-0.8px] leading-tight">
                Sugestões prontas pra<br />
                <span className="bg-gradient-to-r from-[#a78bfa] to-[#86efac] bg-clip-text text-transparent">você experimentar.</span>
              </h3>
              <p className="text-[13px] md:text-[14px] text-white/50 mt-2">
                Clica em qualquer card abaixo — ou digita o que quiser no celular.
              </p>
            </motion.div>

            <div className="space-y-2.5 mb-8">
              {suggestions.map((s, i) => {
                const icons = [MessageCircle, Receipt, BarChart3, Target, Wallet];
                const Icon = icons[i % icons.length];
                return (
                  <motion.button
                    key={s + i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => send(s)}
                    disabled={loading}
                    className="w-full group relative flex items-center gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-[#a78bfa]/40 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-10px_rgba(124,58,237,0.5)] disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-300 text-left backdrop-blur-sm overflow-hidden"
                  >
                    {/* Hover gradient */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-[#7C3AED]/0 via-[#7C3AED]/5 to-[#22c55e]/10 pointer-events-none" />
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED]/20 to-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center flex-shrink-0 group-hover:from-[#7C3AED] group-hover:to-[#8B5CF6] group-hover:border-[#a78bfa] transition-all">
                      <Icon className="w-4 h-4 text-[#a78bfa] group-hover:text-white transition-colors" />
                    </div>
                    <span className="relative flex-1 text-[14px] font-semibold text-white/90 truncate">"{s}"</span>
                    <div className="relative w-7 h-7 rounded-full bg-white/5 group-hover:bg-[#22c55e] flex items-center justify-center transition-all flex-shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-7">
              {[
                { Icon: Zap, v: '<2s', l: 'resposta média' },
                { Icon: Shield, v: '24/7', l: 'sempre online' },
                { Icon: Globe2, v: 'PT-BR', l: 'fala português' },
              ].map(s => (
                <div key={s.l} className="relative p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden group hover:border-[#a78bfa]/30 transition-colors">
                  <s.Icon className="w-4 h-4 text-[#a78bfa] mb-2" />
                  <div className="text-[16px] md:text-[18px] font-[900] text-white tracking-tight font-mono">{s.v}</div>
                  <div className="text-[10px] text-white/50 mt-0.5 leading-tight">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-[#a78bfa]/40 via-[#7C3AED]/30 to-[#22c55e]/40 overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#22c55e]/30 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#7C3AED]/40 blur-3xl" />
              </div>
              <div className="relative rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#1a0d35] via-[#2A1A4F] to-[#1a0d35] p-6 md:p-7">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-[12px] font-bold text-white/70 uppercase tracking-[1.2px]">Curtiu a Kora?</div>
                </div>
                <div className="text-[20px] md:text-[24px] font-[900] text-white mb-4 leading-[1.15] tracking-[-0.5px]">
                  Conecta ela aos seus<br />
                  <span className="bg-gradient-to-r from-[#a78bfa] to-[#86efac] bg-clip-text text-transparent">dados reais agora.</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Link
                    to="/register"
                    className="group h-[50px] px-6 rounded-[14px] bg-white text-[#1a0d35] text-[14px] font-[800] hover:bg-[#f0eeff] transition-all inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.25)] hover:-translate-y-0.5"
                  >
                    Criar conta grátis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <span className="text-[12px] text-white/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#86efac]" /> Disponível em todos os planos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}