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
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data as Profile);

    const { data: cfg } = await supabase.from('user_config').select('*').eq('user_id', user.id).single();
    if (cfg) setConfig(cfg as unknown as UserConfig);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    await supabase.from('profiles').update(updates).eq('id', user.id);
    await fetchProfile();
  };

  const updateConfig = async (updates: Partial<UserConfig>) => {
    if (!user) return;
    await supabase.from('user_config').update(updates as any).eq('user_id', user.id);
    await fetchProfile();
  };

  return { profile, config, loading, updateProfile, updateConfig, refetch: fetchProfile };
}
