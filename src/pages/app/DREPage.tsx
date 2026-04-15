import { useFinDashData } from "@/hooks/useFinDashData";
import DRETab from "@/components/findash/tabs/DRETab";

export default function DREPage() {
  const fd = useFinDashData();
  return (
    <div className="space-y-4">
      <DRETab filteredTx={fd.filteredTx} currency={fd.data.cfg.currency} />
    </div>
  );
}
