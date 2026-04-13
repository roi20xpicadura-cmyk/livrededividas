import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-black text-foreground">FinDash Pro</span>
        </div>

        {sent ? (
          <div className="card-surface p-6 text-center">
            <h1 className="text-xl font-black text-foreground mb-2">E-mail enviado! ✉️</h1>
            <p className="text-sm text-muted mb-4">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
            <Link to="/login" className="text-sm text-fin-green font-bold hover:underline">Voltar ao login</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-foreground mb-1">Esqueceu a senha?</h1>
            <p className="text-sm text-muted mb-6">Informe seu e-mail e enviaremos um link de recuperação.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-upper text-muted block mb-1.5">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-fin-green-border bg-card text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                Enviar link de recuperação
              </button>
            </form>
            <p className="text-center text-sm text-muted mt-6">
              <Link to="/login" className="text-fin-green font-bold hover:underline">Voltar ao login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
