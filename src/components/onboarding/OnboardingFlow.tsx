import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { OBJECTIVES } from '@/lib/objectives';
import { toast } from 'sonner';

const PROFILE_TYPES = [
  { value: 'personal', emoji: '🏠', title: 'Vida Pessoal', desc: 'Controle gastos do dia a dia, contas, cartões, metas pessoais e economias.', tags: ['Gastos', 'Contas', 'Economias', 'Metas'] },
  { value: 'business', emoji: '💼', title: 'Meu Negócio', desc: 'DRE, fluxo de caixa, receitas, despesas e gestão financeira da empresa.', tags: ['DRE', 'Faturamento', 'Lucro', 'Investimentos'] },
  { value: 'both', emoji: '⚡', title: 'Pessoal + Negócio', desc: 'Visão completa da sua vida financeira — separe automaticamente o que é seu e o que é da empresa.', tags: ['Tudo incluso', 'Separado', 'Completo'], recommended: true },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [fullName, setFullName] = useState('');
  const [profileType, setProfileType] = useState('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [createdGoals, setCreatedGoals] = useState<Set<string>>(new Set());
  const [goalAmounts, setGoalAmounts] = useState<Record<string, string>>({});
  const [goalDeadlines, setGoalDeadlines] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const firstName = fullName.split(' ')[0] || 'Usuário';
  const totalSteps = 4;

  const goNext = () => { setDir(1); setStep(s => Math.min(s + 1, totalSteps - 1)); };
  const goBack = () => { setDir(-1); setStep(s => Math.max(s - 1, 0)); };

  const toggleObjective = (key: string) => {
    setObjectives(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleCreateGoal = async (objKey: string) => {
    const amount = parseFloat(goalAmounts[objKey] || '');
    const deadline = goalDeadlines[objKey];
    if (isNaN(amount) || amount <= 0) { toast.error('Informe um valor válido'); return; }
    const obj = OBJECTIVES.find(o => o.key === objKey);
    await supabase.from('goals').insert({
      user_id: user!.id,
      name: obj?.label || objKey,
      target_amount: amount,
      current_amount: 0,
      deadline: deadline || null,
      objective_type: objKey,
      is_highlighted: true,
    });
    setCreatedGoals(prev => new Set([...prev, objKey]));
    toast.success('Meta adicionada!');
  };

  const handleFinish = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user!.id);
    await supabase.from('user_config').update({
      profile_type: profileType || 'personal',
      financial_objectives: objectives,
      onboarding_completed: true,
      onboarding_step: totalSteps,
    }).eq('user_id', user!.id);
    setSaving(false);
    toast.success('🎉 Painel configurado! Bem-vindo ao KoraFinance.');
    onComplete();
  };

  const suggestedGoals = objectives.slice(0, 3).map(key => OBJECTIVES.find(o => o.key === key)!).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-card flex flex-col">
      {/* Progress bar */}
      <div className="h-[3px] bg-border w-full">
        <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        {step > 0 ? (
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        ) : <div />}
        <span className="text-xs text-muted font-medium">Passo {step + 1} de {totalSteps}</span>
        <button onClick={handleFinish} className="text-xs text-muted hover:text-foreground transition-colors">Pular</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }} className="w-full max-w-xl mx-auto">

            {step === 0 && (
              <div className="text-center">
                <div className="text-6xl mb-4">👋</div>
                <h1 className="text-4xl font-black text-fin-green-dark tracking-tight">Olá, {firstName}!</h1>
                <p className="text-lg text-muted mt-2">Vamos personalizar seu painel financeiro.</p>
                <div className="mt-12 max-w-sm mx-auto">
                  <label className="label-upper text-muted block mb-3">Qual é o seu nome?</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full text-2xl font-bold text-center border-0 border-b-2 border-fin-green-border focus:border-primary bg-transparent outline-none py-3 transition-colors" />
                </div>
                <button onClick={goNext} disabled={!fullName.trim()}
                  className="mt-8 w-full max-w-sm mx-auto flex items-center justify-center gap-2 h-[52px] rounded-xl bg-primary text-primary-foreground text-base font-extrabold hover:bg-fin-green-dark active:scale-[0.97] transition-all disabled:opacity-50">
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="text-center">
                <h2 className="text-3xl font-black text-fin-green-dark tracking-tight">Como você quer usar o KoraFinance?</h2>
                <p className="text-sm text-muted mt-2">Você pode mudar isso depois nas configurações.</p>
                <div className="mt-10 space-y-3 max-w-lg mx-auto">
                  {PROFILE_TYPES.map(pt => (
                    <button key={pt.value} onClick={() => setProfileType(pt.value)}
                      className={`w-full text-left p-5 rounded-2xl border-[1.5px] transition-all duration-200 relative ${
                        profileType === pt.value ? 'border-primary bg-fin-green-pale' : 'border-border bg-card hover:border-fin-green-border'
                      }`}>
                      {pt.recommended && (
                        <span className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">Recomendado</span>
                      )}
                      {profileType === pt.value && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-fin-green-pale flex items-center justify-center text-3xl flex-shrink-0">{pt.emoji}</div>
                        <div>
                          <p className="font-extrabold text-lg text-foreground">{pt.title}</p>
                          <p className="text-sm text-muted mt-1 leading-relaxed">{pt.desc}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {pt.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold text-muted">{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={goNext} disabled={!profileType}
                  className="mt-8 w-full max-w-lg mx-auto flex items-center justify-center gap-2 h-[52px] rounded-xl bg-primary text-primary-foreground text-base font-extrabold hover:bg-fin-green-dark active:scale-[0.97] transition-all disabled:opacity-50">
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="text-center">
                <h2 className="text-3xl font-black text-fin-green-dark tracking-tight">O que você quer alcançar?</h2>
                <p className="text-sm text-muted mt-2">Selecione quantos objetivos quiser. Vamos criar seu painel personalizado.</p>
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                  {OBJECTIVES.map(obj => {
                    const selected = objectives.includes(obj.key);
                    return (
                      <button key={obj.key} onClick={() => toggleObjective(obj.key)}
                        className={`p-4 rounded-xl border-[1.5px] text-center transition-all duration-200 relative ${
                          selected ? 'border-primary bg-fin-green-pale' : 'border-border bg-card hover:border-fin-green-border'
                        }`}>
                        {selected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                        <div className="text-3xl">{obj.emoji}</div>
                        <p className={`text-sm font-extrabold mt-2 ${selected ? 'text-primary' : 'text-fin-green-dark'}`}>{obj.label}</p>
                        <p className="text-[11px] text-muted mt-1 leading-snug">{obj.desc}</p>
                      </button>
                    );
                  })}
                </div>
                <button onClick={goNext} disabled={objectives.length === 0}
                  className="mt-8 w-full max-w-lg mx-auto flex items-center justify-center gap-2 h-[52px] rounded-xl bg-primary text-primary-foreground text-base font-extrabold hover:bg-fin-green-dark active:scale-[0.97] transition-all disabled:opacity-50">
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={goNext} className="mt-3 text-sm text-muted hover:text-foreground transition-colors">Não sei ainda — pular</button>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <h2 className="text-3xl font-black text-primary tracking-tight">Perfeito, {firstName}! 🎉</h2>
                <div className="mt-8 max-w-lg mx-auto p-6 rounded-2xl bg-fin-green-pale border border-fin-green-border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{PROFILE_TYPES.find(p => p.value === profileType)?.emoji || '⚡'}</span>
                    <span className="font-bold text-foreground">{PROFILE_TYPES.find(p => p.value === profileType)?.title || 'Pessoal + Negócio'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {objectives.slice(0, 4).map(key => {
                      const obj = OBJECTIVES.find(o => o.key === key);
                      return <span key={key} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{obj?.emoji} {obj?.label}</span>;
                    })}
                    {objectives.length > 4 && <span className="px-2.5 py-1 rounded-full bg-secondary text-muted text-xs font-semibold">+{objectives.length - 4} mais</span>}
                  </div>
                  <p className="text-sm text-fin-green-dark font-semibold mt-3">Seu painel foi personalizado para você ✓</p>
                </div>

                {suggestedGoals.length > 0 && (
                  <div className="mt-8 max-w-lg mx-auto text-left">
                    <p className="font-extrabold text-foreground mb-1">Crie sua primeira meta agora</p>
                    <p className="text-sm text-muted mb-4">Baseado nos seus objetivos, sugerimos:</p>
                    <div className="space-y-3">
                      {suggestedGoals.map(obj => (
                        <div key={obj.key} className="p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{obj.emoji}</span>
                            <span className="font-bold text-sm text-foreground">{obj.label}</span>
                          </div>
                          {createdGoals.has(obj.key) ? (
                            <p className="text-sm font-bold text-primary">✓ Meta adicionada!</p>
                          ) : (
                            <div className="space-y-2">
                              <input type="number" placeholder="Quanto quer alcançar? (R$)" value={goalAmounts[obj.key] || ''}
                                onChange={e => setGoalAmounts(prev => ({ ...prev, [obj.key]: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card" />
                              <input type="date" value={goalDeadlines[obj.key] || ''}
                                onChange={e => setGoalDeadlines(prev => ({ ...prev, [obj.key]: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card" />
                              <button onClick={() => handleCreateGoal(obj.key)}
                                className="px-4 py-2 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-fin-green-pale transition-all">
                                Adicionar esta meta
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleFinish} disabled={saving}
                  className="mt-8 w-full max-w-lg mx-auto flex items-center justify-center gap-2 h-[52px] rounded-xl bg-primary text-primary-foreground text-base font-extrabold hover:bg-fin-green-dark active:scale-[0.97] transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Concluir configuração →'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export { PROFILE_TYPES };
