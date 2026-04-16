import { useKoraFinanceData } from "@/hooks/useKoraFinanceData";
import DRETab from "@/components/kora/tabs/DRETab";

export default function DREPage() {
  const fd = useKoraFinanceData();
  return (
    <div className="space-y-4">
      <DRETab filteredTx={fd.filteredTx} currency={fd.data.cfg.currency} />
    </div>
  );
}
