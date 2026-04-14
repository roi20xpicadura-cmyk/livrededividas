import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Parallel fetch — both queries at the same time
    const [profileRes, configRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_config').select('*').eq('user_id', user.id).single(),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (configRes.data) setConfig(configRes.data as unknown as UserConfig);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

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
