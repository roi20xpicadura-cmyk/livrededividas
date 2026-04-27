import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FileText,
  Home,
  ListOrdered,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { demoStore } from './demoStore';
import DemoOverview from './screens/DemoOverview';
import DemoTransactions from './screens/DemoTransactions';
import DemoGoals from './screens/DemoGoals';
import DemoCards from './screens/DemoCards';
import DemoInvestments from './screens/DemoInvestments';
import DemoDRE from './screens/DemoDRE';

const TABS = [
  { key: 'overview',    label: 'Visão geral',    icon: Home },
  { key: 'transactions', label: 'Transações',    icon: ListOrdered },
  { key: 'goals',       label: 'Metas',          icon: Target },
  { key: 'cards',       label: 'Cartões',        icon: CreditCard },
  { key: 'investments', label: 'Investimentos',  icon: TrendingUp },
  { key: 'dre',         label: 'DRE',            icon: FileText },
] as const;

type TabKey = typeof TABS[number]['key'] | 'charts';

export default function LiveDemoSection() {
  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-white via-[#FAFAFE] to-white">
      {/* Background flair */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F3FF] text-[#7C3AED] text-[11px] md:text-[12px] font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" /> demo interativa · sem cadastro
          </div>
          <h2 className="text-[28px] md:text-[44px] leading-[1.05] font-[900] text-[#1A0D35] tracking-tight">
            O app de verdade.
            <span className="block bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] bg-clip-text text-transparent">
              Roda aqui na página.
            </span>
          </h2>
          <p className="mt-3 md:mt-4 text-[14px] md:text-[16px] text-[#4A3A6B] max-w-2xl mx-auto">
            Clique, navegue, lance uma transação, crie uma meta. Tudo em tempo real, com dados de exemplo. Quando criar sua conta, é assim — só que com seu dinheiro de verdade.
          </p>
        </div>

        {/* Browser frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[24px] overflow-hidden bg-white border border-[rgba(124,58,237,0.15)]"
          style={{ boxShadow: '0 30px 80px -20px rgba(76, 29, 149, 0.35), 0 8px 30px -6px rgba(124,58,237,0.12)' }}
        >
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#FAFAFE] border-b border-[rgba(124,58,237,0.10)]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 mx-3 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[rgba(124,58,237,0.10)]">
              <span className="w-3 h-3 rounded-full bg-[#16A34A] flex-shrink-0" />
              <span className="text-[11px] font-mono text-[#4A3A6B] truncate">app.korafinance.app/<span className="text-[#7C3AED] font-bold">{tab}</span></span>
            </div>
            <button
              onClick={() => demoStore.reset()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#7B6A9B] hover:text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors"
              title="Resetar demo"
            >
              <RefreshCw className="w-3 h-3" /> resetar
            </button>
          </div>

          {/* App body */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[600px] md:min-h-[680px]">
            {/* Sidebar (desktop) */}
            <aside className="hidden md:flex flex-col bg-gradient-to-b from-[#FAFAFE] to-white border-r border-[rgba(124,58,237,0.08)] p-3">
              <div className="flex items-center gap-2 px-2 py-3 mb-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex items-center justify-center text-white font-[900] text-[13px]">
                  K
                </div>
                <div>
                  <div className="text-[12.5px] font-[800] text-[#1A0D35] leading-tight">KoraFinance</div>
                  <div className="text-[9.5px] text-[#7B6A9B] uppercase tracking-wider font-bold">demo</div>
                </div>
              </div>
              <nav className="space-y-0.5 flex-1">
                {TABS.map((t) => {
                  const active = tab === t.key || (t.key === 'overview' && tab === 'charts');
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
                        active
                          ? 'bg-[#7C3AED] text-white shadow-sm'
                          : 'text-[#4A3A6B] hover:bg-[#F5F3FF] hover:text-[#7C3AED]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </nav>

              <div className="rounded-xl p-3 bg-gradient-to-br from-[#1A0D35] to-[#4C1D95] text-white">
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/60 mb-1">curtindo?</div>
                <p className="text-[11.5px] leading-snug mb-2">Cria sua conta e conecte seus bancos via Open Finance.</p>
                <Link
                  to="/register"
                  className="block w-full text-center py-1.5 rounded-lg bg-white text-[#1A0D35] text-[11px] font-[800] hover:bg-[#F5F3FF] transition-colors"
                >
                  Começar grátis →
                </Link>
              </div>
            </aside>

            {/* Mobile tabs */}
            <div className="md:hidden flex items-center gap-1 overflow-x-auto px-3 py-2 border-b border-[rgba(124,58,237,0.08)] bg-[#FAFAFE]">
              {TABS.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex-shrink-0 transition-colors ${
                      active ? 'bg-[#7C3AED] text-white' : 'text-[#4A3A6B] bg-white border border-[rgba(124,58,237,0.10)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <main className="relative overflow-hidden">
              <div className="p-4 md:p-6 max-h-[680px] md:max-h-[680px] overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tab === 'overview' && <DemoOverview onGo={(t) => setTab(t as TabKey)} />}
                    {tab === 'transactions' && <DemoTransactions />}
                    {tab === 'goals' && <DemoGoals />}
                    {tab === 'cards' && <DemoCards />}
                    {tab === 'investments' && <DemoInvestments />}
                    {tab === 'dre' && <DemoDRE />}
                    {tab === 'charts' && <DemoOverview onGo={(t) => setTab(t as TabKey)} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3.5 bg-gradient-to-r from-[#F5F3FF] to-white border-t border-[rgba(124,58,237,0.10)]">
            <div className="flex items-center gap-2 text-[12px] text-[#4A3A6B]">
              <BarChart3 className="w-4 h-4 text-[#7C3AED]" />
              <span>Dados de exemplo. <strong className="text-[#1A0D35]">Crie sua conta</strong> para conectar seus bancos via Open Finance.</span>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12.5px] font-[800] hover:bg-[#6D28D9] transition-colors whitespace-nowrap"
              style={{ boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}
            >
              Começar grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        <p className="text-center mt-4 text-[11.5px] text-[#7B6A9B]">
          Tudo o que você editar fica só no seu navegador. Recarregue para resetar.
        </p>
      </div>
    </section>
  );
}
