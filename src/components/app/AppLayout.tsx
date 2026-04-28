import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import OnboardingChat from '@/components/onboarding/OnboardingChat';
// AIChatDrawer is a heavy component; lazy-load it so it only loads when opened.
const AIChatDrawer = lazy(() => import('@/components/app/AIChatDrawer'));
import OfflineBanner from '@/components/app/OfflineBanner';
import QuickAddFAB from '@/components/app/QuickAddFAB';
import InnerPageSkeleton from '@/components/app/InnerPageSkeleton';
import icon from '@/assets/korafinance-icon.png';
import {
  LayoutDashboard, ArrowLeftRight, Target, TrendingUp, FileText,
  CreditCard, Briefcase, BarChart2, Settings2, Crown,
  LogOut, Menu, X, Bell, ChevronRight, Home, MoreHorizontal,
  AlertCircle, CalendarDays, Trophy, Gift, Sun, Moon, Plus, Building2, Plug, FlaskConical, Lock, Repeat, Sparkles, PieChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  profiles: string[];
  emoji?: string;
  comingSoon?: boolean;
  badge?: string;
};

type AccountItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  profiles?: string[];
};

type MobileNavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  activeColor: string;
};

// Note: 'Lançamentos' is rendered specially per profile_type (see navItems memo below).
const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Visão Geral', path: '/app', icon: LayoutDashboard, profiles: ['personal', 'business', 'both'] },
  { label: 'Lançamentos', path: '/app/transactions', icon: ArrowLeftRight, profiles: ['personal', 'business'] },
  { label: 'Lançamentos Pessoais', path: '/app/transactions/personal', icon: Home, profiles: ['both'], emoji: '🏠' },
  { label: 'Lançamentos Negócio', path: '/app/transactions/business', icon: Briefcase, profiles: ['both'], emoji: '💼' },
  { label: 'Orçamento', path: '/app/budget', icon: CalendarDays, profiles: ['personal', 'business', 'both'] },
  { label: 'Metas', path: '/app/goals', icon: Target, profiles: ['personal', 'both'] },
  { label: 'Dívidas', path: '/app/debts', icon: AlertCircle, profiles: ['personal', 'both'] },
  { label: 'Cartões', path: '/app/cards', icon: CreditCard, profiles: ['personal', 'business', 'both'], comingSoon: true },
  { label: 'Assinaturas', path: '/app/subscriptions', icon: Repeat, profiles: ['personal', 'business', 'both'], badge: 'NOVO' },
  { label: 'Investimentos', path: '/app/investments', icon: TrendingUp, profiles: ['personal', 'business', 'both'], comingSoon: true },
  { label: 'Gráficos', path: '/app/charts', icon: BarChart2, profiles: ['personal', 'business', 'both'] },
  { label: 'Categorias', path: '/app/categorias', icon: PieChart, profiles: ['personal', 'business', 'both'], badge: 'NOVO' },
  { label: 'DRE', path: '/app/dre', icon: FileText, profiles: ['business', 'both'], comingSoon: true },
  { label: 'Integrações', path: '/app/integrations', icon: Plug, profiles: ['personal', 'business', 'both'] },
  { label: 'Simulador', path: '/app/simulator', icon: FlaskConical, profiles: ['personal', 'business', 'both'], badge: 'NOVO' },
  { label: 'Previsões', path: '/app/predictions', icon: Building2, profiles: ['personal', 'business', 'both'] },

];

const ACCOUNT_ITEMS: AccountItem[] = [
  { label: 'Conquistas', path: '/app/achievements', icon: Trophy, profiles: ['personal', 'both'] },
  { label: 'Indicar Amigos', path: '/app/referral', icon: Gift },
  { label: 'Configurações', path: '/app/settings', icon: Settings2 },
  { label: 'Meu Plano', path: '/app/billing', icon: Crown },
];

