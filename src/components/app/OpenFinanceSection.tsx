import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import {
  Building2, RefreshCw, Trash2, Shield, Landmark, Wifi, WifiOff,
  ChevronRight, Plus, ExternalLink, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';

const BANK_LOGOS: Record<string, string> = {
  'Banco do Brasil': '🏦',
  'Itaú': '🟠',
  'Bradesco': '🔴',
  'Santander': '🔴',
  'Nubank': '💜',
  'Inter': '🟧',
  'C6 Bank': '⬛',
  'BTG Pactual': '🏦',
  'Caixa': '🔵',
  'Sicoob': '🟢',
  'Sicredi': '🟢',
};

function getBankEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(BANK_LOGOS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🏦';
}

export default function OpenFinanceSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { loading, getConnectToken, syncConnection, saveConnection } = usePluggyConnect({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
    },
  });

  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: ['bank-connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['bank-pending-import', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('bank_transactions_raw')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('imported', false)
        .eq('ignored', false);
      return count || 0;
    },
    enabled: !!user,
  });

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    haptic.medium();
    try {
      const result = await getConnectToken();
      if (!result) { setConnecting(false); return; }

      const { accessToken, apiKey } = result;

      // Load Pluggy Connect Widget script
      if (!document.getElementById('pluggy-connect-script')) {
        const script = document.createElement('script');
        script.id = 'pluggy-connect-script';
        script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.6.1/pluggy-connect.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Falha ao carregar Pluggy Connect'));
          setTimeout(resolve, 5000);
        });
      }

      // Wait for PluggyConnect to be available
      const PluggyConnect = (window as any).PluggyConnect;
      if (!PluggyConnect) {
        throw new Error('Pluggy Connect não disponível');
      }

      const pluggyConnect = new PluggyConnect({
        connectToken: accessToken,
        includeSandbox: false,
        onSuccess: async (data: { item: { id: string; connector?: { name: string } } }) => {
          try {
            const itemId = data.item.id;
            const institutionName = data.item.connector?.name || 'Banco';
            const connId = await saveConnection(itemId, institutionName, apiKey);

            if (connId) {
              haptic.success();
              toast.success(`${institutionName} conectado via Open Finance! 🎉`);
              queryClient.invalidateQueries({ queryKey: ['bank-connections'] });

              // Trigger initial sync
              await syncConnection(connId);
              queryClient.invalidateQueries({ queryKey: ['bank-pending-import'] });
            }
          } catch (err: any) {
            toast.error('Erro ao salvar conexão: ' + (err.message || 'tente novamente'));
          }
          setConnecting(false);
        },
        onError: (error: any) => {
          console.error('Pluggy Connect error:', error);
          toast.error('Erro na conexão: ' + (error?.message || 'tente novamente'));
          setConnecting(false);
        },
        onClose: () => {
          setConnecting(false);
        },
      });

      pluggyConnect.init();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao iniciar Open Finance');
      setConnecting(false);
    }
  }, [getConnectToken, saveConnection, syncConnection, queryClient]);

  const handleSync = useCallback(async (connId: string) => {
    setSyncingId(connId);
    haptic.medium();
    try {
      const result = await syncConnection(connId);
      if (result?.synced) {
        toast.success(`${result.totalSynced} transações sincronizadas!`);
        queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
        queryClient.invalidateQueries({ queryKey: ['bank-pending-import'] });
      }
    } finally {
      setSyncingId(null);
    }
  }, [syncConnection, queryClient]);

  const handleDisconnect = useCallback(async (connId: string, name: string) => {
    if (!confirm(`Desconectar ${name}? As transações já importadas serão mantidas.`)) return;
    haptic.medium();
    await supabase.from('bank_connections').update({ status: 'disconnected' }).eq('id', connId);
    toast.success(`${name} desconectado.`);
    queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
  }, [queryClient]);

  const activeConnections = connections.filter((c: any) => c.status !== 'disconnected');

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #16a34a, #14532d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Landmark style={{ width: 18, height: 18, color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.3px' }}>
              Open Finance
            </h3>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Conecte seus bancos automaticamente
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 4 }}>
          <Shield style={{ width: 12, height: 12, color: 'var(--color-green-600)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-green-700)' }}>
            Regulado pelo BCB
          </span>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
        border: '1px solid var(--color-green-200)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 16,
      }}>
        <div className="flex items-start" style={{ gap: 10 }}>
          <Shield style={{ width: 16, height: 16, color: 'var(--color-green-600)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-800)', marginBottom: 3 }}>
              Seguro e regulamentado
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-green-700)', lineHeight: 1.5 }}>
              Open Finance é regulado pelo Banco Central do Brasil. Seus dados são criptografados
              e você pode revogar o acesso a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* Connected banks */}
      {activeConnections.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-strong)', marginBottom: 10 }}>
            Bancos conectados
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {activeConnections.map((conn: any) => (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-green-200)',
                    borderRadius: 14, padding: '14px 16px',
                  }}
                >
                  <div className="flex items-center" style={{ gap: 12 }}>
                    {/* Bank icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: conn.institution_color ? `${conn.institution_color}15` : 'var(--color-bg-sunken)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {conn.institution_logo ? (
                        <img src={conn.institution_logo} alt={conn.institution_name} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>{getBankEmoji(conn.institution_name)}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>
                        {conn.institution_name}
                      </p>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        {conn.status === 'active' ? (
                          <div className="flex items-center" style={{ gap: 3 }}>
                            <Wifi style={{ width: 10, height: 10, color: 'var(--color-green-600)' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-green-700)' }}>Ativo</span>
                          </div>
                        ) : conn.status === 'syncing' ? (
                          <div className="flex items-center" style={{ gap: 3 }}>
                            <Loader2 style={{ width: 10, height: 10, color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>Sincronizando...</span>
                          </div>
                        ) : (
                          <div className="flex items-center" style={{ gap: 3 }}>
                            <WifiOff style={{ width: 10, height: 10, color: 'var(--color-danger-solid)' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-danger-solid)' }}>Erro</span>
                          </div>
                        )}
                        {conn.last_sync_at && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
                            Sync: {new Date(conn.last_sync_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      {conn.balance != null && (
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)', marginTop: 4 }}>
                          R$ {conn.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex" style={{ gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id}
                        style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <RefreshCw style={{
                          width: 14, height: 14, color: 'var(--color-text-muted)',
                          animation: syncingId === conn.id ? 'spin 1s linear infinite' : 'none',
                        }} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.id, conn.institution_name)}
                        style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 style={{ width: 14, height: 14, color: 'var(--color-danger-solid)' }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Pending import banner */}
      {pendingCount > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
        }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#d97706' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                {pendingCount} transações aguardando importação
              </p>
              <p style={{ fontSize: 11, color: '#b45309' }}>
                Vá em Lançamentos para revisar e importar
              </p>
            </div>
            <ChevronRight style={{ width: 14, height: 14, color: '#d97706' }} />
          </div>
        </div>
      )}

      {/* Connect button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleConnect}
        disabled={connecting || loading}
        style={{
          width: '100%', height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #16a34a, #14532d)',
          color: 'white', fontSize: 14, fontWeight: 800,
          border: 'none', cursor: connecting ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: connecting ? 0.7 : 1,
          boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
        }}
      >
        {connecting ? (
          <>
            <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
            Conectando...
          </>
        ) : (
          <>
            <Plus style={{ width: 18, height: 18 }} />
            {activeConnections.length > 0 ? 'Adicionar outro banco' : 'Conectar banco via Open Finance'}
          </>
        )}
      </motion.button>

      {/* Supported banks footer */}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
          Suporta: Itaú, Bradesco, Nubank, Santander, BB, Inter, C6, BTG e 300+ instituições
        </p>
      </div>
    </div>
  );
}
