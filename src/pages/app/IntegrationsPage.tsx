import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, Copy, Check, CheckCircle2, Clock, Plug, Plus,
  ChevronRight, RefreshCw, ArrowLeft, FileUp, AlertCircle, Bell, Zap,
  ExternalLink, MessageSquarePlus,
} from 'lucide-react';
import { INTEGRATIONS, CATEGORY_LABELS, type IntegrationDef, type IntegrationCategory } from '@/lib/integrations-data';
import { parseOFX, parseCSV, type ParsedTransaction } from '@/lib/ofxParser';
import { haptic } from '@/lib/haptics';

// ─── Logo with fallback ───
function IntegrationLogo({ name, logoUrl, color, size = 36 }: { name: string; logoUrl: string; color: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !logoUrl) {
    return (
      <div className="flex items-center justify-center" style={{
        width: size, height: size, borderRadius: 8,
        background: color + '20', border: `1px solid ${color}40`,
        fontSize: size * 0.45, fontWeight: 900, color,
      }}>
        {name[0]}
      </div>
    );
  }
  return <img src={logoUrl} alt={name} width={size} height={size} style={{ objectFit: 'contain', borderRadius: 6 }} onError={() => setErr(true)} />;
}

// ─── Status badge ───
function StatusBadge({ status, plan, userPlan }: { status: string; plan?: string; userPlan: string }) {
  if (plan === 'pro' && userPlan === 'free') {
    return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: '#f3e8ff', color: '#7c3aed' }}>PRO</span>;
  }
  if (status === 'coming_soon') {
    return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>Em breve</span>;
  }
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)' }}>Disponível</span>;
}

