import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/korafinance-logo.png';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Preços', href: '#precos' },
    { label: 'Blog', href: '#faq' },
    { label: 'Integrações', href: '#integracoes' },
  ];

  return (
    <nav
      className={`sticky top-0 z-[100] border-b transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_20px_rgba(0,0,0,0.08)]' : ''
      }`}
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="KoraFinance" className="h-8 w-auto object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="text-[14px] font-medium text-[#64748b] hover:text-[#0f172a] transition-colors duration-150"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-[14px] font-medium text-[#64748b] hover:text-[#0f172a] transition-colors duration-150 px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-[10px] bg-[#7C3AED] text-white text-[14px] font-bold hover:bg-[#1A0D35] transition-all duration-200 hover:-translate-y-px inline-flex items-center gap-1.5"
            style={{ boxShadow: '0 4px 14px rgba(124, 58, 237,0.35)' }}
          >
            Começar grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 top-16 z-[90] md:hidden"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed inset-x-0 top-16 z-[110] flex flex-col items-center justify-center gap-8 md:hidden"
              style={{
                background: '#FFFFFF',
                paddingTop: '48px',
                paddingBottom: '48px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }}
            >
              {navLinks.map(l => (
                <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="text-lg font-semibold text-[#0f172a]">
                  {l.label}
                </a>
              ))}
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-lg font-semibold text-[#64748b]">Entrar</Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="px-8 py-3.5 rounded-[12px] bg-[#7C3AED] text-white font-bold text-base inline-flex items-center gap-2"
              >
                Começar grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
