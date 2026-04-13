import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { BarChart3, Receipt, Target, TrendingUp, FileText, CreditCard, PiggyBank, BarChart2, Download, Settings, Gem, LogOut, Menu, X, Bell } from 'lucide-react';

const ALL_NAV_ITEMS = [
  { label: 'Visão Geral', path: '/app', icon: BarChart3, profiles: ['personal', 'business', 'both'] },
  { label: 'Lançamentos', path: '/app/transactions', icon: Receipt, profiles: ['personal', 'business', 'both'] },
  { label: 'Metas', path: '/app/goals', icon: Target, profiles: ['personal', 'business', 'both'] },
  { label: 'Fluxo de Caixa', path: '/app/cashflow', icon: TrendingUp, profiles: ['business', 'both'] },
  { label: 'DRE', path: '/app/dre', icon: FileText, profiles: ['business', 'both'] },
  { label: 'Cartões', path: '/app/cards', icon: CreditCard, profiles: ['personal', 'business', 'both'] },
  { label: 'Investimentos', path: '/app/investments', icon: PiggyBank, profiles: ['personal', 'business', 'both'] },
  { label: 'Gráficos', path: '/app/charts', icon: BarChart2, profiles: ['business', 'both'] },
  { label: 'Exportar', path: '/app/export', icon: Download, profiles: ['personal', 'business', 'both'] },
];

const bottomItems = [
  { label: 'Configurações', path: '/app/settings', icon: Settings },
  { label: 'Meu Plano', path: '/app/billing', icon: Gem },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { profile, config, loading, refetch } = useProfile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'business' | 'personal'>('all');

  const profileType = config?.profile_type || 'personal';
  const navItems = ALL_NAV_ITEMS.filter(item => item.profiles.includes(profileType));

  useEffect(() => {
    if (!loading && config && !config.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [loading, config]);

  const planBadge = (profile?.plan || 'free').toUpperCase();
  const planColor = profile?.plan === 'pro' ? 'bg-primary text-primary-foreground' : profile?.plan === 'business' ? 'bg-fin-purple text-white' : 'bg-secondary text-secondary-foreground';

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const pageTitles: Record<string, string> = {
    '/app': 'Visão Geral',
    '/app/transactions': 'Lançamentos',
    '/app/goals': 'Metas',
    '/app/cashflow': 'Fluxo de Caixa',
    '/app/dre': 'DRE',
    '/app/cards': 'Cartões de Crédito',
    '/app/investments': 'Investimentos',
    '/app/charts': 'Gráficos',
    '/app/export': 'Exportar',
    '/app/settings': 'Configurações',
    '/app/billing': 'Planos e Assinatura',
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => { setShowOnboarding(false); refetch(); }} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-60 bg-card border-r border-border flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-black text-foreground text-sm">FinDash Pro</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${planColor}`}>{planBadge}</span>
          </div>

          {/* Profile type toggle for 'both' */}
          {profileType === 'both' && (
            <div className="flex rounded-lg bg-secondary p-0.5 mb-3">
              {[
                { val: 'all' as const, label: '📊 Tudo' },
                { val: 'personal' as const, label: '🏠 Pessoal' },
                { val: 'business' as const, label: '💼 Negócio' },
              ].map(f => (
                <button key={f.val} onClick={() => setViewFilter(f.val)}
                  className={`flex-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${viewFilter === f.val ? 'bg-card text-foreground shadow-sm' : 'text-muted'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-fin-green-pale flex items-center justify-center text-fin-green font-bold text-xs">
              {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-[10px] text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 mb-0.5 ${
                isActive(item.path)
                  ? 'bg-fin-green-pale text-fin-green-dark border-l-[3px] border-primary'
                  : 'text-muted hover:bg-secondary hover:text-foreground'
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          {bottomItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 mb-0.5 ${
                isActive(item.path)
                  ? 'bg-fin-green-pale text-fin-green-dark border-l-[3px] border-primary'
                  : 'text-muted hover:bg-secondary hover:text-foreground'
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
          <button onClick={() => { signOut(); }} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-destructive hover:bg-fin-red-pale transition-all w-full">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-card border-b border-border h-14 flex items-center px-4 md:px-6 gap-4">
          <button className="lg:hidden text-muted" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="font-extrabold text-foreground text-lg">{pageTitles[location.pathname] || 'FinDash Pro'}</h1>
          <div className="ml-auto flex items-center gap-3">
            <Bell className="w-4 h-4 text-muted" />
          </div>
        </header>

        {profile?.plan === 'free' && (
          <div className="mx-4 md:mx-6 mt-4 p-3 rounded-lg bg-fin-amber-pale border border-fin-amber-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Você está no plano Gratuito. Upgrade para Pro e libere recursos ilimitados.</span>
            <Link to="/app/billing" className="px-3 py-1 rounded-md bg-fin-amber text-white text-xs font-bold hover:brightness-110 transition-all">Ver planos</Link>
          </div>
        )}

        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
