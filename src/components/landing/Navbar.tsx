import { Link } from 'react-router-dom';
import { BarChart3, Menu, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-border transition-shadow duration-200 ${
        scrolled ? 'shadow-[0_1px_20px_rgba(0,0,0,0.06)]' : ''
      }`}
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center">
            <BarChart3 className="w-[18px] h-[18px] text-primary-foreground" />
          </div>
          <span className="text-lg font-black text-fin-green-dark">FinDash Pro</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#recursos" className="text-sm font-medium text-muted hover:text-primary transition-colors duration-200">Recursos</a>
          <a href="#precos" className="text-sm font-medium text-muted hover:text-primary transition-colors duration-200">Preços</a>
          <a href="#faq" className="text-sm font-medium text-muted hover:text-primary transition-colors duration-200">Blog</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 rounded-[9px] border-[1.5px] border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-all duration-200">
            Entrar
          </Link>
          <Link to="/register" className="px-4 py-2 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:bg-fin-green-dark transition-all duration-200 inline-flex items-center gap-1.5">
            Começar grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-16 bg-card z-40 flex flex-col items-center justify-center gap-6 md:hidden"
          >
            <a href="#recursos" onClick={() => setMobileOpen(false)} className="text-lg font-semibold text-foreground">Recursos</a>
            <a href="#precos" onClick={() => setMobileOpen(false)} className="text-lg font-semibold text-foreground">Preços</a>
            <Link to="/login" onClick={() => setMobileOpen(false)} className="text-lg font-semibold text-foreground">Entrar</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="px-6 py-3 rounded-[9px] bg-primary text-primary-foreground font-extrabold">
              Começar grátis
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
