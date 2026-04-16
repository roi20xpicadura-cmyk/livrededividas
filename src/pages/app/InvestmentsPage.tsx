import { useKoraFinanceData } from "@/hooks/useKoraFinanceData";
import InvestmentsTab from "@/components/kora/tabs/InvestmentsTab";

export default function InvestmentsPage() {
  const fd = useKoraFinanceData();
  return (
    <div className="space-y-4">
      <InvestmentsTab
        investments={fd.data.investments}
        currency={fd.data.cfg.currency}
        onAdd={fd.addInvestment}
        onUpdate={fd.updateInvestment}
        onRemove={fd.removeInvestment}
      />
    </div>
  );
}