const MOBILE_NAV_PERSONAL: MobileNavItem[] = [
  { label: 'Início', path: '/app', icon: Home, activeColor: '#7C3AED' },
  { label: 'Lançar', path: '/app/transactions', icon: ArrowLeftRight, activeColor: '#2563eb' },
  { label: '', path: 'fab', icon: Plus, activeColor: '#7C3AED' },
  { label: 'Metas', path: '/app/goals', icon: Target, activeColor: '#7c3aed' },
  { label: 'Mais', path: 'more', icon: MoreHorizontal, activeColor: '#64748b' },
];

const MOBILE_NAV_BOTH: MobileNavItem[] = [
  { label: 'Início', path: '/app', icon: Home, activeColor: '#7C3AED' },
  { label: 'Pessoal', path: '/app/transactions/personal', icon: Home, activeColor: '#7C3AED' },
  { label: '', path: 'fab', icon: Plus, activeColor: '#7C3AED' },
  { label: 'Negócio', path: '/app/transactions/business', icon: Briefcase, activeColor: '#2563eb' },
  { label: 'Mais', path: 'more', icon: MoreHorizontal, activeColor: '#64748b' },
];

const MOBILE_NAV_BUSINESS: MobileNavItem[] = [
  { label: 'Início', path: '/app', icon: Home, activeColor: '#7C3AED' },
  { label: 'Lançar', path: '/app/transactions', icon: ArrowLeftRight, activeColor: '#2563eb' },
  { label: '', path: 'fab', icon: Plus, activeColor: '#7C3AED' },
  { label: 'Cartões', path: '/app/cards', icon: CreditCard, activeColor: '#7c3aed' },
  { label: 'Mais', path: 'more', icon: MoreHorizontal, activeColor: '#64748b' },
];

