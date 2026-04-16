import { Transaction, Goal, CreditCard, Investment, Config } from "@/types/kora";
import { format, parseISO } from "date-fns";
import { Download, FileText, Table } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  data: { transactions: Transaction[]; goals: Goal[]; cards: CreditCard[]; investments: Investment[]; cfg: Config };
  filteredTx: Transaction[];
  currency: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExportTab({ data, filteredTx, currency }: Props) {
  const exportCSV = () => {
    const header = "Data,Descrição,Valor,Tipo,Origem,Categoria\n";
    const rows = filteredTx.map(t =>
      `${t.date},"${t.desc}",${t.val},${t.type === 'income' ? 'Receita' : 'Despesa'},${t.origin === 'business' ? 'Negócio' : 'Pessoal'},"${t.cat}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kora-lancamentos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kora-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          localStorage.setItem("kora_v4", JSON.stringify(imported));
          window.location.reload();
        } catch { alert("Arquivo inválido"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-6">
        <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Exportar & Importar Dados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={exportCSV}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-[1.5px] border-border hover:border-fin-green-light transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-fin-green-pale flex items-center justify-center">
              <Table className="w-6 h-6 text-fin-green" />
            </div>
            <span className="font-bold text-sm">Exportar CSV</span>
            <span className="text-[11px] text-muted text-center">Lançamentos do período em formato planilha</span>
          </button>

          <button onClick={exportJSON}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-[1.5px] border-border hover:border-fin-blue-border transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-fin-blue-pale flex items-center justify-center">
              <Download className="w-6 h-6 text-fin-blue" />
            </div>
            <span className="font-bold text-sm">Backup JSON</span>
            <span className="text-[11px] text-muted text-center">Todos os dados em formato JSON</span>
          </button>

          <button onClick={importJSON}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-[1.5px] border-border hover:border-fin-purple-border transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-fin-purple-pale flex items-center justify-center">
              <FileText className="w-6 h-6 text-fin-purple" />
            </div>
            <span className="font-bold text-sm">Importar JSON</span>
            <span className="text-[11px] text-muted text-center">Restaurar backup de dados</span>
          </button>
        </div>
      </motion.div>

      <div className="card-surface p-4">
        <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-2">Resumo dos Dados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-fin-green-pale rounded-lg">
            <p className="label-upper text-muted">Lançamentos</p>
            <p className="metric-value text-lg">{data.transactions.length}</p>
          </div>
          <div className="p-3 bg-fin-blue-pale rounded-lg">
            <p className="label-upper text-muted">Metas</p>
            <p className="metric-value text-lg">{data.goals.length}</p>
          </div>
          <div className="p-3 bg-fin-purple-pale rounded-lg">
            <p className="label-upper text-muted">Cartões</p>
            <p className="metric-value text-lg">{data.cards.length}</p>
          </div>
          <div className="p-3 bg-fin-amber-pale rounded-lg">
            <p className="label-upper text-muted">Investimentos</p>
            <p className="metric-value text-lg">{data.investments.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
