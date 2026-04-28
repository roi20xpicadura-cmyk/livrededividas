import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, X, TrendingUp, TrendingDown, Wallet, Sparkles, Trash2,
  PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useFinDashData } from "@/hooks/useFinDashData";
import { INVESTMENT_TYPES } from "@/types/findash";

const TYPE_EMOJI: Record<string, string> = {
  "Renda Fixa": "🏦",
  "Ações": "📈",
  "FIIs": "🏢",
  "Cripto": "₿",
  "Tesouro": "🇧🇷",
  "Poupança": "🐷",
  "Outro": "💼",
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateBR(iso: string) {
  try { return format(parseISO(iso), "dd 'de' MMM 'de' yyyy", { locale: ptBR }); }
  catch { return iso; }
}

export default function InvestmentsPage() {
  const fd = useFinDashData();
  const investments = fd.data.investments;
  const [showForm, setShowForm] = useState(false);

  const totalInvested = investments.reduce((s, i) => s + i.val, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.cur, 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach((i) => { map[i.type] = (map[i.type] || 0) + i.cur; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [investments]);

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Investimentos</h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe sua carteira e o retorno de cada aplicação.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:brightness-110 transition"
        >
          <Plus className="w-4 h-4" /> Novo
        </button>
      </header>

      {/* Hero card */}
      <div className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)" }}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15">
              <PiggyBank className="w-3 h-3 inline -mt-0.5 mr-1" /> Patrimônio Investido
            </span>
          </div>
          <p className="text-3xl font-black tracking-tight">{fmtBRL(totalCurrent)}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-white/80">
            {totalReturn >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-300" />
            )}
            <span className={totalReturn >= 0 ? "text-emerald-300" : "text-rose-300"}>
              {totalReturn >= 0 ? "+" : ""}{fmtBRL(totalReturn)} ({returnPct.toFixed(2)}%)
            </span>
            <span className="text-white/60">vs. investido</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Investido</p>
              <p className="text-sm font-extrabold mt-0.5">{fmtBRL(totalInvested)}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Ativos</p>
              <p className="text-sm font-extrabold mt-0.5">{investments.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Tipos</p>
              <p className="text-sm font-extrabold mt-0.5">{byType.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alocação por tipo */}
      {byType.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold">Alocação por tipo</h2>
          </div>
          <div className="space-y-2.5">
            {byType.map(([t, v]) => {
              const pct = totalCurrent > 0 ? (v / totalCurrent) * 100 : 0;
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span>{TYPE_EMOJI[t] || "💼"}</span> {t}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {fmtBRL(v)} <span className="text-[10px] font-bold text-primary">· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all"
                         style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista / empty state */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">Seus investimentos</h2>
          {investments.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {investments.length} {investments.length === 1 ? "ativo" : "ativos"}
            </span>
          )}
        </div>

        {investments.length === 0 ? (
          <EmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <ul className="divide-y divide-border">
            {investments.map((inv) => {
              const ret = inv.cur - inv.val;
              const pct = inv.val > 0 ? (ret / inv.val) * 100 : 0;
              const positive = ret >= 0;
              return (
                <li key={inv.id} className="px-4 py-3 flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {TYPE_EMOJI[inv.type] || "💼"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{inv.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {inv.type} · {fmtDateBR(inv.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm tabular-nums">{fmtBRL(inv.cur)}</p>
                    <p className={`text-[11px] font-semibold tabular-nums flex items-center justify-end gap-0.5 ${positive ? "text-success" : "text-destructive"}`}>
                      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {positive ? "+" : ""}{fmtBRL(ret)} ({pct.toFixed(1)}%)
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Remover "${inv.name}"?`)) fd.removeInvestment(inv.id); }}
                    className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition opacity-0 group-hover:opacity-100"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="sm:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center z-30 active:scale-95 transition"
        aria-label="Adicionar investimento"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {showForm && (
          <AddInvestmentSheet
            onClose={() => setShowForm(false)}
            onAdd={(inv) => { fd.addInvestment(inv); setShowForm(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 relative">
        <PiggyBank className="w-10 h-10 text-primary" />
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
      </div>
      <h3 className="text-base font-extrabold mb-1">Comece a acompanhar seus investimentos</h3>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-5">
        Cadastre suas aplicações para ver retorno, alocação por tipo e a evolução do seu patrimônio.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:brightness-110 transition"
      >
        <Plus className="w-4 h-4" /> Cadastrar primeiro investimento
      </button>
      <div className="grid grid-cols-3 gap-2 mt-6 max-w-sm mx-auto">
        {["Renda Fixa", "Ações", "Cripto"].map((t) => (
          <div key={t} className="px-2 py-2 rounded-lg bg-secondary text-[11px] font-semibold flex items-center justify-center gap-1">
            <span>{TYPE_EMOJI[t]}</span> {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Add Sheet ─── */
function AddInvestmentSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (inv: { date: string; name: string; val: number; cur: number; type: string }) => void;
}) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [name, setName] = useState("");
  const [val, setVal] = useState("");
  const [cur, setCur] = useState("");
  const [type, setType] = useState(INVESTMENT_TYPES[0]);

  const submit = () => {
    const v = parseFloat(val.replace(",", "."));
    const c = parseFloat(cur.replace(",", ".")) || v;
    if (!name.trim() || isNaN(v) || v <= 0 || !date) return;
    onAdd({ date, name: name.trim(), val: v, cur: c, type });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-extrabold">Novo investimento</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nome</label>
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tesouro Selic 2029"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {INVESTMENT_TYPES.map((t) => (
                <button
                  key={t} type="button" onClick={() => setType(t)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition flex flex-col items-center gap-0.5 ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="text-base leading-none">{TYPE_EMOJI[t] || "💼"}</span>
                  <span className="truncate w-full text-center">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Investido (R$)</label>
              <input
                inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)}
                placeholder="0,00"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valor atual (R$)</label>
              <input
                inputMode="decimal" value={cur} onChange={(e) => setCur(e.target.value)}
                placeholder="0,00"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Data da aplicação</label>
            <input
              type="date" lang="pt-BR" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {date ? fmtDateBR(date) : ""}
            </p>
          </div>

          <button
            onClick={submit}
            disabled={!name.trim() || !val}
            className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar à carteira
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
