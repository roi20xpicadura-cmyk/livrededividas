import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

    const [profileRes, configRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_config').select('*').eq('user_id', user.id).single(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
      previousPlanRef.current = (profileRes.data as Profile).plan;
    }
    if (configRes.data) setConfig(configRes.data as unknown as UserConfig);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Realtime listener for plan changes (Hotmart webhook → instant unlock)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`profile-${user.id}`);
    channel
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload: any) => {
          const newProfile = payload.new as Profile;
          const oldPlan = previousPlanRef.current;
          const newPlan = newProfile.plan;
          setProfile(newProfile);
          if (newPlan !== oldPlan && newPlan !== 'free' && oldPlan === 'free') {
            const planName = newPlan === 'pro' ? 'Pro' : newPlan === 'business' ? 'Business' : newPlan;
            toast.success(`🎉 Bem-vindo ao plano ${planName}!`, {
              description: 'Todos os benefícios já estão liberados para você!',
              duration: 6000,
            });
          }
          previousPlanRef.current = newPlan;
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (data) setProfile(data as Profile);
  };

  const updateConfig = async (updates: Partial<UserConfig>) => {
    if (!user) return;
    const { data } = await supabase.from('user_config').update(updates as any).eq('user_id', user.id).select().single();
    if (data) setConfig(data as unknown as UserConfig);
  };

  return { profile, config, loading, updateProfile, updateConfig, refetch: fetchProfile };
}
