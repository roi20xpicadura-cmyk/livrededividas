import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PluggyConnectOptions {
  onSuccess?: (itemId?: string) => void;
  onError?: (error: string) => void;
}

export function usePluggyConnect({ onSuccess: _onSuccess, onError }: PluggyConnectOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);

  const getConnectToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('pluggy-token', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message || 'Erro ao obter token');
      if (!data?.accessToken) throw new Error('Token não recebido');

      setConnectToken(data.accessToken);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com Open Finance';
      toast.error(msg);
      onError?.(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const syncConnection = useCallback(async (connectionId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        headers: { Authorization: `Bearer ${token}` },
        body: { connectionId },
      });

      if (error) throw new Error(error.message || 'Erro na sincronização');
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      toast.error(msg);
      return null;
    }
  }, []);

  const saveConnection = useCallback(async (itemId: string, institutionName: string, apiKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Fetch item details from Pluggy
      const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      });

      let institutionLogo = '';
      let institutionColor = '#7C3AED';
      let accountType = 'BANK';

      if (itemRes.ok) {
        const itemData = await itemRes.json();
        institutionName = itemData.connector?.name || institutionName;
        institutionLogo = itemData.connector?.imageUrl || '';
        institutionColor = itemData.connector?.primaryColor || '#7C3AED';
        accountType = itemData.connector?.type === 'PERSONAL_BANK' ? 'BANK' : itemData.connector?.type || 'BANK';
      }

      // Check if connection already exists
      const { data: existing } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('pluggy_item_id', itemId)
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase
          .from('bank_connections')
          .update({
            status: 'active',
            institution_name: institutionName,
            institution_logo: institutionLogo,
            institution_color: institutionColor,
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        return existing.id;
      }

      // Create new
      const { data: newConn, error } = await supabase
        .from('bank_connections')
        .insert({
          user_id: user.id,
          pluggy_item_id: itemId,
          institution_name: institutionName,
          institution_logo: institutionLogo,
          institution_color: institutionColor,
          account_type: accountType,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      return newConn?.id;
    } catch (err) {
      console.error('saveConnection error:', err);
      throw err;
    }
  }, []);

  return {
    loading,
    connectToken,
    getConnectToken,
    syncConnection,
    saveConnection,
  };
}
