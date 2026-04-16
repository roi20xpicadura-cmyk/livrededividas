import { TAB_NAMES } from "@/types/kora";
import { LayoutDashboard, Receipt, Target, TrendingUp, FileText, CreditCard, PiggyBank, BarChart3, Download } from "lucide-react";

const ICONS = [LayoutDashboard, Receipt, Target, TrendingUp, FileText, CreditCard, PiggyBank, BarChart3, Download];

interface TabBarProps {
  active: number;
  onChange: (i: number) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="bg-card border-b border-border overflow-x-auto">
      <div className="flex min-w-max px-4 md:px-6">
        {TAB_NAMES.map((name, i) => {
          const Icon = ICONS[i];
          return (
            <button
              key={name}
              onClick={() => onChange(i)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                active === i
                  ? 'border-primary text-fin-green-dark'
                  : 'border-transparent text-muted hover:text-foreground hover:border-fin-green-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
