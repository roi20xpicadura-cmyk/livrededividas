import { useState } from "react";
import { useKoraFinanceData } from "@/hooks/useKoraFinanceData";
import Header from "@/components/kora/Header";
import PeriodBar from "@/components/kora/PeriodBar";
import TabBar from "@/components/kora/TabBar";
import OverviewTab from "@/components/kora/tabs/OverviewTab";
import TransactionsTab from "@/components/kora/tabs/TransactionsTab";
import GoalsTab from "@/components/kora/tabs/GoalsTab";
import CashFlowTab from "@/components/kora/tabs/CashFlowTab";
import DRETab from "@/components/kora/tabs/DRETab";
import CardsTab from "@/components/kora/tabs/CardsTab";
import InvestmentsTab from "@/components/kora/tabs/InvestmentsTab";
import ChartsTab from "@/components/kora/tabs/ChartsTab";
import ExportTab from "@/components/kora/tabs/ExportTab";

export default function Index() {
  const [activeTab, setActiveTab] = useState(0);
  const fd = useKoraFinanceData();
  const hasData = fd.data.transactions.length > 0 || fd.data.goals.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header hasData={hasData} onReset={fd.resetAll} />
      <PeriodBar cfg={fd.data.cfg} setCfg={fd.setCfg} periodLabel={fd.periodLabel} />
      <TabBar active={activeTab} onChange={setActiveTab} />

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-4">
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
