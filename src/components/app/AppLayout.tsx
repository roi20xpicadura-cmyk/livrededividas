import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import AIChatDrawer from '@/components/app/AIChatDrawer';
import {
  LayoutDashboard, ArrowLeftRight, Target, TrendingUp, FileText,
  CreditCard, Briefcase, BarChart2, Download, Settings2, Crown,
  LogOut, Menu, X, Bell, ChevronRight, BarChart3, Home, MoreHorizontal, Sparkles,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_NAV_ITEMS = [
  { label: 'Visão Geral', path: '/app', icon: LayoutDashboard, profiles: ['personal', 'business', 'both'] },
  { label: 'Lançamentos', path: '/app/transactions', icon: ArrowLeftRight, profiles: ['personal', 'business', 'both'] },
  { label: 'Metas', path: '/app/goals', icon: Target, profiles: ['personal', 'business', 'both'] },
  { label: 'Dívidas', path: '/app/debts', icon: AlertCircle, profiles: ['personal', 'business', 'both'] },
  { label: 'Fluxo de Caixa', path: '/app/cashflow', icon: TrendingUp, profiles: ['business', 'both'] },
  { label: 'DRE', path: '/app/dre', icon: FileText, profiles: ['business', 'both'] },
  { label: 'Cartões', path: '/app/cards', icon: CreditCard, profiles: ['personal', 'business', 'both'] },
  { label: 'Investimentos', path: '/app/investments', icon: Briefcase, profiles: ['personal', 'business', 'both'] },
  { label: 'Gráficos', path: '/app/charts', icon: BarChart2, profiles: ['business', 'both'] },
  { label: 'Exportar', path: '/app/export', icon: Download, profiles: ['personal', 'business', 'both'] },
];

const bottomItems = [
  { label: 'Configurações', path: '/app/settings', icon: Settings2 },
  { label: 'Meu Plano', path: '/app/billing', icon: Crown },
];

const MOBILE_NAV = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Lançamentos', path: '/app/transactions', icon: ArrowLeftRight },
  { label: 'Metas', path: '/app/goals', icon: Target },
  { label: 'Cartões', path: '/app/cards', icon: CreditCard },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { profile, config, loading, refetch } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'business' | 'personal'>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeDebtCount, setActiveDebtCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('debts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active')
      .then(({ count }) => setActiveDebtCount(count || 0));
  }, [user, location.pathname]);

  const profileType = config?.profile_type || 'personal';
  const navItems = ALL_NAV_ITEMS.filter(item => item.profiles.includes(profileType));
  const plan = profile?.plan || 'free';

  useEffect(() => {
    if (!loading && config && !config.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [loading, config]);

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const pageTitles: Record<string, string> = {
    '/app': 'Visão Geral',
    '/app/transactions': 'Lançamentos',
    '/app/goals': 'Metas',
    '/app/debts': 'Sair das Dívidas',
    '/app/cashflow': 'Fluxo de Caixa',
    '/app/dre': 'DRE',
    '/app/cards': 'Cartões de Crédito',
    '/app/investments': 'Investimentos',
    '/app/charts': 'Gráficos',
    '/app/export': 'Exportar',
    '/app/settings': 'Configurações',
    '/app/billing': 'Planos e Assinatura',
  };

  const planBadge = plan.toUpperCase();
  const planBadgeClass = plan === 'pro'
    ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#d4edda]'
    : plan === 'business'
    ? 'bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff]'
    : 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]';

  const initial = (profile?.full_name || user?.email || '?')[0].toUpperCase();

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => { setShowOnboarding(false); refetch(); }} />;
  }

  return (
    <div className="min-h-screen bg-[#f8faf8] flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-[#f1f5f9] flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Top */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[#16a34a] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[17px] font-black text-[#14532d]">FinDash</span>
              <span className="text-[17px] font-black text-[#16a34a]">Pro</span>
            </div>
            <span className={`ml-auto text-[10px] font-extrabold px-2 py-[3px] rounded-md tracking-wide ${planBadgeClass}`}>
              {planBadge}
            </span>
          </div>

          {/* Profile toggle */}
          {profileType === 'both' && (
            <div className="mt-3 bg-[#f8faf8] border border-[#e2e8f0] rounded-[10px] p-[3px] flex">
              {[
                { val: 'all' as const, label: '📊 Tudo' },
                { val: 'personal' as const, label: '🏠 Pessoal' },
                { val: 'business' as const, label: '💼 Negócio' },
              ].map(f => (
                <button key={f.val} onClick={() => setViewFilter(f.val)}
                  className={`flex-1 px-2 py-[6px] rounded-lg text-[12px] font-medium transition-all duration-200 ${
                    viewFilter === f.val
                      ? 'bg-white text-[#14532d] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-[#94a3b8]'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* User info */}
          <div className="mt-4 flex items-center gap-2.5 bg-[#f8faf8] rounded-[10px] px-3 py-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#16a34a] to-[#14532d] flex items-center justify-center">
                <span className="text-white text-[13px] font-extrabold">{initial}</span>
              </div>
              {/* online dot */}
              <div className="absolute bottom-[2px] right-[2px] w-[6px] h-[6px] rounded-full bg-[#22c55e] border-2 border-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#1a2e1a] truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-[11px] text-[#94a3b8] truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#cbd5e1] flex-shrink-0" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 h-10 px-3 rounded-[9px] mb-[2px] transition-all duration-150 group ${
                  active ? 'bg-[#f0fdf4]' : 'hover:bg-[#f8faf8]'
                }`}>
                <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#dcfce7]' : ''}`}>
                  <item.icon className={`w-[15px] h-[15px] ${
                    item.path === '/app/debts' && activeDebtCount > 0
                      ? 'text-[#dc2626]'
                      : active ? 'text-[#16a34a]' : 'text-[#94a3b8] group-hover:text-[#16a34a]'
                  }`} />
                </div>
                <span className={`text-[13px] flex-1 ${active ? 'font-bold text-[#16a34a]' : 'font-medium text-[#64748b] group-hover:text-[#14532d]'}`}>
                  {item.label}
                </span>
                {item.path === '/app/debts' && activeDebtCount > 0 && (
                  <span className="text-[10px] font-extrabold bg-[#dc2626] text-white px-[6px] py-[1px] rounded-full min-w-[18px] text-center">
                    {activeDebtCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2.5 pb-2.5">
          {plan === 'free' && (
            <div className="mx-1 mb-2 rounded-xl bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] border border-[#d4edda] p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-[#d97706]" />
                <span className="text-[13px] font-extrabold text-[#14532d]">Upgrade para Pro</span>
              </div>
              <p className="text-[11px] text-[#6b8f6b] leading-relaxed">Lançamentos ilimitados e muito mais.</p>
              <Link to="/app/billing" onClick={() => setSidebarOpen(false)}
                className="block mt-2.5 text-center bg-[#16a34a] hover:bg-[#14532d] text-white text-[11px] font-bold py-[6px] rounded-[7px] transition-colors">
                Ver planos →
              </Link>
            </div>
          )}

          <div className="border-t border-[#f1f5f9] mx-3 mb-1" />

          {/* CONTA section label */}
          <p className="text-[9px] font-extrabold text-[#cbd5e1] tracking-[1.2px] uppercase px-4 pt-3.5 pb-1">CONTA</p>

          {bottomItems.map(item => {
            const active = isActive(item.path);
            const isBilling = item.path === '/app/billing';
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 h-10 px-3 rounded-[9px] mb-[2px] transition-all duration-150 group ${
                  active ? 'bg-[#f0fdf4]' : 'hover:bg-[#f8faf8]'
                }`}>
                <item.icon className={`w-[15px] h-[15px] ${
                  active ? 'text-[#16a34a]' : isBilling && plan !== 'free' ? 'text-[#d97706]' : 'text-[#94a3b8] group-hover:text-[#16a34a]'
                }`} />
                <span className={`text-[13px] flex-1 ${
                  active ? 'font-bold text-[#16a34a]' : 'font-medium text-[#64748b] group-hover:text-[#14532d]'
                }`}>{item.label}</span>
                {isBilling && plan === 'free' && (
                  <span className="text-[9px] font-extrabold bg-[#fffbeb] text-[#92400e] px-[7px] py-[2px] rounded-[5px]">Upgrade</span>
                )}
              </Link>
            );
          })}

          <button onClick={() => signOut()}
            className="flex items-center gap-2.5 h-10 px-3 rounded-[9px] w-full transition-all duration-150 group hover:bg-[#fef2f2]">
            <LogOut className="w-[15px] h-[15px] text-[#94a3b8] group-hover:text-[#dc2626]" />
            <span className="text-[13px] font-medium text-[#64748b] group-hover:text-[#dc2626]">Sair</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 min-w-0 pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#f1f5f9] h-[58px] flex items-center px-5 md:px-7 gap-4">
          <button className="lg:hidden text-[#94a3b8]" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="min-w-0">
            <h1 className="text-[20px] font-black text-[#14532d] tracking-tight leading-none">
              {pageTitles[location.pathname] || 'FinDash Pro'}
            </h1>
            <p className="text-[11px] text-[#94a3b8] hidden md:block">FinDash Pro / {pageTitles[location.pathname] || ''}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Bell */}
            <button className="relative w-9 h-9 rounded-[9px] bg-[#f8faf8] border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f0fdf4] hover:border-[#d4edda] transition-all">
              <Bell className="w-4 h-4 text-[#64748b]" />
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#16a34a] to-[#14532d] flex items-center justify-center hover:ring-2 hover:ring-[#d4edda] transition-all">
                <span className="text-white text-[13px] font-extrabold">{initial}</span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-11 z-50 w-56 bg-white border border-[#e2e8f0] rounded-xl shadow-lg py-1.5 overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-[#f1f5f9]">
                      <p className="text-[13px] font-bold text-[#14532d] truncate">{profile?.full_name || 'Usuário'}</p>
                      <p className="text-[11px] text-[#94a3b8] truncate">{user?.email}</p>
                    </div>
                    <button onClick={() => { navigate('/app/settings'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#374151] hover:bg-[#f8faf8] transition-colors">
                      <Settings2 className="w-4 h-4 text-[#94a3b8]" /> Configurações
                    </button>
                    <button onClick={() => { navigate('/app/billing'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#374151] hover:bg-[#f8faf8] transition-colors">
                      <Crown className="w-4 h-4 text-[#94a3b8]" /> Meu plano
                    </button>
                    <div className="border-t border-[#f1f5f9] my-1" />
                    <button onClick={() => { signOut(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#ef4444] hover:bg-[#fef2f2] transition-colors">
                      <LogOut className="w-4 h-4" /> Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-5 md:px-7 py-6">
          <Outlet />
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-[#f1f5f9] h-16 flex items-center justify-around px-2">
        {MOBILE_NAV.map(item => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors">
              <item.icon className={`w-5 h-5 ${active ? 'text-[#16a34a]' : 'text-[#94a3b8]'}`} />
              {active && <div className="w-1 h-1 rounded-full bg-[#16a34a]" />}
            </Link>
          );
        })}
        <button onClick={() => setShowMoreDrawer(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg">
          <MoreHorizontal className="w-5 h-5 text-[#94a3b8]" />
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {showMoreDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-50 lg:hidden backdrop-blur-sm" onClick={() => setShowMoreDrawer(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl p-4 pb-8 lg:hidden">
              <div className="w-10 h-1 rounded-full bg-[#e2e8f0] mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {navItems.filter(i => !MOBILE_NAV.find(m => m.path === i.path)).map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setShowMoreDrawer(false)}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-[#f8faf8] transition-colors">
                    <item.icon className="w-5 h-5 text-[#64748b]" />
                    <span className="text-[10px] font-semibold text-[#64748b] text-center leading-tight">{item.label}</span>
                  </Link>
                ))}
                {bottomItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setShowMoreDrawer(false)}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-[#f8faf8] transition-colors">
                    <item.icon className="w-5 h-5 text-[#64748b]" />
                    <span className="text-[10px] font-semibold text-[#64748b] text-center leading-tight">{item.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ AI CHAT ═══ */}
      <button onClick={() => setChatOpen(true)}
        className={`fixed bottom-20 lg:bottom-6 right-5 z-[499] w-[52px] h-[52px] rounded-full bg-[#16a34a] shadow-lg flex items-center justify-center hover:bg-[#14532d] transition-all group ${chatOpen ? 'hidden' : ''}`}
        title="Assistente IA — pergunte qualquer coisa">
        <Sparkles className="w-[22px] h-[22px] text-white" />
        <span className="absolute inset-0 rounded-full border-2 border-[#16a34a] animate-ping opacity-20 pointer-events-none" />
      </button>
      <AIChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
