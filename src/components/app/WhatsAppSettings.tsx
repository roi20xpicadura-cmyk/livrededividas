import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle, Phone, Loader2 } from 'lucide-react';

interface WhatsAppConnection {
  id: string;
  phone_number: string;
  verified: boolean;
  active: boolean;
  connected_at: string;
  last_message_at: string | null;
  total_messages: number;
}

function normalizePhonePreview(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [step, setStep] = useState<'idle' | 'entering' | 'verifying' | 'connected'>('idle');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const loadConnection = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    const { data } = await supabase.functions.invoke('whatsapp-verify', {
      body: { userId: user.id, action: 'status' },
    });
    if (data?.connection) {
      setConnection(data.connection);
      setStep('connected');
    }
    setChecking(false);
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  async function sendCode() {
    const digits = phoneInput.replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      toast.error('Digite um número válido com DDD');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-verify', {
        body: {
          userId: user!.id,
          phoneNumber: digits,
          action: 'send_code',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.sent) {
        setStep('verifying');
        toast.success('Código enviado para o WhatsApp!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar código.');
    }
    setLoading(false);
  }

  async function verifyCode() {
    if (codeInput.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-verify', {
        body: {
          userId: user!.id,
          phoneNumber: phoneInput.replace(/\D/g, ''),
          action: 'verify_code',
          code: codeInput,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.verified) {
        toast.success('WhatsApp conectado com sucesso! 🎉');
        if (data?.warning) {
          toast.warning(data.warning);
        }
        await loadConnection();
      } else {
        toast.error(data?.error || 'Código incorreto');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao verificar código');
    }
    setLoading(false);
  }

  async function toggleActive(newVal: boolean) {
    if (!connection) return;
    setConnection({ ...connection, active: newVal });
    const { error } = await supabase
      .from('whatsapp_connections')
      .update({ active: newVal })
      .eq('user_id', user!.id);
    if (error) {
      setConnection({ ...connection, active: !newVal });
      toast.error('Erro ao atualizar preferência');
    } else {
      toast.success(newVal ? 'Notificações ativadas 🔔' : 'Notificações pausadas 🔕');
    }
  }

  async function disconnect() {
    setLoading(true);
    await supabase.functions.invoke('whatsapp-verify', {
      body: { userId: user!.id, action: 'disconnect' },
    });
    setConnection(null);
    setStep('idle');
    setPhoneInput('');
    setCodeInput('');
    toast.success('WhatsApp desconectado');
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="card-surface p-6">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-green-600)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Verificando conexão WhatsApp...</span>
        </div>
      </div>
    );
  }

  const commands = [
    { emoji: '💸', cmd: '"gastei 50 no mercado"', desc: 'Registra despesa' },
    { emoji: '💰', cmd: '"recebi 3000 de salário"', desc: 'Registra receita' },
    { emoji: '📊', cmd: '"como estão minhas finanças?"', desc: 'Resumo do mês' },
    { emoji: '🎯', cmd: '"progresso das metas"', desc: 'Status das metas' },
    { emoji: '💳', cmd: '"quanto devo?"', desc: 'Resumo de dívidas' },
    { emoji: '💡', cmd: '"posso comprar X?"', desc: 'Conselho da IA' },
  ];

  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
            <MessageCircle size={20} color="white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold" style={{ color: 'var(--color-text-strong)' }}>
              KoraFinance IA no WhatsApp
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Registre gastos e consulte finanças pelo WhatsApp
            </p>
          </div>
        </div>
        {step === 'connected' && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold" style={{ background: 'var(--color-success-bg)', color: 'var(--color-green-700)' }}>
            ● ATIVO
          </span>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border-base)', paddingTop: 16 }}>
        {step === 'connected' && connection && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Phone size={14} style={{ color: 'var(--color-green-600)' }} />
                <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
                  +{connection.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 $2 $3-$4')}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {connection.total_messages || 0} mensagens trocadas
                {connection.last_message_at && ` · Última: ${new Date(connection.last_message_at).toLocaleDateString('pt-BR')}`}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--color-bg-sunken)', border: '0.5px solid var(--color-border-weak)' }}>
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
                  🔔 Notificações automáticas
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Lembretes de dívidas, alertas e resumos diários
                </p>
              </div>
              <button
                onClick={() => toggleActive(!connection.active)}
                role="switch"
                aria-checked={connection.active}
                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
                style={{ background: connection.active ? 'hsl(var(--primary))' : 'var(--color-border-base)' }}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: connection.active ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            <div>
              <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Comandos disponíveis
              </p>
              <div className="grid gap-1.5">
                {commands.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--color-bg-surface)', border: '0.5px solid var(--color-border-weak)' }}>
                    <span className="text-base flex-shrink-0">{item.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold" style={{ color: 'var(--color-text-base)' }}>{item.cmd}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={disconnect} disabled={loading}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold transition-all"
              style={{ background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-base)' }}>
              {loading ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </button>
          </div>
        )}

        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Conecte seu WhatsApp e gerencie suas finanças sem abrir o app. Registre gastos, consulte saldo e receba insights — tudo pelo WhatsApp.
            </p>
            <button onClick={() => setStep('entering')}
              className="w-full py-3 rounded-xl text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ background: 'hsl(var(--primary))', color: 'white', border: 'none' }}>
              <MessageCircle size={16} />
              Conectar WhatsApp
            </button>
          </div>
        )}

        {step === 'entering' && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold mb-1.5 block" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Seu número do WhatsApp
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 rounded-lg text-[13px] font-bold" style={{ background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)', border: '1.5px solid var(--color-border-base)' }}>
                  🇧🇷 +55
                </div>
                <input
                  value={phoneInput}
                  onChange={e => setPhoneInput(normalizePhonePreview(e.target.value))}
                  placeholder="11 99999-9999"
                  className="flex-1 px-3 py-2.5 rounded-lg text-[14px] outline-none"
                  style={{ background: 'var(--color-bg-sunken)', border: '1.5px solid var(--color-border-base)', color: 'var(--color-text-base)' }}
                  type="tel"
                  maxLength={15}
                />
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>
                Digite só DDD + número. O país (+55) já é adicionado automaticamente.
              </p>
            </div>
            <button onClick={sendCode} disabled={loading || phoneInput.replace(/\D/g, '').length < 10}
              className="w-full py-3 rounded-xl text-[13px] font-extrabold transition-all disabled:opacity-40"
              style={{ background: 'hsl(var(--primary))', color: 'white', border: 'none' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Enviar código de verificação'}
            </button>
            <button onClick={() => setStep('idle')}
              className="w-full text-center text-[12px] py-1" style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="space-y-4">
            <div className="text-center p-4 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
              <div className="text-3xl mb-2">💬</div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>Código enviado!</p>
              <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Verifique o WhatsApp no número +55 {phoneInput}
              </p>
            </div>
            <div>
              <label className="text-[11px] font-bold mb-1.5 block" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Código de 6 dígitos
              </label>
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-3.5 rounded-xl text-center outline-none"
                style={{
                  background: 'var(--color-bg-sunken)',
                  border: '1.5px solid var(--color-border-base)',
                  color: 'var(--color-text-strong)',
                  fontSize: 24, fontWeight: 900, letterSpacing: 8,
                }}
                maxLength={6}
                type="tel"
              />
            </div>
            <button onClick={verifyCode} disabled={loading || codeInput.length !== 6}
              className="w-full py-3 rounded-xl text-[13px] font-extrabold transition-all disabled:opacity-40"
              style={{ background: 'hsl(var(--primary))', color: 'white', border: 'none' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Verificar e conectar'}
            </button>
            <button onClick={() => { setStep('entering'); setCodeInput(''); }}
              className="w-full text-center text-[11px] py-1" style={{ color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Número errado? Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
