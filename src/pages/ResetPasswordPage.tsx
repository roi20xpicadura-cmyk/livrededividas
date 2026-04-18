import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import koraIcon from '@/assets/korafinance-icon.png';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }
    // Also handle the auth state change for recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPw) { toast.error('As senhas não coincidem'); return; }
    if (password.length < 8) { toast.error('Mínimo 8 caracteres'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha atualizada com sucesso!');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <img src={koraIcon} alt="KoraFinance" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-black text-foreground">KoraFinance</span>
        </div>

        <h1 className="text-2xl font-black text-foreground mb-1">Nova senha</h1>
        <p className="text-sm text-muted mb-6">Defina sua nova senha abaixo.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-upper text-muted block mb-1.5">Nova senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <div>
            <label className="label-upper text-muted block mb-1.5">Confirmar senha</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
            Salvar nova senha
          </button>
        </form>
      </div>
    </div>
  );
}
