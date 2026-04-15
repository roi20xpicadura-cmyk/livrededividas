import { lazy, Suspense, useState, useEffect, memo } from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";
import { AppErrorBoundary } from "@/components/app/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/app/SplashScreen";

// Lazy-loaded routes
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermosDeUsoPage = lazy(() => import("./pages/TermosDeUsoPage"));
const PoliticaPrivacidadePage = lazy(() => import("./pages/PoliticaPrivacidadePage"));
const PoliticaCookiesPage = lazy(() => import("./pages/PoliticaCookiesPage"));
const LGPDPage = lazy(() => import("./pages/LGPDPage"));
const SegurancaPage = lazy(() => import("./pages/SegurancaPage"));
const SobrePage = lazy(() => import("./pages/SobrePage"));

const AppLayout = lazy(() => import("./components/app/AppLayout"));
const OverviewPage = lazy(() => import("./pages/app/OverviewPage"));
const TransactionsPage = lazy(() => import("./pages/app/TransactionsPage"));
const GoalsPage = lazy(() => import("./pages/app/GoalsPage"));
const DebtsPage = lazy(() => import("./pages/app/DebtsPage"));
const CardsPage = lazy(() => import("./pages/app/CardsPage"));
const BudgetPage = lazy(() => import("./pages/app/BudgetPage"));
const AchievementsPage = lazy(() => import("./pages/app/AchievementsPage"));
const ReferralPage = lazy(() => import("./pages/app/ReferralPage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));
const BillingPage = lazy(() => import("./pages/app/BillingPage"));
const IntegrationsPage = lazy(() => import("./pages/app/IntegrationsPage"));
const SimulatorPage = lazy(() => import("./pages/app/SimulatorPage"));
const PredictionsPage = lazy(() => import("./pages/app/PredictionsPage"));
const ExportPage = lazy(() => import("./pages/app/ExportPage").then(m => ({ default: m.ExportPage })));
const ChartsPage = lazy(() => import("./pages/app/ChartsPage"));
const InvestmentsPage = lazy(() => import("./pages/app/InvestmentsPage"));
const DREPage = lazy(() => import("./pages/app/DREPage"));

// Optimized QueryClient with stale time and dedup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min — avoid refetching on every mount
      gcTime: 1000 * 60 * 10,   // 10 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
      <div className="flex flex-col items-center" style={{ gap: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton-shimmer" style={{ width: 120, height: 12, borderRadius: 6 }} />
      </div>
    </div>
  );
});

// Prefetch common app routes after initial load
function usePrefetchAppRoutes() {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Prefetch the most visited pages after 2s idle
      import("./pages/app/OverviewPage");
      import("./pages/app/TransactionsPage");
      import("./pages/app/GoalsPage");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    return isStandalone;
  });

  usePrefetchAppRoutes();

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <AppErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnimatePresence>
          {showSplash && <SplashScreen key="splash" />}
        </AnimatePresence>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
                  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                  <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/termos-de-uso" element={<TermosDeUsoPage />} />
                  <Route path="/politica-de-privacidade" element={<PoliticaPrivacidadePage />} />
                  <Route path="/politica-de-cookies" element={<PoliticaCookiesPage />} />
                  <Route path="/lgpd" element={<LGPDPage />} />
                  <Route path="/seguranca" element={<SegurancaPage />} />
                  <Route path="/sobre" element={<SobrePage />} />

                  {/* Protected app routes */}
                  <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route index element={<OverviewPage />} />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="goals" element={<GoalsPage />} />
                    <Route path="debts" element={<DebtsPage />} />
                    <Route path="budget" element={<BudgetPage />} />
                    <Route path="cards" element={<CardsPage />} />
                    <Route path="export" element={<Suspense fallback={<PageSkeleton />}><ExportPage /></Suspense>} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="integrations" element={<IntegrationsPage />} />
                    <Route path="achievements" element={<AchievementsPage />} />
                    <Route path="referral" element={<ReferralPage />} />
                    <Route path="simulator" element={<SimulatorPage />} />
                    <Route path="predictions" element={<PredictionsPage />} />
                    <Route path="charts" element={<ChartsPage />} />
                    <Route path="investments" element={<InvestmentsPage />} />
                    <Route path="dre" element={<DREPage />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
    </AppErrorBoundary>
  );
};

export default App;
