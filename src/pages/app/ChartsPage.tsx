import { useFinDashData } from "@/hooks/useFinDashData";
import ChartsTab from "@/components/findash/tabs/ChartsTab";

export default function ChartsPage() {
  const fd = useFinDashData();
  return (
    <div className="space-y-4">
      <ChartsTab
        filteredTx={fd.filteredTx}
        investments={fd.data.investments}
        currency={fd.data.cfg.currency}
        rangeStart={fd.rangeStart}
        rangeEnd={fd.rangeEnd}
      />
    </div>
  );
}
