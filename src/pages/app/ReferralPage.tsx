import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Gift, Copy, Check, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ReferralPage() {
  const { user } = useAuth();
  const { config } = useProfile();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_config').select('referral_code').eq('user_id', user.id).single()
      .then(({ data }) => setReferralCode(data?.referral_code || ''));
    supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setReferrals(data || []));
  }, [user]);

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  const subscribedCount = referrals.filter(r => r.status === 'subscribed').length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = `Oi! Estou usando o FinDash Pro para controlar minhas finanças e está sendo incrível! Use meu link e ganhe 7 dias extras grátis: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="p-7 flex flex-col gap-5 max-w-[800px] mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-8 text-white relative overflow-hidden" style={{ background: '#16a34a' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ background: 'white' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-8 h-8" />
              <h2 className="text-2xl font-black">Ganhe 1 mês grátis de Pro!</h2>
            </div>
            <p className="text-sm opacity-85 max-w-md leading-relaxed">
              Para cada amigo que assinar o plano Pro, você ganha 1 mês grátis automaticamente.
            </p>
            <div className="mt-5 rounded-lg p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <code className="flex-1 text-sm font-mono truncate">{referralLink}</code>
              <button onClick={handleCopy} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5" style={{ background: 'white', color: '#16a34a' }}>
                {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <button onClick={handleWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold text-white" style={{ background: '#25D366' }}>
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            <Copy className="w-4 h-4" /> Copiar link
          </button>
        </div>

        {/* How it works */}
        <div className="rounded-[14px] p-5" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
          <h3 className="text-sm font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>Como funciona</h3>
          <div className="space-y-4">
            {[
              { step: '1', emoji: '🔗', label: 'Compartilhe seu link único' },
              { step: '2', emoji: '✅', label: 'Amigo se cadastra e assina Pro' },
              { step: '3', emoji: '🎁', label: 'Você ganha 1 mês grátis automaticamente' },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: '#16a34a' }}>{s.step}</div>
                <span className="text-lg mr-1">{s.emoji}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{referrals.length}</p>
            <p className="text-[10px] font-bold" style={{ color: 'var(--text-hint)' }}>INDICAÇÕES</p>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <p className="text-2xl font-black" style={{ color: '#16a34a' }}>{subscribedCount}</p>
            <p className="text-[10px] font-bold" style={{ color: 'var(--text-hint)' }}>ASSINARAM</p>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <p className="text-2xl font-black" style={{ color: '#d97706' }}>{subscribedCount}</p>
            <p className="text-[10px] font-bold" style={{ color: 'var(--text-hint)' }}>MESES GANHOS</p>
          </div>
        </div>

        {/* Referrals table */}
        {referrals.length > 0 && (
          <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
            <div className="px-5 py-4">
              <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>Suas indicações</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <th className="text-left px-5 py-2 text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Amigo</th>
                  <th className="text-left px-5 py-2 text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Status</th>
                  <th className="text-left px-5 py-2 text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Data</th>
                  <th className="text-right px-5 py-2 text-[10px] uppercase font-bold" style={{ color: 'var(--text-hint)' }}>Recompensa</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{r.referred_email}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                        background: r.status === 'subscribed' ? '#f0fdf4' : r.status === 'registered' ? '#eff6ff' : '#f1f5f9',
                        color: r.status === 'subscribed' ? '#16a34a' : r.status === 'registered' ? '#2563eb' : '#94a3b8',
                      }}>{r.status === 'subscribed' ? 'Assinou Pro ✓' : r.status === 'registered' ? 'Registrado' : 'Cadastrou'}</span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-hint)' }}>{format(new Date(r.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-5 py-3 text-right text-xs font-bold" style={{ color: r.status === 'subscribed' ? '#16a34a' : 'var(--text-hint)' }}>
                      {r.status === 'subscribed' ? '1 mês grátis ✓' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
