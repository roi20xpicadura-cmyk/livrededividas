import { useState } from "react";
import { useFinDashData } from "@/hooks/useFinDashData";
import Header from "@/components/findash/Header";
import PeriodBar from "@/components/findash/PeriodBar";
import TabBar from "@/components/findash/TabBar";
import OverviewTab from "@/components/findash/tabs/OverviewTab";
import TransactionsTab from "@/components/findash/tabs/TransactionsTab";
import GoalsTab from "@/components/findash/tabs/GoalsTab";
import CashFlowTab from "@/components/findash/tabs/CashFlowTab";
import DRETab from "@/components/findash/tabs/DRETab";
import CardsTab from "@/components/findash/tabs/CardsTab";
import InvestmentsTab from "@/components/findash/tabs/InvestmentsTab";
import ChartsTab from "@/components/findash/tabs/ChartsTab";
import ExportTab from "@/components/findash/tabs/ExportTab";

export default function Index() {
  const [activeTab, setActiveTab] = useState(0);
  const fd = useFinDashData();
  const hasData = fd.data.transactions.length > 0 || fd.data.goals.length > 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      <Header hasData={hasData} onReset={fd.resetAll} />
      <PeriodBar cfg={fd.data.cfg} setCfg={fd.setCfg} periodLabel={fd.periodLabel} />
      <TabBar active={activeTab} onChange={setActiveTab} />

      <main className="max-w-[1400px] mx-auto px-5 md:px-8 py-6 space-y-5">
        {activeTab === 0 && (
          <OverviewTab filteredTx={fd.filteredTx} stats={fd.stats} currency={fd.data.cfg.currency} onGoToTransactions={() => setActiveTab(1)} />
        )}
        {activeTab === 1 && (
          <TransactionsTab filteredTx={fd.filteredTx} currency={fd.data.cfg.currency} onAdd={fd.addTransaction} onRemove={fd.removeTransaction} />
        )}
        {activeTab === 2 && (
          <GoalsTab goals={fd.data.goals} currency={fd.data.cfg.currency} onAdd={fd.addGoal} onUpdate={fd.updateGoal} onRemove={fd.removeGoal} />
        )}
        {activeTab === 3 && (
          <CashFlowTab filteredTx={fd.filteredTx} currency={fd.data.cfg.currency} rangeStart={fd.rangeStart} rangeEnd={fd.rangeEnd} />
        )}
        {activeTab === 4 && (
          <DRETab filteredTx={fd.filteredTx} currency={fd.data.cfg.currency} />
        )}
        {activeTab === 5 && (
          <CardsTab cards={fd.data.cards} currency={fd.data.cfg.currency} onAdd={fd.addCard} onUpdate={fd.updateCard} onRemove={fd.removeCard} />
        )}
        {activeTab === 6 && (
          <InvestmentsTab investments={fd.data.investments} currency={fd.data.cfg.currency} onAdd={fd.addInvestment} onUpdate={fd.updateInvestment} onRemove={fd.removeInvestment} />
        )}
        {activeTab === 7 && (
          <ChartsTab filteredTx={fd.filteredTx} investments={fd.data.investments} currency={fd.data.cfg.currency} rangeStart={fd.rangeStart} rangeEnd={fd.rangeEnd} />
        )}
        {activeTab === 8 && (
          <ExportTab data={fd.data} filteredTx={fd.filteredTx} currency={fd.data.cfg.currency} />
        )}
      </main>
    </div>
  );
}
