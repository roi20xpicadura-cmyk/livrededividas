import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { OBJECTIVES } from '@/lib/objectives';
import { PROFILE_TYPES } from '@/components/onboarding/OnboardingFlow';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, config, updateProfile, updateConfig } = useProfile();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [projectName, setProjectName] = useState(config?.project_name || 'Meu Painel');
  const [currency, setCurrency] = useState(config?.currency || 'R$');
  const [savePct, setSavePct] = useState(config?.default_save_pct || 25);
  const [notifications, setNotifications] = useState(config?.notifications_enabled ?? true);
  const [profileType, setProfileType] = useState(config?.profile_type || 'personal');
  const [objectives, setObjectives] = useState<string[]>(config?.financial_objectives || []);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProfileType(config.profile_type || 'personal');
      setObjectives(config.financial_objectives || []);
      setProjectName(config.project_name || 'Meu Painel');
      setCurrency(config.currency || 'R$');
      setSavePct(config.default_save_pct || 25);
      setNotifications(config.notifications_enabled ?? true);
    }
    if (profile) setFullName(profile.full_name || '');
  }, [config, profile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ full_name: fullName });
    toast.success('Perfil atualizado!');
    setSaving(false);
  };

  const handleSaveProfileType = async (val: string) => {
    setProfileType(val);
    await updateConfig({ profile_type: val } as any);
    toast.success('Perfil atualizado! Recarregando painel...');
  };

  const toggleObjective = (key: string) => {
    setObjectives(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSaveObjectives = async () => {
    setSaving(true);
    await updateConfig({ financial_objectives: objectives } as any);
    toast.success('Objetivos salvos!');
    setSaving(false);
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    await updateConfig({ project_name: projectName, currency, default_save_pct: savePct, notifications_enabled: notifications });
    toast.success('Preferências salvas!');
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { toast.error('Senhas não coincidem'); return; }
    if (newPw.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha alterada!');
    setNewPw(''); setConfirmPw('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Type */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Tipo de perfil</h2>
        <div className="space-y-2">
          {PROFILE_TYPES.map(pt => (
            <button key={pt.value} onClick={() => handleSaveProfileType(pt.value)}
              className={`w-full text-left p-4 rounded-xl border-[1.5px] transition-all relative ${
                profileType === pt.value ? 'border-primary bg-fin-green-pale' : 'border-border bg-card hover:border-fin-green-border'
              }`}>
              {profileType === pt.value && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{pt.emoji}</span>
                <div>
                  <p className="font-bold text-sm text-foreground">{pt.title}</p>
                  <p className="text-xs text-muted">{pt.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Meus objetivos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
          {OBJECTIVES.map(obj => {
            const selected = objectives.includes(obj.key);
            return (
              <button key={obj.key} onClick={() => toggleObjective(obj.key)}
                className={`p-3 rounded-xl border-[1.5px] text-center transition-all relative ${
                  selected ? 'border-primary bg-fin-green-pale' : 'border-border bg-card hover:border-fin-green-border'
                }`}>
                {selected && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-primary-foreground" /></div>}
                <span className="text-xl block">{obj.emoji}</span>
                <span className={`text-[10px] font-bold block mt-1 ${selected ? 'text-primary' : 'text-muted'}`}>{obj.label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={handleSaveObjectives} disabled={saving}
          className="px-4 py-2 rounded-[9px] bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
          Salvar objetivos
        </button>
        <p className="text-[10px] text-muted mt-2">Suas metas serão atualizadas automaticamente</p>
      </div>

      {/* Profile */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Perfil</h2>
        <div className="space-y-3">
          <div>
            <label className="label-upper text-muted block mb-1.5">Nome completo</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="label-upper text-muted block mb-1.5">E-mail</label>
            <input value={user?.email || ''} readOnly className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-border bg-secondary text-sm text-muted" />
          </div>
          <button onClick={handleSaveProfile} disabled={saving}
            className="px-4 py-2 rounded-[9px] bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
            Salvar perfil
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Preferências</h2>
        <div className="space-y-3">
          <div>
            <label className="label-upper text-muted block mb-1.5">Nome do projeto</label>
            <input value={projectName} onChange={e => setProjectName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="label-upper text-muted block mb-1.5">Moeda</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm">
              <option value="R$">R$ (Real)</option><option value="$">$ (Dólar)</option><option value="€">€ (Euro)</option>
            </select>
          </div>
          <div>
            <label className="label-upper text-muted block mb-1.5">% padrão a guardar: {savePct}%</label>
            <input type="range" min={0} max={100} value={savePct} onChange={e => setSavePct(Number(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} className="rounded border-border accent-primary" />
            Notificações ativadas
          </label>
          <button onClick={handleSavePrefs} disabled={saving}
            className="px-4 py-2 rounded-[9px] bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
            Salvar preferências
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Segurança</h2>
        <div className="space-y-3">
          <div>
            <label className="label-upper text-muted block mb-1.5">Nova senha</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="label-upper text-muted block mb-1.5">Confirmar nova senha</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary outline-none" />
          </div>
          <button onClick={handleChangePassword} disabled={saving}
            className="px-4 py-2 rounded-[9px] bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
            Alterar senha
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card-surface p-6 border-destructive">
        <h2 className="text-[13px] font-extrabold text-destructive mb-4">Zona de Perigo</h2>
        <button className="px-4 py-2 rounded-[9px] border-[1.5px] border-destructive text-destructive text-xs font-bold hover:bg-fin-red-pale transition-all">
          Excluir minha conta
        </button>
      </div>
    </div>
  );
}
