import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

interface HeaderProps {
  hasData: boolean;
  onReset: () => void;
}

export default function Header({ hasData, onReset }: HeaderProps) {
  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <header className="sticky top-0 z-50 bg-card border-b-2 border-primary h-[60px] flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-black text-foreground">KoraFinance</span>
          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider">
            E-commerce
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-muted capitalize">{today}</span>
          {hasData && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fin-green-pale text-fin-green text-[10px] font-bold">
              ✓ Salvo
            </span>
          )}
          <button
            onClick={() => { if (confirm("Resetar todos os dados?")) onReset(); }}
            className="text-[11px] text-muted hover:text-destructive transition-colors duration-200 font-semibold"
          >
            Resetar tudo
          </button>
        </div>
      </div>
    </header>
  );
}
