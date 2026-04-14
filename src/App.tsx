import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PricingPage from "./pages/PricingPage";
import NotFound from "./pages/NotFound";

import AppLayout from "./components/app/AppLayout";
import OverviewPage from "./pages/app/OverviewPage";
import TransactionsPage from "./pages/app/TransactionsPage";
import GoalsPage from "./pages/app/GoalsPage";
import { CashFlowPage, DREPage, InvestmentsPage, ChartsPage, ExportPage } from "./pages/app/GatedPages";
import SettingsPage from "./pages/app/SettingsPage";
import BillingPage from "./pages/app/BillingPage";
import DebtsPage from "./pages/app/DebtsPage";
import CardsPage from "./pages/app/CardsPage";
import BudgetPage from "./pages/app/BudgetPage";
import AchievementsPage from "./pages/app/AchievementsPage";
import ReferralPage from "./pages/app/ReferralPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/pricing" element={<PricingPage />} />

              {/* Protected app routes */}
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<OverviewPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="debts" element={<DebtsPage />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="cashflow" element={<CashFlowPage />} />
                <Route path="dre" element={<DREPage />} />
                <Route path="cards" element={<CardsPage />} />
                <Route path="investments" element={<InvestmentsPage />} />
                <Route path="charts" element={<ChartsPage />} />
                <Route path="export" element={<ExportPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="achievements" element={<AchievementsPage />} />
                <Route path="referral" element={<ReferralPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
