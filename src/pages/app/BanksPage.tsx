import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { suggestBankCategory } from '@/lib/bankCategorySuggester';
import { formatCurrency } from '@/lib/plans';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Building2, Wallet, ArrowLeftRight, RefreshCw, Plus, CheckCircle,
  AlertCircle, XCircle, Eye, EyeOff, Trash2, Check, X, Lock, Crown,
} from 'lucide-react';

declare global {
  interface Window {
    PluggyConnect: any;
  }
}

interface BankConnection {
  id: string;
  pluggy_item_id: string;
  institution_name: string;
  institution_logo: string | null;
  institution_color: string;
  account_type: string | null;
  account_number: string | null;
  account_name: string | null;
  balance: number;
  available_balance: number;
  status: string;
  last_sync_at: string | null;
  auto_import: boolean;
}

interface BankTxRaw {
  id: string;
  connection_id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string | null;
  merchant_name: string | null;
  imported: boolean;
  ignored: boolean;
}

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  BANK: { label: 'Conta Corrente', color: 'var(--color-info-solid)' },
  CREDIT: { label: 'Cartão de Crédito', color: 'var(--color-danger-solid)' },
  DIGITAL_BANK: { label: 'Banco Digital', color: '#7c3aed' },
  INVESTMENT: { label: 'Investimentos', color: 'var(--color-success-solid)' },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca sincronizado';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `${mins} min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

function syncColor(dateStr: string | null): string {
  if (!dateStr) return 'var(--color-text-disabled)';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3600000) return 'var(--color-success-solid)';
  if (diff < 86400000) return 'var(--color-warning-solid)';
  return 'var(--color-danger-solid)';
}

