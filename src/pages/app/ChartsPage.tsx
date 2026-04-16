import { useKoraFinanceData } from "@/hooks/useKoraFinanceData";
import ChartsTab from "@/components/kora/tabs/ChartsTab";

export default function ChartsPage() {
  const fd = useKoraFinanceData();
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
