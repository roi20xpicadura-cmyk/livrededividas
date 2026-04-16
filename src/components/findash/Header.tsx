import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RotateCcw } from "lucide-react";

interface HeaderProps {
  hasData: boolean;
  onReset: () => void;
}

export default function Header({ hasData, onReset }: HeaderProps) {
  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/40 h-[56px] flex items-center px-5 md:px-8">
      <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-extrabold text-sm">K</span>
          </div>
          <span className="text-[15px] font-bold text-foreground tracking-tight">KoraFinance</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-[13px] text-subtle capitalize">{today}</span>
          {hasData && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
              ✓ Salvo
            </span>
          )}
          <button
            onClick={() => { if (confirm("Resetar todos os dados?")) onReset(); }}
            className="btn-ghost flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
