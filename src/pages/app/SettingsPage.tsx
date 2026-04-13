import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, config, updateProfile, updateConfig } = useProfile();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [projectName, setProjectName] = useState(config?.project_name || 'Meu Painel');
  const [currency, setCurrency] = useState(config?.currency || 'R$');
  const [savePct, setSavePct] = useState(config?.default_save_pct || 25);
  const [notifications, setNotifications] = useState(config?.notifications_enabled ?? true);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ full_name: fullName });
    toast.success('Perfil atualizado!');
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
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
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
