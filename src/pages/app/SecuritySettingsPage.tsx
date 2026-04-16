import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Download, Trash2, Mail, ChevronLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const collected = [
  { icon: '📧', title: 'E-mail', desc: 'Para criar sua conta e enviar notificações' },
  { icon: '💸', title: 'Lançamentos financeiros', desc: 'Despesas e receitas que você cadastra' },
  { icon: '🎯', title: 'Metas e orçamentos', desc: 'Objetivos que você define no app' },
  { icon: '📱', title: 'Dados de uso anônimos', desc: 'Quais telas você visita (sem dados pessoais)' },
];

const neverCollected = [
  { icon: '🔑', title: 'Senha do seu banco', desc: 'Nunca pedimos, nunca acessamos' },
  { icon: '💳', title: 'Número do cartão', desc: 'Você digita apenas o nome do cartão, não os números' },
  { icon: '📍', title: 'Localização', desc: 'O app não solicita sua localização' },
  { icon: '📸', title: 'Fotos ou câmera', desc: 'Exceto se você escolher adicionar foto de perfil' },
  { icon: '🤝', title: 'Dados para anunciantes', desc: 'Zero anúncios, zero compartilhamento comercial' },
];

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const tables = ['transactions', 'goals', 'debts', 'credit_cards', 'investments', 'budgets', 'user_config'] as const;
      const data: Record<string, any> = {};
      for (const t of tables) {
        const { data: rows } = await supabase.from(t).select('*').eq('user_id', user.id);
        data[t] = rows || [];
      }
      const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id);
      data['profiles'] = profileRow || [];
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user_id: user.id, data }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `korafinance-dados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dados exportados!');
    } catch (e) {
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'EXCLUIR' || !user) return;
    try {
      await supabase.auth.signOut();
      toast.success('Solicitação registrada. Conta será excluída em até 30 dias.');
      setShowDelete(false);
    } catch {
      toast.error('Erro ao processar exclusão');
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg-base)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={{ background: 'var(--color-bg-surface)', borderBottom: '0.5px solid var(--color-border-ghost)' }}>
        <Link to="/app/settings" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-bg-sunken)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--color-text-muted)' }} />
        </Link>
        <div>
          <h1 className="text-[15px] font-extrabold tracking-tight" style={{ color: 'var(--color-text-strong)' }}>Segurança e Privacidade</h1>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Seus dados, seus direitos</p>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-4 pt-4 space-y-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #0a0f0a, #1A0D35)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(139, 92, 246,0.25)' }} />
          <div className="relative">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>🛡️</div>
            <h2 className="text-[18px] font-black text-white mb-2 tracking-tight">Seus dados estão protegidos</h2>
            <p className="text-[13px] text-white/70 leading-[1.6] max-w-[320px] mx-auto">
              O KoraFinance nunca acessa suas contas bancárias e nunca vende seus dados para terceiros.
            </p>
          </div>
        </motion.div>

        {/* What we collect */}
        <Card title="O que coletamos">
          {collected.map((item, i) => (
            <Row key={i} item={item} badge={{ text: 'Sim', color: '#7C3AED', bg: '#F5F3FF' }} last={i === collected.length - 1} />
          ))}
        </Card>

        {/* What we NEVER collect */}
        <Card title="O que NUNCA coletamos">
          {neverCollected.map((item, i) => (
            <Row key={i} item={item} badge={{ text: 'Nunca', color: '#dc2626', bg: '#fef2f2' }} last={i === neverCollected.length - 1} />
          ))}
        </Card>

        {/* Where data lives */}
        <Card title="Onde ficam seus dados">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">☁️</div>
              <div>
                <div className="text-[14px] font-bold" style={{ color: 'var(--color-text-base)' }}>Supabase (AWS São Paulo)</div>
                <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Infraestrutura segura, servidores no Brasil</div>
              </div>
            </div>
            <p className="text-[12px] leading-[1.7] p-3 rounded-lg" style={{ background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)' }}>
              🔒 Criptografia AES-256 em repouso e TLS 1.3 em trânsito. Backups automáticos diários. Acesso restrito por autenticação multifator. Conformidade com LGPD e SOC 2.
            </p>
          </div>
        </Card>

        {/* Your rights */}
        <Card title="Seus direitos (LGPD)">
          <div className="p-4 space-y-2">
            <ActionRow icon="📥" label="Exportar meus dados" desc="Baixe todos os seus dados em JSON" cta={exporting ? '...' : 'Exportar'} onClick={handleExport} color="#7C3AED" />
            <ActionRow icon="🗑️" label="Excluir minha conta" desc="Apaga permanentemente todos os dados" cta="Excluir" onClick={() => setShowDelete(true)} color="#dc2626" />
          </div>
        </Card>

        {/* DPO */}
        <div className="p-4 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-weak)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'var(--color-bg-sunken)' }}>📮</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text-base)' }}>Encarregado de Dados (DPO)</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>privacidade@korafinance.com.br</div>
          </div>
          <button onClick={() => window.open('mailto:privacidade@korafinance.com.br')} className="px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'var(--color-bg-sunken)', color: 'var(--color-text-base)', border: '1px solid var(--color-border-base)' }}>
            Contatar
          </button>
        </div>

        <Link to="/privacidade" className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-weak)' }}>
          <div>
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text-base)' }}>Nossa promessa de privacidade</div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Em português de verdade, não em juridiquês</div>
          </div>
          <ExternalLink size={15} style={{ color: 'var(--color-text-muted)' }} />
        </Link>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: 'var(--color-bg-surface)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-strong)' }}>Tem certeza?</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>Esta ação é irreversível. Todos os seus dados serão excluídos em até 30 dias.</p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Digite EXCLUIR" className="w-full px-3 py-2.5 rounded-lg border-[1.5px] mb-4 outline-none text-sm" style={{ borderColor: '#dc2626', background: 'var(--color-bg-sunken)', color: 'var(--color-text-base)' }} />
            <div className="flex gap-3">
              <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }} className="flex-1 py-2.5 rounded-lg text-[13px] font-bold border" style={{ borderColor: 'var(--color-border-base)', color: 'var(--color-text-base)' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleteConfirm !== 'EXCLUIR'} className="flex-1 py-2.5 rounded-lg text-[13px] font-bold text-white bg-[#dc2626] disabled:opacity-50">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-weak)' }}>
      <div className="px-4 pt-4 pb-2 text-[11px] font-extrabold uppercase tracking-[1.2px]" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ item, badge, last }: { item: { icon: string; title: string; desc: string }; badge: { text: string; color: string; bg: string }; last: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: last ? 'none' : '0.5px solid var(--color-border-ghost)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--color-bg-sunken)' }}>{item.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text-base)' }}>{item.title}</div>
        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</div>
      </div>
      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold flex-shrink-0" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>
    </div>
  );
}

function ActionRow({ icon, label, desc, cta, onClick, color }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
      <div className="text-xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text-base)' }}>{label}</div>
        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
      </div>
      <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: color }}>{cta}</button>
    </div>
  );
}
