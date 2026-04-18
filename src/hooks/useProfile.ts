import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// NOTE: Realtime listener removido por motivo de segurança — a tabela `profiles`
// não está mais publicada no canal Realtime (qualquer usuário autenticado podia
// escutar mudanças de outros usuários). Substituído por polling leve (30s) para
// detectar ativação de plano via webhook Hotmart.

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: string;
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  marketing_emails: boolean;
}

interface UserConfig {
  currency: string;
  project_name: string;
  default_save_pct: number;
  theme: string;
  notifications_enabled: boolean;
  onboarding_completed: boolean;
  profile_type: string;
  financial_objectives: string[];
  onboarding_step: number;
  streak_days: number;
  xp_points: number;
  level: string;
  financial_score: number | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const previousPlanRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // maybeSingle() em vez de single() — não dá erro se a linha ainda não
    // existe (race com trigger handle_new_user em signups novos). Em vez de
    // crashar, a gente faz 1 retry curto e segue como "loading concluído".
    const fetchOnce = async () => Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_config').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    let [profileRes, configRes] = await fetchOnce().catch(() => [
      { data: null, error: null }, { data: null, error: null },
    ] as any);

    // Se o profile ainda não foi criado pelo trigger, espera 600ms e tenta de novo.
    if (!profileRes?.data && user) {
      await new Promise(r => setTimeout(r, 600));
      try {
        [profileRes, configRes] = await fetchOnce();
      } catch { /* segue mesmo sem dados */ }
    }

    if (profileRes?.data) {
      setProfile(profileRes.data as Profile);
      previousPlanRef.current = (profileRes.data as Profile).plan;
    }
    if (configRes?.data) setConfig(configRes.data as unknown as UserConfig);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Polling para detectar ativação de plano (substitui o Realtime que foi
  // removido por segurança). Roda a cada 30s só enquanto o plano for 'free'.
  useEffect(() => {
    if (!user) return;
    if (profile && profile.plan !== 'free') return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!data) return;
      const newProfile = data as Profile;
      const oldPlan = previousPlanRef.current;
      const newPlan = newProfile.plan;

      if (newPlan !== oldPlan) {
        setProfile(newProfile);
        if (newPlan !== 'free' && oldPlan === 'free') {
          const planName = newPlan === 'pro' ? 'Pro' : newPlan === 'business' ? 'Business' : newPlan;
          toast.success(`🎉 Bem-vindo ao plano ${planName}!`, {
            description: 'Todos os benefícios já estão liberados para você!',
            duration: 6000,
          });
        }
        previousPlanRef.current = newPlan;
      }
    }, 30_000);

    return () => clearInterval(interval);
    // Only depends on user and current plan — tracking whole `profile` would
    // reset the polling interval on every profile field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.plan]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (data) setProfile(data as Profile);
  };

  const updateConfig = async (updates: Partial<UserConfig>) => {
    if (!user) return;
    const { data } = await supabase.from('user_config').update(updates).eq('user_id', user.id).select().single();
    if (data) setConfig(data as unknown as UserConfig);
  };

  return { profile, config, loading, updateProfile, updateConfig, refetch: fetchProfile };
}
