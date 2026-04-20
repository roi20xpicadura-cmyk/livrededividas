import { useState, useEffect, useCallback, useMemo } from "react";
import { AppData, Transaction, Goal, CreditCard, Investment, Config } from "@/types/findash";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, parseISO, format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const STORAGE_KEY = "kora_v4";

const defaultCfg: Config = {
  name: "KoraFinance",
  currency: "R$",
  period: "Mês",
  pStart: format(startOfMonth(new Date()), "yyyy-MM-dd"),
  pEnd: format(endOfMonth(new Date()), "yyyy-MM-dd"),
};

const defaultData: AppData = {
  transactions: [],
  goals: [],
  cards: [],
  investments: [],
  cfg: defaultCfg,
};

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return { ...defaultData, ...parsed, cfg: { ...defaultCfg, ...parsed.cfg } };
  } catch {
    return defaultData;
  }
}

function getPeriodRange(period: string, pStart: string, pEnd: string): [Date, Date] {
  const now = new Date();
  switch (period) {
    case 'Dia': return [startOfDay(now), endOfDay(now)];
    case 'Semana': return [startOfWeek(now, { locale: ptBR }), endOfWeek(now, { locale: ptBR })];
    case 'Mês': return [startOfMonth(now), endOfMonth(now)];
    case 'Trimestre': return [startOfQuarter(now), endOfQuarter(now)];
    case 'Ano': return [startOfYear(now), endOfYear(now)];
    case 'Personalizado': return [parseISO(pStart), parseISO(pEnd)];
    default: return [startOfMonth(now), endOfMonth(now)];
  }
}

export function useFinDashData() {
  const [data, setData] = useState<AppData>(loadData);

  // Persistência com debounce: evita JSON.stringify síncrono a cada
  // teclada/ação. 250ms é imperceptível pro usuário e corta MUITO trabalho.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // quota cheia ou modo privado — ignora
      }
    }, 250);
    return () => clearTimeout(t);
  }, [data]);

  const [rangeStart, rangeEnd] = useMemo(
    () => getPeriodRange(data.cfg.period, data.cfg.pStart, data.cfg.pEnd),
    [data.cfg.period, data.cfg.pStart, data.cfg.pEnd]
  );

  const filteredTx = useMemo(() =>
    data.transactions.filter(t => {
      try {
        return isWithinInterval(parseISO(t.date), { start: rangeStart, end: rangeEnd });
      } catch { return false; }
    }),
    [data.transactions, rangeStart, rangeEnd]
  );

  const periodLabel = useMemo(() => {
    return `${format(rangeStart, "dd/MM/yyyy")} — ${format(rangeEnd, "dd/MM/yyyy")}`;
  }, [rangeStart, rangeEnd]);

  const daysInPeriod = useMemo(() => Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1), [rangeStart, rangeEnd]);

  // Mutations
  const setCfg = useCallback((partial: Partial<Config>) => {
    setData(d => ({ ...d, cfg: { ...d.cfg, ...partial } }));
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setData(d => ({ ...d, transactions: [...d.transactions, { ...tx, id: crypto.randomUUID() }] }));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== id) }));
  }, []);

  const addGoal = useCallback((g: Omit<Goal, 'id'>) => {
    setData(d => ({ ...d, goals: [...d.goals, { ...g, id: crypto.randomUUID() }] }));
  }, []);

  const updateGoal = useCallback((id: string, partial: Partial<Goal>) => {
    setData(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, ...partial } : g) }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setData(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }));
  }, []);

  const addCard = useCallback((c: Omit<CreditCard, 'id'>) => {
    setData(d => ({ ...d, cards: [...d.cards, { ...c, id: crypto.randomUUID() }] }));
  }, []);

  const updateCard = useCallback((id: string, partial: Partial<CreditCard>) => {
    setData(d => ({ ...d, cards: d.cards.map(c => c.id === id ? { ...c, ...partial } : c) }));
  }, []);

  const removeCard = useCallback((id: string) => {
    setData(d => ({ ...d, cards: d.cards.filter(c => c.id !== id) }));
  }, []);

  const addInvestment = useCallback((inv: Omit<Investment, 'id'>) => {
    setData(d => ({ ...d, investments: [...d.investments, { ...inv, id: crypto.randomUUID() }] }));
  }, []);

  const updateInvestment = useCallback((id: string, partial: Partial<Investment>) => {
    setData(d => ({ ...d, investments: d.investments.map(i => i.id === id ? { ...i, ...partial } : i) }));
  }, []);

  const removeInvestment = useCallback((id: string) => {
    setData(d => ({ ...d, investments: d.investments.filter(i => i.id !== id) }));
  }, []);

  const resetAll = useCallback(() => {
    setData(defaultData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    const income = filteredTx.filter(t => t.type === 'income');
    const expense = filteredTx.filter(t => t.type === 'expense');
    const totalIncome = income.reduce((s, t) => s + t.val, 0);
    const totalExpense = expense.reduce((s, t) => s + t.val, 0);
    const netBalance = totalIncome - totalExpense;

    const bizIncome = income.filter(t => t.origin === 'business').reduce((s, t) => s + t.val, 0);
    const bizExpense = expense.filter(t => t.origin === 'business').reduce((s, t) => s + t.val, 0);
    const personalExpense = expense.filter(t => t.origin === 'personal').reduce((s, t) => s + t.val, 0);
    const bizProfit = bizIncome - bizExpense;

    const investmentTotal = data.investments.reduce((s, i) => s + i.cur, 0);
    const patrimonio = investmentTotal + Math.max(0, netBalance);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const roiBiz = bizExpense > 0 ? (bizProfit / bizExpense) * 100 : 0;
    const avgPerDay = netBalance / daysInPeriod;

    return {
      totalIncome, totalExpense, netBalance,
      bizIncome, bizExpense, personalExpense, bizProfit,
      patrimonio, savingsRate, roiBiz, avgPerDay,
      txCount: filteredTx.length,
    };
  }, [filteredTx, data.investments, daysInPeriod]);

  return {
    data, filteredTx, stats, periodLabel, daysInPeriod,
    rangeStart, rangeEnd,
    setCfg, addTransaction, removeTransaction,
    addGoal, updateGoal, removeGoal,
    addCard, updateCard, removeCard,
    addInvestment, updateInvestment, removeInvestment,
    resetAll,
  };
}
