import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Check, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { OBJECTIVES } from '@/lib/objectives';
import { toast } from 'sonner';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  options?: Option[];
  multiSelect?: boolean;
  inputType?: 'text' | 'goals';
};

type Option = {
  value: string;
  emoji: string;
  label: string;
  desc?: string;
  recommended?: boolean;
};

const PROFILE_OPTIONS: Option[] = [
  { value: 'personal', emoji: '🏠', label: 'Vida Pessoal', desc: 'Gastos, contas, metas pessoais' },
  { value: 'business', emoji: '💼', label: 'Meu Negócio', desc: 'DRE, faturamento, lucro' },
  { value: 'both', emoji: '⚡', label: 'Pessoal + Negócio', desc: 'Visão completa', recommended: true },
];

const OBJECTIVE_OPTIONS: Option[] = OBJECTIVES.map(o => ({
  value: o.key,
  emoji: o.emoji,
  label: o.label,
  desc: o.desc,
}));

type OnboardingStep = 'welcome' | 'name' | 'profile' | 'objectives' | 'goals' | 'done';

export default function OnboardingChat({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [fullName, setFullName] = useState('');
  const [profileType, setProfileType] = useState('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  const addMessage = useCallback((msg: Omit<Message, 'id'>, delay = 600) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { ...msg, id: crypto.randomUUID() }]);
      scrollToBottom();
    }, delay);
  }, [scrollToBottom]);

  // Start conversation
  useEffect(() => {
    const firstName = profile?.full_name?.split(' ')[0];
    if (firstName) {
      setFullName(profile!.full_name!);
      addMessage({
        role: 'assistant',
        content: `Olá, ${firstName}! 👋\n\nEu sou a **KoraFinance IA**, sua assistente financeira pessoal. Vou te ajudar a configurar tudo em menos de 1 minuto.\n\nComo você quer usar o KoraFinance?`,
        options: PROFILE_OPTIONS,
      }, 800);
      setCurrentStep('profile');
    } else {
      addMessage({
        role: 'assistant',
        content: `Olá! 👋\n\nEu sou a **KoraFinance IA**, sua assistente financeira pessoal.\n\nAntes de tudo, como posso te chamar?`,
        inputType: 'text',
      }, 800);
      setCurrentStep('name');
    }
    // Intentionally run once on mount: this useEffect seeds the first message
    // based on the initial profile snapshot. Re-running on profile changes
    // would duplicate the welcome message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSubmit = () => {
    if (!inputValue.trim()) return;
    const name = inputValue.trim();
    setFullName(name);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: name }]);
    setInputValue('');
    scrollToBottom();

    addMessage({
      role: 'assistant',
      content: `Prazer, **${name.split(' ')[0]}**! 🎉\n\nAgora me conta: como você quer usar o KoraFinance?`,
      options: PROFILE_OPTIONS,
    });
    setCurrentStep('profile');
  };

  const handleProfileSelect = (value: string) => {
    setProfileType(value);
    const selected = PROFILE_OPTIONS.find(o => o.value === value)!;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: `${selected.emoji} ${selected.label}` }]);
    scrollToBottom();

    addMessage({
      role: 'assistant',
      content: `Ótima escolha! ${value === 'both' ? 'Vamos separar pessoal e negócio automaticamente pra você. 💪' : value === 'business' ? 'Perfeito, vou focar no seu negócio! 📊' : 'Vamos organizar sua vida financeira! 🏠'}\n\nQuais são seus objetivos financeiros? Selecione quantos quiser:`,
      options: OBJECTIVE_OPTIONS,
      multiSelect: true,
    });
    setCurrentStep('objectives');
  };

  const [tempObjectives, setTempObjectives] = useState<string[]>([]);

  const toggleObjective = (key: string) => {
    setTempObjectives(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const confirmObjectives = () => {
    if (tempObjectives.length === 0) return;
    setObjectives(tempObjectives);
    const labels = tempObjectives.map(k => OBJECTIVES.find(o => o.key === k)!).filter(Boolean).map(o => `${o.emoji} ${o.label}`);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: labels.join(', ') }]);
    scrollToBottom();

    const firstName = fullName.split(' ')[0];
    const tips = tempObjectives.slice(0, 2).map(k => {
      const obj = OBJECTIVES.find(o => o.key === k);
      if (k === 'debt_free' || k === 'pay_card') return `\n• **${obj?.label}** — Vou monitorar suas dívidas e te avisar quando der pra amortizar.`;
      if (k === 'save_money' || k === 'emergency_fund') return `\n• **${obj?.label}** — Vou criar uma meta automática e acompanhar seu progresso.`;
      if (k === 'invest') return `\n• **${obj?.label}** — Vou rastrear seus investimentos e sugerir diversificação.`;
      return `\n• **${obj?.label}** — Vou acompanhar de perto e te dar insights.`;
    }).join('');

    addMessage({
      role: 'assistant',
      content: `Perfeito, ${firstName}! Entendi seus objetivos. Aqui está o que vou fazer por você:${tips}\n\n**Tudo pronto!** Seu painel foi personalizado. Posso começar a te ajudar agora? 🚀`,
    });
    setCurrentStep('done');
  };

  const handleFinish = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user!.id);
    await supabase.from('user_config').update({
      profile_type: profileType || 'personal',
      financial_objectives: objectives,
      onboarding_completed: true,
      onboarding_step: 4,
    }).eq('user_id', user!.id);

    // Create goals from objectives
    for (const key of objectives.slice(0, 3)) {
      const obj = OBJECTIVES.find(o => o.key === key);
      if (obj) {
        await supabase.from('goals').insert({
          user_id: user!.id,
          name: obj.label,
          target_amount: key === 'emergency_fund' ? 10000 : key === 'travel' ? 5000 : key === 'buy_house' ? 50000 : 1000,
          current_amount: 0,
          objective_type: key,
          is_highlighted: true,
        });
      }
    }

    setSaving(false);
    toast.success('🎉 Painel configurado! Bem-vindo ao KoraFinance.');
    onComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentStep === 'name') handleNameSubmit();
    }
  };

  const progress = currentStep === 'welcome' ? 0 : currentStep === 'name' ? 25 : currentStep === 'profile' ? 50 : currentStep === 'objectives' ? 75 : 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: 'var(--color-border-weak)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'var(--color-green-500)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center" style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>KoraFinance IA</p>
            <p style={{ fontSize: 11, color: 'var(--color-green-600)', fontWeight: 600 }}>
              {isTyping ? 'Digitando...' : 'Online'}
            </p>
          </div>
        </div>
        <button
          onClick={handleFinish}
          style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}
          className="hover:text-foreground transition-colors"
        >
          Pular
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center justify-center" style={{
                      width: 24, height: 24, borderRadius: 8,
                      background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
                    }}>
                      <Sparkles size={12} color="white" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-subtle)' }}>KoraFinance IA</span>
                  </div>
                )}

                <div style={{
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, var(--color-green-600), var(--color-green-700))'
                    : 'var(--color-bg-surface)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--color-border-weak)',
                  color: msg.role === 'user' ? 'white' : 'var(--color-text-base)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontWeight: 500,
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                      {line.split('**').map((part, j) => j % 2 === 1
                        ? <strong key={j} style={{ fontWeight: 800 }}>{part}</strong>
                        : <span key={j}>{part}</span>
                      )}
                    </p>
                  ))}
                </div>

                {/* Options */}
                {msg.options && !msg.multiSelect && currentStep === 'profile' && (
                  <div className="mt-3 space-y-2">
                    {msg.options.map(opt => (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleProfileSelect(opt.value)}
                        className="w-full text-left flex items-center gap-3 transition-all"
                        style={{
                          padding: '14px 16px',
                          borderRadius: 14,
                          border: `1.5px solid ${profileType === opt.value ? 'var(--color-green-500)' : 'var(--color-border-base)'}`,
                          background: profileType === opt.value ? 'var(--color-green-50)' : 'var(--color-bg-surface)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>{opt.label}</span>
                            {opt.recommended && (
                              <span style={{
                                fontSize: 9, fontWeight: 800,
                                background: 'var(--color-green-600)', color: 'white',
                                padding: '2px 8px', borderRadius: 99,
                              }}>Recomendado</span>
                            )}
                          </div>
                          {opt.desc && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{opt.desc}</p>}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Multi-select objectives */}
                {msg.multiSelect && msg.options && currentStep === 'objectives' && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {msg.options.map(opt => {
                        const selected = tempObjectives.includes(opt.value);
                        return (
                          <motion.button
                            key={opt.value}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleObjective(opt.value)}
                            className="text-left relative transition-all"
                            style={{
                              padding: '12px',
                              borderRadius: 12,
                              border: `1.5px solid ${selected ? 'var(--color-green-500)' : 'var(--color-border-base)'}`,
                              background: selected ? 'var(--color-green-50)' : 'var(--color-bg-surface)',
                              cursor: 'pointer',
                            }}
                          >
                            {selected && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--color-green-600)' }}>
                                <Check size={11} color="white" />
                              </div>
                            )}
                            <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                            <p style={{ fontSize: 12, fontWeight: 700, color: selected ? 'var(--color-green-700)' : 'var(--color-text-strong)', marginTop: 4 }}>
                              {opt.label}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                    {tempObjectives.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={confirmObjectives}
                        className="w-full flex items-center justify-center gap-2 mt-3"
                        style={{
                          height: 48, borderRadius: 14,
                          background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
                          color: 'white', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer',
                        }}
                      >
                        Confirmar ({tempObjectives.length}) <ArrowRight size={16} />
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1.5 px-4 py-3" style={{
                borderRadius: '4px 16px 16px 16px',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-weak)',
              }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-green-500)' }} />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-green-500)' }} />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-green-500)' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--color-border-weak)', background: 'var(--color-bg-surface)' }}>
        {currentStep === 'done' ? (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleFinish}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2"
            style={{
              height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))',
              color: 'white', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Configurando...' : '🚀 Começar a usar o KoraFinance'}
          </motion.button>
        ) : currentStep === 'name' ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite seu nome..."
              autoFocus
              className="flex-1 outline-none"
              style={{
                height: 48, borderRadius: 14, padding: '0 16px',
                border: '1.5px solid var(--color-border-base)',
                background: 'var(--color-bg-base)',
                fontSize: 14, fontWeight: 600,
                color: 'var(--color-text-strong)',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNameSubmit}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center"
              style={{
                width: 48, height: 48, borderRadius: 14,
                background: inputValue.trim()
                  ? 'linear-gradient(135deg, var(--color-green-500), var(--color-green-700))'
                  : 'var(--color-bg-sunken)',
                border: 'none', cursor: inputValue.trim() ? 'pointer' : 'default',
              }}
            >
              <Send size={18} color={inputValue.trim() ? 'white' : 'var(--color-text-disabled)'} />
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', fontWeight: 500 }}>
              {currentStep === 'profile' ? 'Escolha uma opção acima' : currentStep === 'objectives' ? 'Selecione seus objetivos acima' : ''}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
