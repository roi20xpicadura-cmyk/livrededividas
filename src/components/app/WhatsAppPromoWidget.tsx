import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WhatsAppPromoWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.functions.invoke('whatsapp-verify', {
      body: { userId: user.id, action: 'status' },
    }).then(({ data }) => {
      setConnected(!!data?.connection);
    }).catch(() => setConnected(false));
  }, [user]);

  if (connected === null || connected) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      onClick={() => navigate('/app/settings')}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all hover:brightness-[0.98] active:scale-[0.98]"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-base)',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-success-bg)', fontSize: 20 }}>
        💬
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-base)' }}>Registre gastos pelo WhatsApp</p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>"gastei 50 no mercado" → registrado na hora</p>
      </div>
      <div className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
        Conectar
      </div>
    </motion.button>
  );
}
