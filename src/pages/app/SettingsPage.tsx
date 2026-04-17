import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { OBJECTIVES } from '@/lib/objectives';
import { PROFILE_TYPES } from '@/components/onboarding/OnboardingFlow';
import { Check, Download, Trash2, FileText, Camera, Bell, BellOff, Shield, ChevronRight, User, Target as TargetIcon, Sliders, Lock, MessageCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { requestPushPermission, checkNotificationSupport, sendLocalNotification } from '@/lib/pushNotifications';
import WhatsAppSettings from '@/components/app/WhatsAppSettings';

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
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [pushEnabled, setPushEnabled] = useState(false);
  const notifSupport = checkNotificationSupport();

  useEffect(() => {
    if (config) {
      setProfileType(config.profile_type || 'personal');
      setObjectives(config.financial_objectives || []);
      setProjectName(config.project_name || 'Meu Painel');
      setCurrency(config.currency || 'R$');
      setSavePct(config.default_save_pct || 25);
      setNotifications(config.notifications_enabled ?? true);
    }
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [config, profile]);

  // Fetch notification preferences
  useEffect(() => {
    if (!user) return;
    supabase.from('notification_preferences').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          const { id, user_id, created_at, ...prefs } = data;
          setNotifPrefs(prefs as Record<string, boolean>);
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ full_name: fullName });
    toast.success('Perfil atualizado!');
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      await updateProfile({ avatar_url: url });
      setAvatarUrl(url);
      toast.success('Foto de perfil atualizada!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar foto');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      await updateProfile({ avatar_url: null as any });
      setAvatarUrl('');
      toast.success('Foto removida');
    } catch {
      toast.error('Erro ao remover foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfileType = async (val: string) => {
    setProfileType(val);
    await updateConfig({ profile_type: val } as any);
    toast.success('Perfil atualizado!');
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

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const tables = ['transactions', 'goals', 'goal_checkins', 'debts', 'debt_payments', 'credit_cards', 'card_bills', 'investments', 'budgets', 'achievements', 'recurring_transactions'] as const;
      const allData: Record<string, any> = { profile, config };
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        allData[table] = data || [];
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kora_meus_dados_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Seus dados foram exportados com sucesso');
    } catch {
      toast.error('Erro ao exportar dados');
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'EXCLUIR') { toast.error('Digite EXCLUIR para confirmar'); return; }
    toast.info('Recebemos sua solicitação. Seus dados serão excluídos em até 30 dias.');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="space-y-6 max-w-2xl px-4 py-5 md:px-0 pb-4">
      {/* WhatsApp Integration */}
      <WhatsAppSettings />

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
      </div>

      {/* Profile */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Perfil</h2>
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-[1.5px] border-fin-green-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-fin-green-pale border-[1.5px] border-fin-green-border flex items-center justify-center text-2xl font-bold text-fin-green-dark">
                  {(fullName || user?.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Alterar foto"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:brightness-110 disabled:opacity-50"
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">Foto de perfil</p>
              <p className="text-[11px] text-muted mb-2">JPG ou PNG, até 2MB</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-[9px] bg-primary text-primary-foreground text-[11px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Enviando…' : 'Enviar foto'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-[9px] border-[1.5px] border-border text-[11px] font-bold text-muted hover:border-fin-green-border transition-all disabled:opacity-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

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

      {/* Notificações */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Notificações</h2>
        <div className="space-y-3">
          {notifSupport.local ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
                <div className="flex items-center gap-3">
                  {pushEnabled ? <Bell size={18} style={{ color: 'var(--color-green-600)' }} /> : <BellOff size={18} className="text-muted" />}
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-base)' }}>Notificações push</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {pushEnabled ? 'Ativadas — você receberá alertas' : 'Desativadas'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const granted = await requestPushPermission();
                    setPushEnabled(granted);
                    if (granted) {
                      toast.success('Notificações ativadas!');
                      sendLocalNotification('KoraFinance', '🎉 Notificações ativadas com sucesso!');
                    } else {
                      toast.error('Permissão negada. Ative nas configurações do navegador.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: pushEnabled ? 'var(--color-green-100)' : 'var(--color-bg-surface)',
                    color: pushEnabled ? 'var(--color-green-700)' : 'var(--color-text-muted)',
                    border: '1.5px solid var(--color-border-base)',
                  }}
                >
                  {pushEnabled ? 'Ativado ✓' : 'Ativar'}
                </button>
              </div>

              {/* Notification type preferences */}
              {Object.keys(notifPrefs).length > 0 && (
                <div className="space-y-2">
                  {[
                    { key: 'budget_alerts', label: 'Alertas de orçamento', emoji: '📊' },
                    { key: 'goal_alerts', label: 'Progresso de metas', emoji: '🎯' },
                    { key: 'card_due_alerts', label: 'Vencimento de cartões', emoji: '💳' },
                    { key: 'debt_reminders', label: 'Lembretes de dívidas', emoji: '📋' },
                    { key: 'streak_alerts', label: 'Sequência diária', emoji: '🔥' },
                    { key: 'weekly_summary', label: 'Resumo semanal', emoji: '📈' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-3 rounded-xl border-[1.5px] cursor-pointer transition-all"
                      style={{ borderColor: notifPrefs[item.key] ? 'var(--color-green-300)' : 'var(--color-border-base)', background: notifPrefs[item.key] ? 'var(--color-green-50)' : 'var(--color-bg-surface)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.emoji}</span>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-base)' }}>{item.label}</span>
                      </div>
                      <input type="checkbox" checked={notifPrefs[item.key] ?? true}
                        onChange={async (e) => {
                          const updated = { ...notifPrefs, [item.key]: e.target.checked };
                          setNotifPrefs(updated);
                          if (user) {
                            await supabase.from('notification_preferences').upsert({
                              user_id: user.id,
                              ...updated,
                            }, { onConflict: 'user_id' });
                          }
                        }}
                        className="rounded border-border accent-primary w-4 h-4" />
                    </label>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              Seu navegador não suporta notificações push.
            </p>
          )}
        </div>
      </div>


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

      {/* LGPD Data Section */}
      <div className="card-surface p-6">
        <h2 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Meus Dados (LGPD)</h2>
        <div className="space-y-4">
          {/* Terms acceptance info */}
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
            <FileText size={18} style={{ color: 'var(--color-green-600)' }} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-base)' }}>Aceitação dos Termos</p>
              <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Termos aceitos em {profile?.terms_accepted_at ? new Date(profile.terms_accepted_at).toLocaleDateString('pt-BR') : '—'}, versão {profile?.terms_version || '1.0'}
              </p>
            </div>
          </div>

          <button onClick={handleExportData} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[9px] border-[1.5px] text-sm font-bold transition-all hover:brightness-95 disabled:opacity-50"
            style={{ borderColor: 'var(--color-border-base)', color: 'var(--color-text-base)', background: 'var(--color-bg-surface)' }}>
            <Download size={16} />
            {exporting ? 'Exportando...' : 'Exportar todos os meus dados'}
          </button>

          <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
            Conforme a LGPD (Art. 18), você tem direito a acessar, corrigir e exportar seus dados.{' '}
            <a href="/lgpd" className="underline" style={{ color: 'var(--color-green-600)' }}>Saiba mais sobre seus direitos</a>
          </p>
        </div>
      </div>

      {/* Security & Privacy link */}
      <Link to="/app/settings/security" className="card-surface p-4 flex items-center gap-3 hover:brightness-95 transition-all">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-green-100, #EDE9FE)' }}>
          <Shield size={18} style={{ color: 'var(--color-green-600)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-extrabold flex items-center gap-1.5" style={{ color: 'var(--color-text-base)' }}>
            Segurança e Privacidade <span>🛡️</span>
          </div>
          <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Seus dados, seus direitos</div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
      </Link>

      {/* Danger Zone */}
      <div className="card-surface p-6 border-destructive">
        <h2 className="text-[13px] font-extrabold text-destructive mb-4">Zona de Perigo</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
          A exclusão da conta é irreversível. Todos os seus dados serão excluídos em até 30 dias.
        </p>
        <button onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-[9px] border-[1.5px] border-destructive text-destructive text-xs font-bold hover:bg-fin-red-pale transition-all flex items-center gap-2">
          <Trash2 size={14} />
          Solicitar exclusão da conta
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay, rgba(0,0,0,0.5))' }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: 'var(--color-bg-surface)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-strong)' }}>Tem certeza?</h3>
            <p className="text-[14px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Esta ação é irreversível.</p>
            <p className="text-[14px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Todos os seus dados serão excluídos em até 30 dias.</p>
            <p className="text-[14px] mb-4" style={{ color: 'var(--color-text-muted)' }}>Você perderá acesso imediatamente.</p>
            <label className="text-[12px] font-bold block mb-2" style={{ color: 'var(--color-text-base)' }}>
              Digite <span className="text-destructive">EXCLUIR</span> para confirmar:
            </label>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-destructive bg-card text-sm mb-4 outline-none" placeholder="EXCLUIR" />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold border" style={{ borderColor: 'var(--color-border-base)', color: 'var(--color-text-base)' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'EXCLUIR'}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-destructive disabled:opacity-50">
                Excluir minha conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
