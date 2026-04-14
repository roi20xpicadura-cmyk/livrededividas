import { lazy, Suspense } from "react";
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
const BanksPage = lazy(() => import("./pages/app/BanksPage"));

// Gated page lazy imports
const GatedCashFlow = lazy(() => import("./pages/app/GatedPages").then(m => ({ default: m.CashFlowPage })));
const GatedDRE = lazy(() => import("./pages/app/GatedPages").then(m => ({ default: m.DREPage })));
const GatedInvestments = lazy(() => import("./pages/app/GatedPages").then(m => ({ default: m.InvestmentsPage })));
const GatedCharts = lazy(() => import("./pages/app/GatedPages").then(m => ({ default: m.ChartsPage })));
const GatedExport = lazy(() => import("./pages/app/GatedPages").then(m => ({ default: m.ExportPage })));

const queryClient = new QueryClient();

function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
      <div className="flex flex-col items-center" style={{ gap: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton-shimmer" style={{ width: 120, height: 12, borderRadius: 6 }} />
      </div>
    </div>
  );
}

const App = () => (
  <AppErrorBoundary>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
                  <Route path="cashflow" element={<Suspense fallback={<PageSkeleton />}><GatedCashFlow /></Suspense>} />
                  <Route path="dre" element={<Suspense fallback={<PageSkeleton />}><GatedDRE /></Suspense>} />
                  <Route path="cards" element={<CardsPage />} />
                  <Route path="investments" element={<Suspense fallback={<PageSkeleton />}><GatedInvestments /></Suspense>} />
                  <Route path="charts" element={<Suspense fallback={<PageSkeleton />}><GatedCharts /></Suspense>} />
                  <Route path="export" element={<Suspense fallback={<PageSkeleton />}><GatedExport /></Suspense>} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="banks" element={<BanksPage />} />
                  <Route path="achievements" element={<AchievementsPage />} />
                  <Route path="referral" element={<ReferralPage />} />
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

export default App;

