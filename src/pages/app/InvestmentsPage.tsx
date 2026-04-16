import { useFinDashData } from "@/hooks/useFinDashData";
import InvestmentsTab from "@/components/findash/tabs/InvestmentsTab";

export default function InvestmentsPage() {
  const fd = useFinDashData();
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
