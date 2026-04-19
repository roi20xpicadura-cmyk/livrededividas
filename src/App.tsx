import type { ComponentType } from "react";
import { Suspense, useState, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import LandingPage from "./pages/LandingPage";

// Rotas usam retries mas SEM fallback pra null — se o chunk realmente
// não carregar, é melhor o ErrorBoundary aparecer do que uma tela em branco.
const lazy = <T extends ComponentType<any>>(imp: () => Promise<{ default: T }>) =>
  lazyWithRetry(imp, { fallbackToEmpty: false });
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppErrorBoundary } from "@/components/app/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/app/SplashScreen";
import SWUpdateBanner from "@/components/app/SWUpdateBanner";
import LogoLoader from "@/components/app/LogoLoader";

// Rotas públicas críticas ficam eager-loaded para evitar tela branca por
// chunk antigo/falha de lazy import justamente na landing e login.
const PricingPage = lazy(() => import("./pages/PricingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermosDeUsoPage = lazy(() => import("./pages/TermosDeUsoPage"));
const PoliticaPrivacidadePage = lazy(() => import("./pages/PoliticaPrivacidadePage"));
const PoliticaCookiesPage = lazy(() => import("./pages/PoliticaCookiesPage"));
const LGPDPage = lazy(() => import("./pages/LGPDPage"));
const SegurancaPage = lazy(() => import("./pages/SegurancaPage"));
const SobrePage = lazy(() => import("./pages/SobrePage"));
const PrivacidadePage = lazy(() => import("./pages/PrivacidadePage"));
const AuthenticatedRoutes = lazy(() => import("./routes/AuthenticatedRoutes"));

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

function PageSkeleton() {
  return <LogoLoader />;
}

// Só fazemos prefetch dentro da área autenticada.
// Na landing, isso podia puxar chunks do app cedo demais e disparar erros de boot.
function AuthenticatedRoutePrefetcher() {
  const location = useLocation();

  useEffect(() => {
    const isAuthenticatedArea = location.pathname === "/app"
      || location.pathname.startsWith("/app/")
      || location.pathname === "/admin"
      || location.pathname.startsWith("/admin/");

    if (!isAuthenticatedArea) return;

    const timer = setTimeout(() => {
      import("./pages/app/OverviewPage");
      import("./pages/app/TransactionsPage");
      import("./pages/app/GoalsPage");
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      return isStandalone;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!showSplash) return;
    // Splash normal: 1.8s. Fail-safe absoluto: 3.5s — se algo segurar o
    // unmount (raro), garante que o usuário nunca fica preso na splash.
    const t1 = setTimeout(() => setShowSplash(false), 1800);
    const t2 = setTimeout(() => setShowSplash(false), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showSplash]);

  return (
    <AppErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SWUpdateBanner />
        <AnimatePresence>
          {showSplash && <SplashScreen key="splash" />}
        </AnimatePresence>
         <BrowserRouter>
            <AuthenticatedRoutePrefetcher />
           <Suspense fallback={<PageSkeleton />}>
             <Routes>
               <Route path="/" element={<LandingPage />} />
               <Route path="/pricing" element={<PricingPage />} />
               <Route path="/termos-de-uso" element={<TermosDeUsoPage />} />
               <Route path="/politica-de-privacidade" element={<PoliticaPrivacidadePage />} />
               <Route path="/politica-de-cookies" element={<PoliticaCookiesPage />} />
               <Route path="/lgpd" element={<LGPDPage />} />
               <Route path="/seguranca" element={<SegurancaPage />} />
               <Route path="/sobre" element={<SobrePage />} />
               <Route path="/privacidade" element={<PrivacidadePage />} />
               <Route path="/login/*" element={<AuthenticatedRoutes />} />
               <Route path="/register/*" element={<AuthenticatedRoutes />} />
               <Route path="/forgot-password/*" element={<AuthenticatedRoutes />} />
               <Route path="/reset-password/*" element={<AuthenticatedRoutes />} />
               <Route path="/app/*" element={<AuthenticatedRoutes />} />
               <Route path="/admin/*" element={<AuthenticatedRoutes />} />
               <Route path="*" element={<NotFound />} />
             </Routes>
           </Suspense>
         </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
    </AppErrorBoundary>
  );
};

export default App;