const PAGE_TITLES: Record<string, string> = {
  '/app': 'Visão Geral',
  '/app/transactions': 'Lançamentos',
  '/app/transactions/personal': 'Lançamentos Pessoais',
  '/app/transactions/business': 'Lançamentos Negócio',
  '/app/budget': 'Orçamento',
  '/app/goals': 'Metas',
  '/app/debts': 'Sair das Dívidas',
  '/app/cards': 'Cartões de Crédito',
  '/app/investments': 'Investimentos',
  '/app/charts': 'Gráficos',
  '/app/categorias': 'Categorias',
  '/app/dre': 'DRE',
  '/app/export': 'Exportar',
  '/app/achievements': 'Conquistas',
  '/app/referral': 'Indicar Amigos',
  '/app/settings': 'Configurações',
  '/app/integrations': 'Integrações',
  '/app/billing': 'Planos e Assinatura',
  '/app/simulator': 'Simulador E Se...?',
  '/app/predictions': 'IA Preditiva',
  '/app/subscriptions': 'Assinaturas',
};

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { profile, config, loading, refetch } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeDebtCount, setActiveDebtCount] = useState(0);
  // (FAB flutuante de IA removido — atalho fica no header da seção "IA Financeira".)

  useEffect(() => {
    if (!user) return;
    supabase.from('debts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active')
      .then(({ count }) => setActiveDebtCount(count || 0));
  }, [user, location.pathname]);

  const profileType = config?.profile_type || 'personal';
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => item.profiles.includes(profileType));
  const navItems = visibleNavItems.filter(item => !item.comingSoon);
  const comingSoonItems = visibleNavItems.filter(item => item.comingSoon);
  const MOBILE_NAV =
    profileType === 'both' ? MOBILE_NAV_BOTH :
    profileType === 'business' ? MOBILE_NAV_BUSINESS :
    MOBILE_NAV_PERSONAL;
  const accountItems = ACCOUNT_ITEMS.filter(item => !item.profiles || item.profiles.includes(profileType));
  const plan = profile?.plan || 'free';

  useEffect(() => {
    if (!loading && config && !config.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [loading, config]);

  // Close overlays/menus on route change to avoid stuck dropdowns
  useEffect(() => {
    setShowUserMenu(false);
    setShowMoreDrawer(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const planBadge = plan.toUpperCase();
  const planBadgeStyle = plan === 'pro'
    ? { background: 'var(--color-green-50)', color: 'var(--color-green-800)', border: '1px solid var(--color-green-200)' }
    : plan === 'business'
    ? { background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' }
    : { background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-base)' };

  const initial = (profile?.full_name || user?.email || '?')[0].toUpperCase();

  if (showOnboarding) {
    return <OnboardingChat onComplete={() => { setShowOnboarding(false); refetch(); }} />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg-base)' }}>
      <OfflineBanner />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(4px)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ SIDEBAR (desktop/tablet) ═══ */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: 256,
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border-weak)',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 0' }}>
          <div className="flex items-center" style={{ height: 44, gap: 10 }}>
            <img src={icon} alt="KoraFinance" className="flex-shrink-0" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text-strong)' }}>KoraFinance</span>
            <span className="ml-auto" style={{ ...planBadgeStyle, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 'var(--radius-md)', letterSpacing: '0.5px' }}>
              {planBadge}
            </span>
          </div>

          {/* User card */}
          <button
            onClick={() => navigate('/app/settings')}
            className="w-full flex items-center text-left transition-all duration-150"
            style={{
              marginTop: 12,
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border-weak)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 12px',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <div className="relative flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-green-600), var(--color-green-900))' }}>
                  <span className="text-white" style={{ fontSize: 13, fontWeight: 800 }}>{initial}</span>
                </div>
              )}
              <div className="absolute" style={{ bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--color-bg-sunken)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-base)' }}>{profile?.full_name || 'Usuário'}</p>
              <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{user?.email}</p>
            </div>
            <ChevronRight style={{ width: 14, height: 14, color: 'var(--color-text-subtle)', flexShrink: 0 }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: '12px 10px' }}>
          <p className="label-upper" style={{ padding: '8px 8px 4px' }}>MENU</p>
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className="flex items-center relative transition-all duration-150"
                style={{
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 'var(--radius-lg)',
                  gap: 10,
                  marginBottom: 1,
                  cursor: 'pointer',
                  background: active ? 'var(--color-green-50)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget.style.background = 'var(--color-bg-sunken)'); }}
                onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
              >
                {active && (
                  <div className="absolute left-0" style={{ top: 6, bottom: 6, width: 3, background: 'var(--color-green-600)', borderRadius: '0 3px 3px 0' }} />
                )}
                <div className="flex items-center justify-center flex-shrink-0" style={{
                  width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                  background: active ? 'var(--color-green-100)' : 'transparent',
                }}>
                  <item.icon style={{
                    width: 16, height: 16,
                    color: item.path === '/app/debts' && activeDebtCount > 0
                      ? 'var(--color-danger-solid)'
                      : active ? 'var(--color-green-700)' : 'var(--color-text-muted)',
                  }} />
                </div>
                <span className="flex-1" style={{
                  fontSize: 13,
                  fontWeight: active ? 700 : 600,
                  color: active ? 'var(--color-green-800)' : 'var(--color-text-base)',
                }}>{item.label}</span>
                {item.badge && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: '#fbbf24', color: '#78350f', padding: '2px 7px', borderRadius: 99 }}>{item.badge}</span>
                )}
                {item.path === '/app/debts' && activeDebtCount > 0 && (
                  <span className="ml-auto text-center" style={{
                    fontSize: 10, fontWeight: 800,
                    background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)',
                    padding: '2px 7px', borderRadius: 'var(--radius-full)', minWidth: 18,
                  }}>{activeDebtCount}</span>
                )}
              </Link>
            );
          })}

          {comingSoonItems.length > 0 && (
            <>
              <p
                className="label-upper"
                style={{
                  padding: '14px 8px 4px',
                  color: 'var(--color-text-subtle)',
                  opacity: 0.6,
                }}
              >
                EM BREVE
              </p>
              {comingSoonItems.map(item => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() =>
                    toast(`Módulo de ${item.label.toLowerCase()} chegando em breve! 🚀`)
                  }
                  className="flex items-center w-full text-left transition-all duration-150"
                  style={{
                    height: 38,
                    padding: '0 10px',
                    borderRadius: 'var(--radius-lg)',
                    gap: 10,
                    marginBottom: 1,
                    background: 'transparent',
                    opacity: 0.45,
                    cursor: 'not-allowed',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.65'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.45'; }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)' }}
                  >
                    <item.icon style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
                  </div>
                  <span
                    className="flex-1"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="flex items-center"
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      background: 'var(--color-bg-sunken)',
                      color: 'var(--color-text-subtle)',
                      padding: '2px 7px',
                      borderRadius: 99,
                      border: '1px solid var(--color-border-weak)',
                      gap: 3,
                    }}
                  >
                    <Lock style={{ width: 9, height: 9 }} />
                    Em breve
                  </span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '0 10px 10px' }}>
          {/* Gamification strip */}
          <div className="flex items-center" style={{ height: 44, padding: '0 14px', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-base)' }}>🔥 {(config?.streak_days || 0) === 0 ? 'Comece hoje!' : `${config?.streak_days} dias seguidos`}</span>
            <div className="flex-1" style={{ height: 3, background: 'var(--color-border-weak)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(((config?.xp_points || 0) % 100), 100)}%`, background: 'var(--color-green-500)', borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>Nv {config?.level || '1'}</span>
          </div>

          {/* Upgrade card */}
          {plan === 'free' && (
            <div style={{
              margin: '0 4px 8px',
              background: 'var(--color-green-50)',
              border: '1px solid var(--color-green-200)',
              borderRadius: 'var(--radius-xl)',
              padding: 14,
            }}>
              <Crown style={{ width: 18, height: 18, color: 'var(--color-warning-solid)', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-green-800)' }}>Fazer Upgrade</p>
              <p style={{ fontSize: 11, color: 'var(--color-green-700)', lineHeight: 1.5 }}>Lançamentos ilimitados e muito mais.</p>
              <Link to="/app/billing" onClick={() => setSidebarOpen(false)}
                className="block text-center transition-colors"
                style={{
                  marginTop: 10, background: 'var(--color-green-600)', color: 'white',
                  fontSize: 12, fontWeight: 700, borderRadius: 'var(--radius-lg)', height: 34,
                  lineHeight: '34px',
                }}>
                Ver planos →
              </Link>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--color-border-weak)', margin: '0 10px 4px' }} />
          <p className="label-upper" style={{ padding: '8px 8px 4px' }}>CONTA</p>

          {accountItems.map(item => {
            const active = isActive(item.path);
            const isBilling = item.path === '/app/billing';
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className="flex items-center transition-all duration-150"
                style={{
                  height: 38, padding: '0 10px', borderRadius: 'var(--radius-lg)', gap: 10, marginBottom: 1,
                  background: active ? 'var(--color-green-50)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget.style.background = 'var(--color-bg-sunken)'); }}
                onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
              >
                <item.icon style={{ width: 15, height: 15, color: active ? 'var(--color-green-600)' : isBilling && plan !== 'free' ? 'var(--color-warning-solid)' : 'var(--color-text-subtle)' }} />
                <span className="flex-1" style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--color-green-800)' : 'var(--color-text-muted)' }}>{item.label}</span>
                {isBilling && plan === 'free' && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', padding: '2px 7px', borderRadius: 5 }}>Upgrade</span>
                )}
              </Link>
            );
          })}

          <button onClick={() => signOut()}
            className="flex items-center w-full transition-all duration-150 group"
            style={{ height: 38, padding: '0 10px', borderRadius: 'var(--radius-lg)', gap: 10 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut style={{ width: 15, height: 15, color: 'var(--color-text-subtle)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>Sair</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ paddingBottom: isMobile ? 80 : 0 }}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center glass" style={{
          height: isMobile ? 56 : 58,
          borderBottom: '1px solid var(--color-border-weak)',
          padding: isMobile ? '0 16px' : '0 28px',
          gap: 16,
        }}>
          {/* Mobile: hamburger */}
          <button className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu" style={{ color: 'var(--color-text-muted)' }}>
            {sidebarOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>

          {/* Mobile: logo */}
          {isMobile && (
            <div className="flex items-center" style={{ gap: 6 }}>
              <img src={icon} alt="KoraFinance" style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)' }}>KoraFinance</span>
            </div>
          )}

          {/* Desktop: page title */}
          {!isMobile && (
            <div className="min-w-0">
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                {PAGE_TITLES[location.pathname] || 'KoraFinance'}
              </h1>
              <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                KoraFinance / {PAGE_TITLES[location.pathname] || ''}
              </p>
            </div>
          )}

          <div className="ml-auto flex items-center" style={{ gap: 8 }}>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="flex items-center justify-center transition-all duration-150"
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: 'transparent', border: '1px solid var(--color-border-base)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-sunken)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {resolvedTheme === 'dark'
                ? <Sun style={{ width: 16, height: 16, color: '#fbbf24' }} />
                : <Moon style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />}
            </button>

            <button aria-label="Notificações"
              className="flex items-center justify-center transition-all duration-150"
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: 'transparent', border: '1px solid var(--color-border-base)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-sunken)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Bell style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Menu do usuário"
                className="flex items-center justify-center transition-all duration-150 overflow-hidden"
                style={{ width: 36, height: 36, borderRadius: '50%', background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--color-green-600), var(--color-green-900))' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="text-white" style={{ fontSize: 13, fontWeight: 800 }}>{initial}</span>
                )}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 z-50 overflow-hidden"
                      style={{
                        top: 44, width: 224,
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-base)',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: 'var(--shadow-xl)',
                        padding: '4px 0',
                      }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-weak)' }}>
                        <p className="truncate" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-base)' }}>{profile?.full_name || 'Usuário'}</p>
                        <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{user?.email}</p>
                      </div>
                      {[
                        { label: 'Configurações', icon: Settings2, action: () => navigate('/app/settings') },
                        { label: 'Meu plano', icon: Crown, action: () => navigate('/app/billing') },
                      ].map(item => (
                        <button key={item.label} onClick={() => { item.action(); setShowUserMenu(false); }}
                          className="w-full flex items-center transition-colors"
                          style={{ gap: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-text-base)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-sunken)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <item.icon style={{ width: 16, height: 16, color: 'var(--color-text-subtle)' }} /> {item.label}
                        </button>
                      ))}
                      <div style={{ height: 1, background: 'var(--color-border-weak)', margin: '4px 0' }} />
                      <button onClick={() => { signOut(); setShowUserMenu(false); }}
                        className="w-full flex items-center transition-colors"
                        style={{ gap: 10, padding: '10px 14px', fontSize: 13, color: 'var(--color-danger-solid)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <LogOut style={{ width: 16, height: 16 }} /> Sair
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Mobile: page title below header */}
        {isMobile && location.pathname !== '/app' && (
          <div style={{ padding: '12px 16px 4px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-strong)', letterSpacing: '-0.3px' }}>
              {PAGE_TITLES[location.pathname] || 'KoraFinance'}
            </h1>
          </div>
        )}

        <main style={{ maxWidth: 1400, margin: '0 auto', width: '100%', padding: isMobile ? '8px 16px 112px' : '24px 28px' }}>
          <Suspense fallback={<InnerPageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center pb-safe glass" style={{
          height: 68,
          borderTop: '1px solid var(--color-border-weak)',
        }}>
          {MOBILE_NAV.map((item) => {
            if (item.path === 'fab') {
              return (
                <div key="fab" className="flex-1 flex items-center justify-center" style={{ marginTop: -24 }}>
                  <QuickAddFAB embedded />
                </div>
              );
            }
            const active = item.path !== 'more' && isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (item.path === 'more') setShowMoreDrawer(true);
                  else navigate(item.path);
                }}
                className="flex-1 flex flex-col items-center tap-target relative"
                style={{ gap: 2, WebkitTapHighlightColor: 'transparent' }}
              >
                <motion.div
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <item.icon style={{
                    width: 22, height: 22,
                    color: active ? item.activeColor : 'var(--color-text-subtle)',
                    strokeWidth: active ? 2.5 : 2,
                  }} />
                </motion.div>
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? item.activeColor : 'var(--color-text-subtle)',
                  letterSpacing: '0.2px',
                }}>{item.label}</span>
                {active && (
                  <motion.div layoutId="bottomNavDot"
                    style={{ width: 5, height: 5, borderRadius: '50%', background: item.activeColor, marginTop: 1 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* ═══ MOBILE "MAIS" BOTTOM SHEET ═══ */}
      <AnimatePresence>
        {showMoreDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-[520] md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowMoreDrawer(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[521] md:hidden overflow-y-auto pb-safe"
              style={{
                background: 'var(--color-bg-surface)',
                borderRadius: '24px 24px 0 0',
                maxHeight: '70vh',
                padding: '0 20px 20px',
                willChange: 'transform',
              }}>
              {/* Handle + Close */}
              <div className="sticky top-0 z-10 flex items-center justify-between" style={{ paddingTop: 12, paddingBottom: 12, background: 'var(--color-bg-surface)' }}>
                <div style={{ width: 40, height: 4, background: 'var(--color-border-strong)', borderRadius: 99, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 12 }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-strong)', marginTop: 12 }}>Mais opções</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowMoreDrawer(false); }} aria-label="Fechar" className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-sunken)', marginTop: 12 }}>
                  <X style={{ width: 18, height: 18, color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              {/* Grid of remaining nav items */}
              <div className="grid grid-cols-3" style={{ gap: 12 }}>
                {navItems.filter(i => !['fab','more'].includes(i.path) && !MOBILE_NAV.find(m => m.path === i.path)).map(item => {
                    const tileColors: Record<string, string> = {
                      '/app/cards': '#2563eb',
                      '/app/debts': '#dc2626',
                      '/app/budget': '#d97706', '/app/export': '#64748b',
                    };
                  const color = tileColors[item.path] || 'var(--color-text-muted)';
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setShowMoreDrawer(false)}
                      className="flex flex-col items-center transition-colors tap-target"
                      style={{
                        gap: 6, padding: '14px 8px', borderRadius: 'var(--radius-xl)',
                        background: 'var(--color-bg-sunken)',
                        border: '1px solid var(--color-border-weak)',
                      }}>
                      <div className="flex items-center justify-center" style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-lg)',
                        background: color + '18',
                      }}>
                        <item.icon style={{ width: 20, height: 20, color }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Account section */}
              <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border-weak)', paddingTop: 12 }}>
                {accountItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setShowMoreDrawer(false)}
                    className="flex items-center transition-colors"
                    style={{ gap: 12, padding: '12px 4px', fontSize: 14, fontWeight: 500, color: 'var(--color-text-base)', borderBottom: '1px solid var(--color-border-weak)' }}>
                    <item.icon style={{ width: 20, height: 20, color: 'var(--color-text-subtle)' }} />
                    {item.label}
                    <ChevronRight className="ml-auto" style={{ width: 16, height: 16, color: 'var(--color-text-disabled)' }} />
                  </Link>
                ))}
                <button onClick={() => { signOut(); setShowMoreDrawer(false); }}
                  className="flex items-center w-full"
                  style={{ gap: 12, padding: '12px 4px', fontSize: 14, fontWeight: 500, color: 'var(--color-danger-solid)' }}>
                  <LogOut style={{ width: 20, height: 20 }} />
                  Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* Floating "Conversar com Kora" button — disponível em todas as telas do app */}
      {!chatOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setChatOpen(true)}
          aria-label="Conversar com Kora"
          style={{
            position: 'fixed',
            right: 20,
            bottom: isMobile ? 88 : 24,
            zIndex: 50,
            width: 56,
            height: 56,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 48%))',
            boxShadow: '0 10px 30px hsl(262 83% 58% / 0.45), 0 4px 10px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <Sparkles style={{ width: 24, height: 24 }} />
        </motion.button>
      )}

      {/* AI Chat drawer */}
      <Suspense fallback={null}><AIChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} /></Suspense>
    </div>
  );
}
