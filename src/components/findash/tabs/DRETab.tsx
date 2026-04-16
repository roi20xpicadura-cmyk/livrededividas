import { useMemo } from "react";
import { Transaction } from "@/types/findash";
import { motion } from "framer-motion";

interface Props {
  filteredTx: Transaction[];
  currency: string;
}

function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface LineItem {
  label: string;
  val: number;
  bold?: boolean;
  indent?: boolean;
  separator?: boolean;
  positive?: boolean;
}

export default function DRETab({ filteredTx, currency }: Props) {
  const dre = useMemo(() => {
    const bizInc = filteredTx.filter(t => t.type === 'income' && t.origin === 'business').reduce((s, t) => s + t.val, 0);
    const personalInc = filteredTx.filter(t => t.type === 'income' && t.origin === 'personal').reduce((s, t) => s + t.val, 0);
    const totalIncome = bizInc + personalInc;

    const bizExp = filteredTx.filter(t => t.type === 'expense' && t.origin === 'business').reduce((s, t) => s + t.val, 0);
    const personalExp = filteredTx.filter(t => t.type === 'expense' && t.origin === 'personal').reduce((s, t) => s + t.val, 0);
    const totalExpense = bizExp + personalExp;

    const marketing = filteredTx.filter(t => t.type === 'expense' && t.cat === 'Marketing').reduce((s, t) => s + t.val, 0);
    const fornecedor = filteredTx.filter(t => t.type === 'expense' && t.cat === 'Fornecedor').reduce((s, t) => s + t.val, 0);
    const impostos = filteredTx.filter(t => t.type === 'expense' && t.cat === 'Impostos').reduce((s, t) => s + t.val, 0);
    const salarios = filteredTx.filter(t => t.type === 'expense' && t.cat === 'Salários Equipe').reduce((s, t) => s + t.val, 0);
    const cmv = fornecedor;
    const lucBruto = totalIncome - cmv;
    const despOp = totalExpense - cmv;
    const lucLiq = totalIncome - totalExpense;
    const margLiq = totalIncome > 0 ? (lucLiq / totalIncome) * 100 : 0;

    const lines: LineItem[] = [
      { label: "RECEITA BRUTA", val: totalIncome, bold: true },
      { label: "Receita Negócio", val: bizInc, indent: true },
      { label: "Receita Pessoal", val: personalInc, indent: true },
      { label: "", val: 0, separator: true },
      { label: "(−) Custo Mercadoria Vendida", val: -cmv },
      { label: "", val: 0, separator: true },
      { label: "LUCRO BRUTO", val: lucBruto, bold: true },
      { label: "", val: 0, separator: true },
      { label: "(−) Despesas Operacionais", val: -despOp, bold: true },
      { label: "Marketing", val: -marketing, indent: true },
      { label: "Impostos", val: -impostos, indent: true },
      { label: "Salários Equipe", val: -salarios, indent: true },
      { label: "Despesas Pessoais", val: -personalExp, indent: true },
      { label: "Outras Despesas", val: -(totalExpense - cmv - marketing - impostos - salarios - personalExp), indent: true },
      { label: "", val: 0, separator: true },
      { label: "LUCRO LÍQUIDO", val: lucLiq, bold: true, positive: lucLiq >= 0 },
      { label: `Margem Líquida: ${margLiq.toFixed(1)}%`, val: 0, bold: true },
    ];
    return lines;
  }, [filteredTx]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4">
      <h3 className="text-[13px] font-extrabold text-fin-green-dark mb-4">Demonstração de Resultado (DRE)</h3>
      <div className="space-y-0">
        {dre.map((line, i) => {
          if (line.separator) return <div key={i} className="border-b border-border my-1" />;
          return (
            <div key={i} className={`flex items-center justify-between py-1.5 px-2 ${line.bold ? 'bg-fin-green-pale rounded-lg' : ''} ${line.indent ? 'pl-6' : ''}`}>
              <span className={`text-xs ${line.bold ? 'font-extrabold text-foreground' : 'text-muted font-medium'}`}>{line.label}</span>
              {line.label && line.val !== 0 ? (
                <span className={`text-xs metric-value ${line.val >= 0 ? 'text-fin-green' : 'text-fin-red'}`}>
                  {fmt(Math.abs(line.val), currency)}{line.val < 0 ? ' −' : ''}
                </span>
              ) : line.label.startsWith('Margem') ? null : (
                <span className="text-xs text-muted">—</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