export default function BanksPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { canDo, plan } = usePlan();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [pendingTxs, setPendingTxs] = useState<BankTxRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedTxs, setSelectedTxs] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<Record<string, string>>({});
  const currency = 'R$';

  const isPro = plan === 'pro' || plan === 'business';

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [connRes, txRes] = await Promise.all([
      supabase.from('bank_connections').select('*').eq('user_id', user.id).neq('status', 'disconnected').order('created_at', { ascending: false }),
      supabase.from('bank_transactions_raw').select('*').eq('user_id', user.id).eq('imported', false).eq('ignored', false).order('date', { ascending: false }),
    ]);
    setConnections((connRes.data as any[]) || []);
    const txs = (txRes.data as any[]) || [];
    setPendingTxs(txs);
    
    // Auto-suggest categories
    const cats: Record<string, string> = {};
    txs.forEach(tx => {
      cats[tx.id] = suggestBankCategory(tx.description, tx.merchant_name);
    });
    setSuggestedCategories(cats);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBalance = connections.reduce((s, c) => s + Number(c.balance), 0);
  const activeCount = connections.filter(c => c.status === 'active').length;
  const pendingCount = pendingTxs.length;
  const lastSync = connections.reduce((latest, c) => {
    if (!c.last_sync_at) return latest;
    return !latest || new Date(c.last_sync_at) > new Date(latest) ? c.last_sync_at : latest;
  }, null as string | null);

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: { connectionId },
      });
      if (error) throw error;
      toast.success(`✓ ${data.totalSynced || 0} transações encontradas`);
      await fetchData();
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err.message || 'Tente novamente'));
    } finally {
      setSyncing(null);
    }
  };

  const handleConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-token', {
        body: { userId: user!.id },
      });
      if (error) throw error;

      // Load Pluggy Connect SDK
      const existing = document.querySelector('script[src*="pluggy-connect"]');
      const loadWidget = () => {
        const pluggyConnect = new window.PluggyConnect({
          connectToken: data.accessToken,
          onSuccess: async ({ item }: any) => {
            await supabase.from('bank_connections').insert({
              user_id: user!.id,
              pluggy_item_id: item.id,
              institution_name: item.connector?.name || 'Banco',
              institution_logo: item.connector?.imageUrl || null,
              institution_color: item.connector?.primaryColor || '#16a34a',
              account_type: item.connector?.type || 'BANK',
              status: 'syncing',
            } as any);
            toast.success('Banco conectado! Importando transações...');
            await fetchData();
            // Trigger first sync
            const { data: conns } = await supabase
              .from('bank_connections')
              .select('id')
              .eq('pluggy_item_id', item.id)
              .eq('user_id', user!.id)
              .single();
            if (conns) {
              await supabase.functions.invoke('pluggy-sync', {
                body: { connectionId: conns.id },
              });
              await fetchData();
            }
          },
          onError: (error: any) => {
            toast.error('Erro ao conectar: ' + (error?.message || 'Tente novamente'));
          },
        });
        pluggyConnect.init();
      };

      if (existing) {
        loadWidget();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js';
        script.async = true;
        script.onload = loadWidget;
        document.head.appendChild(script);
      }
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Desconectar este banco? Os lançamentos importados serão mantidos.')) return;
    await supabase.from('bank_connections').update({ status: 'disconnected' } as any).eq('id', connectionId);
    toast.success('Banco desconectado');
    await fetchData();
  };

  const handleImportTx = async (tx: BankTxRaw) => {
    const cat = suggestedCategories[tx.id] || 'Outros';
    await supabase.from('transactions').insert({
      user_id: user!.id,
      date: tx.date,
      description: tx.merchant_name || tx.description,
      amount: tx.amount,
      type: tx.type === 'CREDIT' ? 'income' : 'expense',
      category: cat,
      origin: 'personal',
      notes: `Importado do banco: ${tx.description}`,
    });
    await supabase.from('bank_transactions_raw').update({ imported: true, matched_transaction_id: null } as any).eq('id', tx.id);
    toast.success('✓ Lançamento importado');
    await fetchData();
  };

  const handleIgnoreTx = async (txId: string) => {
    await supabase.from('bank_transactions_raw').update({ ignored: true } as any).eq('id', txId);
    await fetchData();
  };

  const handleBulkImport = async () => {
    setImporting(true);
    const ids = selectedTxs.size > 0 ? Array.from(selectedTxs) : pendingTxs.map(t => t.id);
    const txsToImport = pendingTxs.filter(t => ids.includes(t.id));
    
    for (const tx of txsToImport) {
      const cat = suggestedCategories[tx.id] || 'Outros';
      await supabase.from('transactions').insert({
        user_id: user!.id,
        date: tx.date,
        description: tx.merchant_name || tx.description,
        amount: tx.amount,
        type: tx.type === 'CREDIT' ? 'income' : 'expense',
        category: cat,
        origin: 'personal',
        notes: `Importado do banco: ${tx.description}`,
      });
      await supabase.from('bank_transactions_raw').update({ imported: true } as any).eq('id', tx.id);
    }
    
    toast.success(`✓ ${txsToImport.length} transações importadas com sucesso!`);
    setSelectedTxs(new Set());
    setImporting(false);
    await fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelectedTxs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTxs.size === pendingTxs.length) {
      setSelectedTxs(new Set());
    } else {
      setSelectedTxs(new Set(pendingTxs.map(t => t.id)));
    }
  };

  // PRO GATE
  if (!isPro) {
    return (
      <div className="relative pb-28" style={{ minHeight: 400 }}>
        <div style={{ filter: 'blur(4px)', opacity: 0.3, pointerEvents: 'none' }}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="card-premium" style={{ padding: 18, height: 90 }}>
                  <div className="skeleton-shimmer" style={{ width: '60%', height: 12, borderRadius: 6 }} />
                  <div className="skeleton-shimmer mt-3" style={{ width: '80%', height: 24, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="text-center" style={{ maxWidth: 380, padding: 24 }}>
            <div className="mx-auto flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-green-50)', marginBottom: 20 }}>
              <Building2 style={{ width: 32, height: 32, color: 'var(--color-green-600)' }} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-strong)', marginBottom: 8 }}>
              🏦 Conecte seu banco ao FinDash Pro
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Importe transações automaticamente do Nubank, Itaú, Bradesco, Inter e +200 bancos.
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-subtle)', marginBottom: 16 }}>
              Disponível no plano Pro
            </p>
            <button onClick={() => navigate('/app/billing')}
              style={{ background: 'var(--color-green-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-lg)', padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Ver planos →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5 pb-28">
        {[1,2,3].map(i => (
          <div key={i} className="card-premium" style={{ padding: 20 }}>
            <div className="skeleton-shimmer" style={{ width: '40%', height: 14, borderRadius: 6 }} />
            <div className="skeleton-shimmer mt-3" style={{ width: '70%', height: 20, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Saldo Total', value: formatCurrency(totalBalance, currency), icon: Wallet, iconBg: 'var(--color-success-bg)', iconColor: 'var(--color-success-solid)' },
          { label: 'Contas Conectadas', value: String(activeCount), icon: Building2, iconBg: 'var(--color-info-bg, #dbeafe)', iconColor: 'var(--color-info-solid, #2563eb)' },
          { label: 'Pendentes', value: String(pendingCount), icon: ArrowLeftRight, iconBg: 'var(--color-warning-bg)', iconColor: 'var(--color-warning-solid)' },
          { label: 'Última Sincronização', value: timeAgo(lastSync), icon: RefreshCw, iconBg: 'var(--color-success-bg)', iconColor: syncColor(lastSync) },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card-premium" style={{ padding: 18 }}>
            <div className="flex items-center justify-between">
              <p className="label-upper" style={{ fontSize: 10 }}>{stat.label}</p>
              <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: stat.iconBg }}>
                <stat.icon style={{ width: 15, height: 15, color: stat.iconColor }} />
              </div>
            </div>
            <p className="metric-value" style={{ fontSize: 20, marginTop: 8, color: 'var(--color-text-strong)' }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* CONNECTED ACCOUNTS */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>Minhas Contas</h2>
          <button onClick={handleConnect}
            className="flex items-center gap-2 transition-colors"
            style={{ background: 'var(--color-green-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-lg)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus style={{ width: 14, height: 14 }} /> Conectar banco
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="text-center" style={{ padding: '40px 20px' }}>
            <div className="mx-auto" style={{ width: 80, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--color-bg-sunken)', border: '2px dashed var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Building2 style={{ width: 28, height: 28, color: 'var(--color-text-disabled)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 4 }}>Nenhuma conta conectada</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Conecte seu banco para importar transações automaticamente.</p>
            <button onClick={handleConnect}
              className="inline-flex items-center gap-2"
              style={{ background: 'var(--color-green-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-lg)', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus style={{ width: 14, height: 14 }} /> Conectar primeiro banco
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => {
              const connPending = pendingTxs.filter(t => t.connection_id === conn.id).length;
              const typeInfo = ACCOUNT_TYPE_LABELS[conn.account_type || ''] || { label: 'Conta', color: 'var(--color-text-muted)' };
              const isSyncing = syncing === conn.id || conn.status === 'syncing';
              return (
                <div key={conn.id} className="card-premium" style={{ padding: 18 }}>
                  <div className="flex items-start gap-3.5">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 40, height: 40, borderRadius: '50%', background: conn.institution_color || 'var(--color-green-600)' }}>
                      {conn.institution_logo ? (
                        <img src={conn.institution_logo} alt={conn.institution_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span className="text-white" style={{ fontSize: 14, fontWeight: 800 }}>{conn.institution_name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>{conn.institution_name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: typeInfo.color, background: typeInfo.color + '18', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                          {typeInfo.label}
                        </span>
                      </div>
                      {conn.account_number && (
                        <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>{conn.account_number}</p>
                      )}
                      <p style={{ fontSize: 11, color: syncColor(conn.last_sync_at), marginTop: 2 }}>
                        {conn.status === 'error' ? '❌ Erro na sincronização' : `Sincronizado ${timeAgo(conn.last_sync_at)}`}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="text-right flex-shrink-0">
                      <p style={{ fontSize: 20, fontWeight: 900, color: conn.balance >= 0 ? 'var(--color-success-solid)' : 'var(--color-danger-solid)' }}>
                        {formatCurrency(conn.balance, currency)}
                      </p>
                      {conn.account_type === 'CREDIT' && (
                        <p style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>Disponível: {formatCurrency(conn.available_balance, currency)}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-weak)' }}>
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: conn.status === 'active' ? 'var(--color-success-solid)' : conn.status === 'error' ? 'var(--color-danger-solid)' : 'var(--color-text-disabled)' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        {conn.status === 'active' ? 'Ativa' : conn.status === 'syncing' ? 'Sincronizando...' : conn.status === 'error' ? 'Erro' : 'Desconectada'}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => handleSync(conn.id)} disabled={isSyncing}
                        className="flex items-center gap-1.5 transition-colors"
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                        <RefreshCw style={{ width: 13, height: 13 }} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar
                      </button>
                      {connPending > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning-solid)', background: 'var(--color-warning-bg)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                          {connPending} pendentes
                        </span>
                      )}
                      <button onClick={() => handleDisconnect(conn.id)}
                        className="flex items-center gap-1 transition-colors"
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-danger-solid)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                        <XCircle style={{ width: 13, height: 13 }} /> Desconectar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TRANSACTION IMPORT */}
      {pendingTxs.length > 0 && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>Transações para Revisar</h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning-solid)', background: 'var(--color-warning-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                {pendingCount}
              </span>
            </div>
            <button onClick={handleBulkImport} disabled={importing}
              className="flex items-center gap-2 transition-colors"
              style={{ background: 'var(--color-green-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-lg)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: importing ? 0.7 : 1 }}>
              {importing ? 'Importando...' : `Importar todas (${selectedTxs.size > 0 ? selectedTxs.size : pendingCount})`}
            </button>
          </div>

          {/* Select all */}
          <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
            <button onClick={toggleSelectAll}
              className="flex items-center gap-2"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selectedTxs.size === pendingTxs.length ? 'var(--color-green-600)' : 'var(--color-border-strong)'}`, background: selectedTxs.size === pendingTxs.length ? 'var(--color-green-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedTxs.size === pendingTxs.length && <Check style={{ width: 10, height: 10, color: 'white' }} />}
              </div>
              Selecionar todas
            </button>
          </div>

          {/* Transaction list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {pendingTxs.map(tx => {
              const conn = connections.find(c => c.id === tx.connection_id);
              const selected = selectedTxs.has(tx.id);
              return (
                <div key={tx.id}
                  className="flex items-center gap-3 transition-colors"
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', background: selected ? 'var(--color-green-50)' : 'var(--color-bg-sunken)', border: `1px solid ${selected ? 'var(--color-green-200)' : 'var(--color-border-weak)'}` }}>
                  
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(tx.id)} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? 'var(--color-green-600)' : 'var(--color-border-strong)'}`, background: selected ? 'var(--color-green-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <Check style={{ width: 10, height: 10, color: 'white' }} />}
                    </div>
                  </button>

                  {/* Date */}
                  <span className="flex-shrink-0 hidden md:block" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', width: 70 }}>
                    {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-strong)' }}>
                      {tx.merchant_name || tx.description}
                    </p>
                    {tx.merchant_name && (
                      <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{tx.description}</p>
                    )}
                    <span className="md:hidden" style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Bank */}
                  {conn && (
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: conn.institution_color || 'var(--color-green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: 'white' }}>{conn.institution_name[0]}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{conn.institution_name}</span>
                    </div>
                  )}

                  {/* Amount */}
                  <span className="flex-shrink-0" style={{ fontSize: 14, fontWeight: 800, color: tx.type === 'CREDIT' ? 'var(--color-success-solid)' : 'var(--color-danger-solid)' }}>
                    {tx.type === 'DEBIT' ? '- ' : ''}{formatCurrency(tx.amount, currency)}
                  </span>

                  {/* Category */}
                  <span className="hidden lg:block flex-shrink-0" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg-surface)', padding: '3px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border-weak)' }}>
                    {suggestedCategories[tx.id] || 'Outros'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleImportTx(tx)} title="Importar"
                      style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-green-600)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check style={{ width: 14, height: 14 }} />
                    </button>
                    <button onClick={() => handleIgnoreTx(tx.id)} title="Ignorar"
                      style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)', color: 'var(--color-text-subtle)', border: '1px solid var(--color-border-base)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
