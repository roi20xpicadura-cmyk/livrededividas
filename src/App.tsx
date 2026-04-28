import type { ComponentType } from "react";
import { Suspense, useState, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import LandingPage from "./pages/LandingPage";
import { isNativeApp } from "@/lib/platform";

// Rotas usam retries mas SEM fallback pra null — se o chunk realmente
// não carregar, é melhor o ErrorBoundary aparecer do que uma tela em branco.
const lazy = <T extends ComponentType<any>>(imp: () => Promise<{ default: T }>) =>
  lazyWithRetry(imp, { fallbackToEmpty: false });
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppErrorBoundary } from "@/components/app/ErrorBoundary";
import SplashScreen from "@/components/app/SplashScreen";
import SWUpdateBanner from "@/components/app/SWUpdateBanner";
import LogoLoader from "@/components/app/LogoLoader";

// Rotas públicas críticas ficam eager-loaded para evitar tela branca por
// chunk antigo/falha de lazy import justamente na landing e login.
const PricingPage = lazy(() => import("./pages/PricingPage"));
const TermosDeUsoPage = lazy(() => import("./pages/TermosDeUsoPage"));
const PoliticaPrivacidadePage = lazy(() => import("./pages/PoliticaPrivacidadePage"));
const PoliticaCookiesPage = lazy(() => import("./pages/PoliticaCookiesPage"));
const LGPDPage = lazy(() => import("./pages/LGPDPage"));
const SegurancaPage = lazy(() => import("./pages/SegurancaPage"));
const SobrePage = lazy(() => import("./pages/SobrePage"));
const PrivacidadePage = lazy(() => import("./pages/PrivacidadePage"));
const AuthenticatedRoutes = lazy(() => import("./routes/AuthenticatedRoutes"));

// QueryClient otimizado: staleTime maior reduz refetches em troca de tela
// e em remounts (drawer abre/fecha, navegação volta).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 min — dashboard financeiro não muda a cada segundo
      gcTime: 1000 * 60 * 15,          // 15 min — mantém cache mais tempo na memória
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',    // só refetch quando volta o net
      refetchOnMount: false,           // confia no cache fresco
    },
  },
});

function PageSkeleton() {
  // Evita o flash do LogoLoader fullscreen em navega\u00e7\u00f5es r\u00e1pidas
  // (chunks j\u00e1 em cache resolvem em < 150ms). S\u00f3 mostra se realmente demorar.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 220);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return <LogoLoader />;
}

// Prefetch de páginas mais comuns da área autenticada — UMA vez só (em vez
// de a cada navegação). Usa requestIdleCallback pra não competir com pintura.
let didPrefetchAuthChunks = false;
function AuthenticatedRoutePrefetcher() {
  const location = useLocation();

  useEffect(() => {
    if (didPrefetchAuthChunks) return;
    const isAuthenticatedArea = location.pathname === "/app"
      || location.pathname.startsWith("/app/")
      || location.pathname === "/admin"
      || location.pathname.startsWith("/admin/");
    if (!isAuthenticatedArea) return;

    didPrefetchAuthChunks = true;
    const run = () => {
      void import("./pages/app/OverviewPage");
      void import("./pages/app/TransactionsPage");
      void import("./pages/app/GoalsPage");
      void import("./pages/app/SettingsPage");
      void import("./pages/app/CardsPage");
      void import("./pages/app/BudgetPage");
      void import("./pages/app/DebtsPage");
      void import("./pages/app/AchievementsPage");
      void import("./pages/app/CategoriesPage");
      void import("./pages/app/InvestmentsPage");
      void import("./pages/app/SubscriptionsPage");
      void import("./pages/app/BillingPage");
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(run, { timeout: 3000 });
    } else {
      setTimeout(run, 2000);
    }
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
    // Esconde a splash assim que a primeira pintura acontecer:
    //   1) rAF aninhado garante que estamos depois do commit + paint do React.
    //   2) Se o navegador estiver "throttled" (aba em background), um fail-safe
    //      absoluto de 3.5s evita o usuário ficar preso.
    let raf1 = 0;
    let raf2 = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setShowSplash(false);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(finish);
    });

    const failSafe = setTimeout(finish, 3500);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(failSafe);
    };
  }, [showSplash]);

  return (
    <AppErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SWUpdateBanner />
        {showSplash && <SplashScreen />}
         <BrowserRouter>
            <AuthenticatedRoutePrefetcher />
           <Suspense fallback={<PageSkeleton />}>
             <Routes>
               {/* No app nativo (Play Store), pular landing e pricing — política do Google
                   proíbe vendas via gateway externo (Hotmart) dentro do app. */}
               <Route
                 path="/"
                 element={isNativeApp() ? <Navigate to="/login" replace /> : <LandingPage />}
               />
               <Route
                 path="/pricing"
                 element={isNativeApp() ? <Navigate to="/login" replace /> : <PricingPage />}
               />
               <Route path="/termos-de-uso" element={<TermosDeUsoPage />} />
               <Route path="/politica-de-privacidade" element={<PoliticaPrivacidadePage />} />
               <Route path="/politica-de-cookies" element={<PoliticaCookiesPage />} />
               <Route path="/lgpd" element={<LGPDPage />} />
               <Route path="/seguranca" element={<SegurancaPage />} />
               <Route path="/sobre" element={<SobrePage />} />
               <Route path="/privacidade" element={<PrivacidadePage />} />
                <Route path="/*" element={<AuthenticatedRoutes />} />
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
