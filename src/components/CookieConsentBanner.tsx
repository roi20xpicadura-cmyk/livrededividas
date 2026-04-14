import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONSENT_KEY = 'findash_cookie_consent';

export default function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const daysSince = (Date.now() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 365) return;
      } catch { /* show banner */ }
    }
    const timer = setTimeout(() => setShow(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString(), version: '1.0' }));
    setShow(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString(), version: '1.0' }));
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[1000] border-t"
          style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-base)', boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Shield size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-green-600)' }} />
              <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                Usamos cookies para melhorar sua experiência e analisar o uso do serviço.{' '}
                <Link to="/politica-de-cookies" className="underline" style={{ color: 'var(--color-green-600)' }}>Saiba mais</Link>
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto">
              <button onClick={handleReject} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                Rejeitar não essenciais
              </button>
              <button onClick={handleAccept} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-[13px] font-bold text-white transition-all hover:brightness-110" style={{ background: 'var(--color-green-600)' }}>
                Aceitar todos
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