const CATEGORIES: { key: 'all' | IntegrationCategory; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'bancos', label: 'Bancos' },
  { key: 'ecommerce', label: 'E-commerce' },
  { key: 'pagamentos', label: 'Pagamentos' },
  { key: 'infoprodutos', label: 'Infoprodutos' },
  { key: 'contabilidade', label: 'Contabilidade' },
  { key: 'outros', label: 'Outros' },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const userPlan = profile?.plan || 'free';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | IntegrationCategory>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDef | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  // Fetch user's active integrations
  const { data: userIntegrations = [] } = useQuery({
    queryKey: ['integrations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('integrations').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const connectedPlatforms = new Set(userIntegrations.map((i: any) => i.platform));
  const lastSync = userIntegrations.reduce((latest: string | null, i: any) => {
    if (!i.last_sync_at) return latest;
    return !latest || i.last_sync_at > latest ? i.last_sync_at : latest;
  }, null);

  const filtered = INTEGRATIONS.filter(i => {
    if (category !== 'all' && i.category !== category) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedList = userIntegrations.filter((i: any) => i.status === 'active');

  return (
    <div className="scroll-container hide-scrollbar" style={{ padding: isMobile ? '16px' : '28px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: 'var(--color-text-strong)', letterSpacing: '-0.5px' }}>Integrações</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Conecte suas plataformas e importe dados automaticamente</p>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
        {[
          { label: 'Conectadas', value: connectedList.length, icon: CheckCircle2, color: 'var(--color-green-600)' },
          { label: 'Disponíveis', value: INTEGRATIONS.length, icon: Plug, color: 'var(--color-text-muted)' },
          { label: 'Última sync', value: lastSync ? timeAgo(lastSync) : '—', icon: Clock, color: 'var(--color-text-subtle)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)', borderRadius: 'var(--radius-xl)', padding: isMobile ? '12px' : '16px' }}>
            <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
              <s.icon style={{ width: 14, height: 14, color: s.color }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{s.label}</span>
            </div>
            <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: 'var(--color-text-strong)' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Connected integrations strip */}
      {connectedList.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }}>Minhas Conexões</span>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'var(--color-green-50)', color: 'var(--color-green-700)' }}>{connectedList.length}</span>
          </div>
          <div className="flex hide-scrollbar" style={{ gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {connectedList.map((conn: any) => {
              const def = INTEGRATIONS.find(i => i.id === conn.platform);
              return (
                <div key={conn.id} className="flex-shrink-0" style={{ width: 220, background: 'var(--color-bg-surface)', border: '1px solid var(--color-green-200)', borderRadius: 'var(--radius-xl)', padding: 14 }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                    <IntegrationLogo name={conn.platform_display_name} logoUrl={def?.logo || ''} color={def?.color || '#16a34a'} size={28} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)' }}>{conn.platform_display_name}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{conn.total_imported || 0} transações importadas</p>
                  {conn.last_sync_at && <p style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>Última sync: {timeAgo(conn.last_sync_at)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
        <div className="flex-1 min-w-0" style={{ position: 'relative', maxWidth: isMobile ? '100%' : 280 }}>
          <Search style={{ width: 16, height: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar integração..."
            style={{
              width: '100%', height: 40, paddingLeft: 36, paddingRight: 12,
              background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)',
              borderRadius: 'var(--radius-xl)', fontSize: 13, color: 'var(--color-text-base)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex hide-scrollbar" style={{ gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            style={{
              flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              border: '1px solid', cursor: 'pointer', transition: 'all 150ms',
              ...(category === c.key
                ? { background: 'var(--color-green-600)', color: 'white', borderColor: 'var(--color-green-600)' }
                : { background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border-weak)' }),
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? 10 : 14 }}>
        {filtered.map((integ, idx) => {
          const isConnected = connectedPlatforms.has(integ.id);
          const needsPro = integ.plan === 'pro' && userPlan === 'free';
          const isComingSoon = integ.status === 'coming_soon';

          return (
            <motion.div
              key={integ.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="group"
              style={{
                background: 'var(--color-bg-surface)',
                border: isConnected ? '1.5px solid var(--color-green-300)' : '1px solid var(--color-border-weak)',
                borderRadius: 16, padding: isMobile ? 14 : 20,
                transition: 'all 200ms', cursor: isComingSoon ? 'default' : 'pointer',
              }}
              onMouseEnter={e => { if (!isComingSoon) { e.currentTarget.style.borderColor = 'var(--color-green-300)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isConnected ? 'var(--color-green-300)' : 'var(--color-border-weak)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Row 1: Logo + Status */}
              <div className="flex items-start justify-between" style={{ marginBottom: 10 }}>
                <div style={{
                  width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
                  borderRadius: 12, background: 'white',
                  border: '1px solid var(--color-border-weak)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0,
                }}>
                  <IntegrationLogo name={integ.name} logoUrl={integ.logo} color={integ.color} size={isMobile ? 28 : 36} />
                </div>
                {isConnected
                  ? <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'var(--color-green-50)', color: 'var(--color-green-700)' }}>● Conectado</span>
                  : <StatusBadge status={integ.status} plan={integ.plan} userPlan={userPlan} />
                }
              </div>

              {/* Row 2: Name + Category */}
              <p style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: 'var(--color-text-strong)', marginBottom: 2 }}>{integ.name}</p>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--color-bg-sunken)', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                {CATEGORY_LABELS[integ.category]}
              </span>

              {/* Row 3: Description */}
              {!isMobile && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {integ.description}
                </p>
              )}

              {/* Row 4: Import tags */}
              <div className="flex flex-wrap" style={{ gap: 4, marginTop: 8 }}>
                {integ.imports.slice(0, isMobile ? 2 : 4).map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)', color: 'var(--color-text-muted)' }}>{tag}</span>
                ))}
                {isMobile && integ.imports.length > 2 && (
                  <span style={{ fontSize: 10, padding: '2px 6px', color: 'var(--color-text-subtle)' }}>+{integ.imports.length - 2}</span>
                )}
              </div>

              {/* Row 5: Action */}
              <div style={{ marginTop: 12 }}>
                {isConnected ? (
                  <div className="flex" style={{ gap: 6 }}>
                    <button style={{ flex: 1, height: 34, borderRadius: 'var(--radius-lg)', fontSize: 12, fontWeight: 700, background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-weak)', cursor: 'pointer' }}>
                      <RefreshCw style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Sync
                    </button>
                  </div>
                ) : isComingSoon ? (
                  <button style={{ width: '100%', height: 36, borderRadius: 'var(--radius-lg)', fontSize: 12, fontWeight: 700, background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-weak)', cursor: 'pointer' }}
                    onClick={() => { haptic.light(); toast.success('Você será notificado quando estiver disponível! 🔔'); }}>
                    <Bell style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Notifique-me
                  </button>
                ) : needsPro ? (
                  <button style={{ width: '100%', height: 36, borderRadius: 'var(--radius-lg)', fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer' }}
                    onClick={() => window.location.href = '/app/billing'}>
                    Upgrade para conectar
                  </button>
                ) : (
                  <button style={{ width: '100%', height: 36, borderRadius: 'var(--radius-lg)', fontSize: 12, fontWeight: 700, background: 'var(--color-green-600)', color: 'white', border: 'none', cursor: 'pointer' }}
                    onClick={() => { haptic.medium(); setSelectedIntegration(integ); }}>
                    Conectar
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Suggest card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: filtered.length * 0.03 }}
          onClick={() => setShowSuggest(true)}
          style={{
            background: 'var(--color-bg-surface)',
            border: '2px dashed var(--color-border-base)',
            borderRadius: 16, padding: isMobile ? 14 : 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', minHeight: 180, textAlign: 'center',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-green-400)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-base)'; }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Plus style={{ width: 24, height: 24, color: 'var(--color-text-subtle)' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)' }}>Sugerir integração</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Não encontrou? Nos diga!</p>
        </motion.div>
      </div>

      {/* Connection flow modal */}
      <AnimatePresence>
        {selectedIntegration && (
          <ConnectionFlow
            integration={selectedIntegration}
            onClose={() => setSelectedIntegration(null)}
            userId={user?.id || ''}
            onConnected={() => queryClient.invalidateQueries({ queryKey: ['integrations'] })}
          />
        )}
      </AnimatePresence>

      {/* Suggest modal */}
      <AnimatePresence>
        {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} userId={user?.id || ''} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Connection Flow ───
function ConnectionFlow({ integration, onClose, userId, onConnected }: {
  integration: IntegrationDef; onClose: () => void; userId: string; onConnected: () => void;
}) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const isOFX = integration.method === 'ofx_import';
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-${integration.id}/${userId}`;

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const txs = ext === 'ofx' || ext === 'qif' ? parseOFX(text) : parseCSV(text);
    if (txs.length === 0) { toast.error('Nenhuma transação encontrada no arquivo.'); return; }
    setParsed(txs);
    setStep(3);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!userId || parsed.length === 0) return;
    setImporting(true);
    try {
      // Check for duplicates by source_id
      const sourceIds = parsed.filter(t => t.source_id).map(t => t.source_id);
      let existingIds = new Set<string>();
      if (sourceIds.length > 0) {
        const { data: existing } = await supabase.from('transactions').select('notes').eq('user_id', userId).in('notes', sourceIds.map(id => `src:${id}`));
        existingIds = new Set((existing || []).map((e: any) => e.notes?.replace('src:', '')));
      }
      const newTxs = parsed.filter(t => !t.source_id || !existingIds.has(t.source_id));
      if (newTxs.length === 0) { toast.info('Todas as transações já foram importadas anteriormente.'); setImporting(false); return; }

      const rows = newTxs.map(t => ({
        user_id: userId, type: t.type, description: t.description,
        amount: t.amount, date: t.date, category: t.category, origin: 'personal' as const,
        notes: t.source_id ? `src:${t.source_id}` : null,
      }));
      const { error } = await supabase.from('transactions').insert(rows);
      if (error) throw error;

      // Upsert integration record
      await supabase.from('integrations').upsert({
        user_id: userId, platform: integration.id,
        platform_display_name: integration.name,
        method: 'ofx_import', status: 'active' as any,
        last_sync_at: new Date().toISOString(),
        total_imported: newTxs.length,
      }, { onConflict: 'user_id,platform' }).select();
      // Fallback: insert if upsert didn't match
      await supabase.from('integrations').insert({
        user_id: userId, platform: integration.id,
        platform_display_name: integration.name,
        method: 'ofx_import', status: 'active' as any,
        last_sync_at: new Date().toISOString(),
        total_imported: newTxs.length,
      }).select();

      haptic.success();
      toast.success(`${newTxs.length} transações importadas com sucesso! 🎉`);
      onConnected();
      setStep(4);
    } catch (err: any) {
      toast.error('Erro ao importar: ' + (err.message || 'tente novamente'));
    } finally {
      setImporting(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    haptic.light();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="w-full md:max-w-lg"
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle (mobile) */}
        {isMobile && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}><div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--color-border-base)' }} /></div>}

        {/* Header */}
        <div className="flex items-center" style={{ padding: '16px 20px', gap: 12, borderBottom: '1px solid var(--color-border-weak)' }}>
          {step > 1 && step < 4 && (
            <button onClick={() => setStep(s => s - 1)} style={{ color: 'var(--color-text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </button>
          )}
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', border: '1px solid var(--color-border-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
            <IntegrationLogo name={integration.name} logoUrl={integration.logo} color={integration.color} size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)' }}>
              {isOFX ? `Importar extrato do ${integration.name}` : `Conectar ${integration.name}`}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>Passo {step} de {isOFX ? 4 : 4}</p>
          </div>
          <button onClick={onClose} style={{ fontSize: 20, color: 'var(--color-text-subtle)', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {isOFX ? (
            <>
              {step === 1 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 16 }}>Como exportar do {integration.name}:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(integration.instructions || ['Acesse o app ou internet banking', 'Vá em "Extrato"', 'Exporte em formato OFX ou CSV', 'Faça upload abaixo']).map((inst, i) => (
                      <div key={i} className="flex items-start" style={{ gap: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-green-50)', color: 'var(--color-green-700)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                        <p style={{ fontSize: 13, color: 'var(--color-text-base)', lineHeight: 1.6 }}>{inst}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: '100%', height: 44, marginTop: 20, borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Próximo: Upload do arquivo
                  </button>
                </div>
              )}
              {step === 2 && (
                <div>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--color-green-500)' : 'var(--color-border-base)'}`,
                      borderRadius: 16, padding: 32, textAlign: 'center',
                      background: dragOver ? 'var(--color-green-50)' : 'var(--color-bg-sunken)',
                      cursor: 'pointer', transition: 'all 200ms',
                    }}
                  >
                    <Upload style={{ width: 32, height: 32, color: 'var(--color-text-subtle)', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-base)' }}>Arraste o arquivo OFX ou CSV aqui</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>ou clique para selecionar</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 8 }}>Formatos: .ofx, .csv, .qif — Máximo 10MB</p>
                    <input ref={fileRef} type="file" accept=".ofx,.csv,.qif,.xlsx" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div>
                  <div className="flex items-center" style={{ gap: 8, padding: 14, background: 'var(--color-green-50)', borderRadius: 'var(--radius-xl)', marginBottom: 16, border: '1px solid var(--color-green-200)' }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--color-green-600)' }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green-800)' }}>Arquivo lido com sucesso!</p>
                      <p style={{ fontSize: 11, color: 'var(--color-green-700)' }}>{parsed.length} transações encontradas</p>
                    </div>
                  </div>

                  {/* Preview table */}
                  <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Data</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Descrição</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.slice(0, 5).map((tx, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-border-weak)' }}>
                            <td style={{ padding: '6px 8px', color: 'var(--color-text-base)' }}>{tx.date}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--color-text-base)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: tx.type === 'income' ? 'var(--color-green-600)' : 'var(--color-danger-solid)' }}>
                              {tx.type === 'income' ? '+' : '-'}R$ {tx.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsed.length > 5 && <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', textAlign: 'center', marginTop: 6 }}>e mais {parsed.length - 5} transações...</p>}
                  </div>

                  <button onClick={handleImport} disabled={importing}
                    style={{ width: '100%', height: 44, borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.7 : 1 }}>
                    {importing ? 'Importando...' : `Importar ${parsed.length} transações`}
                  </button>
                </div>
              )}
              {step === 4 && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-green-50)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 style={{ width: 32, height: 32, color: 'var(--color-green-600)' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-strong)', marginBottom: 6 }}>Transações importadas!</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Seu painel já foi atualizado.</p>
                  <button onClick={() => { onClose(); window.location.href = '/app'; }}
                    style={{ marginTop: 20, height: 44, padding: '0 32px', borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Ver no painel
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Webhook flow */
            <>
              {step === 1 && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-base)', lineHeight: 1.7, marginBottom: 16 }}>
                    Vamos gerar uma URL de webhook. Você cola essa URL nas configurações da {integration.name} e as vendas chegam automaticamente no FinDash Pro.
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 12, padding: 20, background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-xl)', marginBottom: 16 }}>
                    <IntegrationLogo name={integration.name} logoUrl={integration.logo} color={integration.color} size={32} />
                    <ChevronRight style={{ width: 16, height: 16, color: 'var(--color-text-subtle)' }} />
                    <Zap style={{ width: 24, height: 24, color: 'var(--color-green-600)' }} />
                    <ChevronRight style={{ width: 16, height: 16, color: 'var(--color-text-subtle)' }} />
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>FD</span>
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: '100%', height: 44, borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Gerar minha URL de webhook
                  </button>
                </div>
              )}
              {step === 2 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 8 }}>Sua URL de webhook:</p>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 20 }}>
                    <input readOnly value={webhookUrl} style={{
                      flex: 1, height: 40, padding: '0 12px', fontSize: 11, borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-weak)',
                      color: 'var(--color-text-base)', fontFamily: 'var(--font-mono)',
                    }} />
                    <button onClick={copyWebhook} style={{
                      height: 40, width: 40, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-weak)',
                      background: copied ? 'var(--color-green-50)' : 'var(--color-bg-surface)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {copied ? <Check style={{ width: 16, height: 16, color: 'var(--color-green-600)' }} /> : <Copy style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />}
                    </button>
                  </div>
                  <button onClick={() => setStep(3)} style={{ width: '100%', height: 44, borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Próximo: Configurar na {integration.name}
                  </button>
                </div>
              )}
              {step === 3 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-strong)', marginBottom: 12 }}>Configure na {integration.name}:</p>
                  {getWebhookInstructions(integration.id).map((inst, i) => (
                    <div key={i} className="flex items-start" style={{ gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-green-50)', color: 'var(--color-green-700)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-base)', lineHeight: 1.6 }}>{inst}</p>
                    </div>
                  ))}
                  <button onClick={async () => {
                    // Save integration record
                    await supabase.from('integrations').insert({
                      user_id: userId, platform: integration.id,
                      platform_display_name: integration.name,
                      method: 'webhook', status: 'pending' as any,
                      webhook_url: webhookUrl,
                    });
                    haptic.success();
                    toast.success('Integração configurada! Aguardando primeira sincronização.');
                    onConnected();
                    setStep(4);
                  }} style={{ width: '100%', height: 44, marginTop: 16, borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Marcar como configurado
                  </button>
                </div>
              )}
              {step === 4 && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-green-50)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 style={{ width: 32, height: 32, color: 'var(--color-green-600)' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-strong)', marginBottom: 6 }}>Webhook configurado!</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sua primeira venda aparecerá automaticamente no painel.</p>
                  <button onClick={onClose} style={{ marginTop: 20, height: 44, padding: '0 32px', borderRadius: 'var(--radius-xl)', background: 'var(--color-green-600)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    Fechar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Suggest Modal ───
function SuggestModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSending(true);
    await supabase.from('integration_suggestions').insert({ user_id: userId, platform_name: name, reason });
    haptic.success();
    toast.success('Obrigado! Analisaremos sua sugestão. 🙏');
    setSending(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{ width: '90%', maxWidth: 400, background: 'var(--color-bg-surface)', borderRadius: 20, padding: 24 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 16 }}>
          <MessageSquarePlus style={{ width: 20, height: 20, color: 'var(--color-green-600)' }} />
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-strong)' }}>Sugerir integração</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nome da plataforma</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: PicPay, iFood..."
            style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-weak)', background: 'var(--color-bg-surface)', fontSize: 14, color: 'var(--color-text-base)' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Por que seria útil? (opcional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Descreva como usaria..."
            style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-weak)', background: 'var(--color-bg-surface)', fontSize: 14, color: 'var(--color-text-base)', resize: 'none' }} />
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 700, border: '1px solid var(--color-border-weak)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={submit} disabled={sending || !name.trim()} style={{ flex: 1, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--color-green-600)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: sending ? 0.7 : 1 }}>
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Helpers ───
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getWebhookInstructions(platformId: string): string[] {
  const map: Record<string, string[]> = {
    hotmart: ['Acesse hotmart.com → Ferramentas → Webhooks', 'Clique em "Novo Webhook"', 'Cole a URL que você copiou', 'Marque os eventos: "Compra Aprovada", "Reembolso"', 'Clique em Salvar'],
    kiwify: ['Acesse dashboard.kiwify.com.br', 'Vá em Configurações → Integrações → Webhooks', 'Cole a URL copiada', 'Selecione eventos e salve'],
    shopify: ['Admin Shopify → Configurações → Notificações', 'Role até "Webhooks" → "Criar webhook"', 'Evento: "Criação de pedido"', 'Cole a URL e salve'],
    eduzz: ['Acesse Eduzz → Configurações → Webhooks', 'Adicione nova URL de webhook', 'Cole a URL e selecione eventos de venda', 'Salve a configuração'],
    monetizze: ['Acesse Monetizze → Configurações → Integrações', 'Adicione URL de postback', 'Cole a URL e salve'],
    stripe: ['Acesse Stripe Dashboard → Developers → Webhooks', 'Clique em "Add endpoint"', 'Cole a URL e selecione eventos (payment_intent.succeeded)', 'Salve'],
    paypal: ['Acesse PayPal Developer → Webhooks', 'Adicione novo webhook com a URL', 'Selecione eventos de pagamento', 'Salve'],
    mercadopago: ['Acesse Mercado Pago → Configurações → IPN', 'Cole a URL no campo de notificações', 'Selecione "Pagamentos"', 'Salve'],
    pagseguro: ['Acesse PagSeguro → Configurações → Integrações', 'Cole a URL de notificação', 'Ative notificações de transação', 'Salve'],
  };
  return map[platformId] || ['Acesse as configurações da plataforma', 'Procure a seção de Webhooks ou Integrações', 'Cole a URL que você copiou', 'Salve a configuração'];
}
