import { useSyncExternalStore } from 'react';

/* ──────────────────────────────────────────────────────────────
   Demo store — estado em memória para a seção "Live Demo" da
   landing. NÃO toca em Supabase, NÃO persiste. Reseta ao recarregar.
   ────────────────────────────────────────────────────────────── */

export type DemoTx = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  category: string;
  amount: number; // positivo = entrada, negativo = saída
  account: 'Conta Corrente' | 'Cartão Nubank' | 'Cartão Inter' | 'Pix';
};

export type DemoGoal = {
  id: string;
  emoji: string;
  title: string;
  current: number;
  target: number;
  due: string; // "Dez/2026"
};

export type DemoCard = {
  id: string;
  name: string;
  brand: 'Nubank' | 'Inter' | 'C6';
  limit: number;
  used: number;
  closing: number; // dia
  due: number; // dia
  color: string;
};

export type DemoInvestment = {
  id: string;
  name: string;
  type: 'Renda Fixa' | 'Ações' | 'Cripto' | 'Tesouro';
  value: number;
  yieldPct: number; // % no mês
};

export type DemoState = {
  monthlyIncome: number;
  txs: DemoTx[];
  goals: DemoGoal[];
  cards: DemoCard[];
  investments: DemoInvestment[];
};

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};

const INITIAL: DemoState = {
  monthlyIncome: 5000,
  txs: [
    { id: 't1',  date: daysAgo(0),  description: 'iFood — McDonalds',     category: 'Delivery',    amount: -47.9,  account: 'Cartão Nubank' },
    { id: 't2',  date: daysAgo(1),  description: 'Uber para o trabalho',  category: 'Transporte',  amount: -18.4,  account: 'Pix' },
    { id: 't3',  date: daysAgo(1),  description: 'Spotify Premium',       category: 'Lazer',       amount: -21.9,  account: 'Cartão Nubank' },
    { id: 't4',  date: daysAgo(2),  description: 'Mercado Pão de Açúcar', category: 'Mercado',     amount: -312.4, account: 'Cartão Inter' },
    { id: 't5',  date: daysAgo(3),  description: 'iFood — Sushi',         category: 'Delivery',    amount: -89.0,  account: 'Cartão Nubank' },
    { id: 't6',  date: daysAgo(5),  description: 'Conta de luz',          category: 'Casa',        amount: -184.7, account: 'Conta Corrente' },
    { id: 't7',  date: daysAgo(6),  description: 'Internet Vivo',         category: 'Casa',        amount: -119.9, account: 'Conta Corrente' },
    { id: 't8',  date: daysAgo(7),  description: 'Salário — Empresa X',   category: 'Salário',     amount: 5000,   account: 'Conta Corrente' },
    { id: 't9',  date: daysAgo(8),  description: 'Posto Shell',           category: 'Transporte',  amount: -210.0, account: 'Cartão Nubank' },
    { id: 't10', date: daysAgo(10), description: 'Netflix',               category: 'Lazer',       amount: -39.9,  account: 'Cartão Nubank' },
    { id: 't11', date: daysAgo(12), description: 'Mercado Extra',         category: 'Mercado',     amount: -298.6, account: 'Cartão Inter' },
    { id: 't12', date: daysAgo(15), description: 'Freela design',         category: 'Renda Extra', amount: 1200,   account: 'Pix' },
    { id: 't13', date: daysAgo(18), description: 'Farmácia',              category: 'Saúde',       amount: -76.3,  account: 'Pix' },
    { id: 't14', date: daysAgo(22), description: 'iFood — Açaí',          category: 'Delivery',    amount: -34.5,  account: 'Cartão Nubank' },
  ],
  goals: [
    { id: 'g1', emoji: '🏖️',  title: 'Viagem Fernando de Noronha', current: 6700, target: 10000, due: 'Dez/2026' },
    { id: 'g2', emoji: '🚗', title: 'Troca de carro',              current: 12400, target: 35000, due: 'Mai/2027' },
    { id: 'g3', emoji: '🛡️',  title: 'Reserva de emergência',      current: 4200, target: 18000, due: 'Out/2026' },
  ],
  cards: [
    { id: 'c1', name: 'Nubank Ultravioleta', brand: 'Nubank', limit: 8000, used: 2384, closing: 2,  due: 10, color: '#7C3AED' },
    { id: 'c2', name: 'Inter Black',         brand: 'Inter',  limit: 6000, used: 611,  closing: 28, due: 5,  color: '#FF7A00' },
  ],
  investments: [
    { id: 'i1', name: 'Tesouro Selic 2029', type: 'Tesouro',    value: 4200, yieldPct: 0.92 },
    { id: 'i2', name: 'CDB Inter 110% CDI', type: 'Renda Fixa', value: 2800, yieldPct: 1.04 },
    { id: 'i3', name: 'ITSA4 — Itaúsa',     type: 'Ações',      value: 1840, yieldPct: -0.84 },
    { id: 'i4', name: 'BTC',                type: 'Cripto',     value: 920,  yieldPct: 3.21 },
  ],
};

/* ── store mínimo ───────────────────────────────────────────── */
let state: DemoState = JSON.parse(JSON.stringify(INITIAL));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const demoStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    state = JSON.parse(JSON.stringify(INITIAL));
    emit();
  },
  addTx: (tx: Omit<DemoTx, 'id' | 'date'> & { date?: string }) => {
    state = {
      ...state,
      txs: [
        { id: `t${Date.now()}`, date: tx.date ?? iso(new Date()), ...tx },
        ...state.txs,
      ],
    };
    emit();
  },
  removeTx: (id: string) => {
    state = { ...state, txs: state.txs.filter((t) => t.id !== id) };
    emit();
  },
  contributeGoal: (id: string, amount: number) => {
    state = {
      ...state,
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, current: Math.min(g.target, g.current + amount) } : g,
      ),
    };
    emit();
  },
  addGoal: (g: Omit<DemoGoal, 'id' | 'current'>) => {
    state = {
      ...state,
      goals: [...state.goals, { id: `g${Date.now()}`, current: 0, ...g }],
    };
    emit();
  },
};

export function useDemoStore<T>(selector: (s: DemoState) => T): T {
  return useSyncExternalStore(
    demoStore.subscribe,
    () => selector(demoStore.get()),
    () => selector(INITIAL),
  );
}

/* ── selectors / helpers ────────────────────────────────────── */
export function getMonthSummary(s: DemoState) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const inMonth = s.txs.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const income = inMonth.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const expenses = inMonth.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0);
  const balance = income + expenses;
  return { income, expenses: Math.abs(expenses), balance, count: inMonth.length };
}

export function getCategoryBreakdown(s: DemoState) {
  const map = new Map<string, number>();
  s.txs
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
    });
  return [...map.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

export function formatBRL(v: number) {
  const abs = Math.abs(v);
  return `${v < 0 ? '-' : ''}R$ ${abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBRLShort(v: number) {
  const abs = Math.abs(v);
  return `${v < 0 ? '-' : ''}R$ ${abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export const CATEGORIES = [
  'Mercado', 'Delivery', 'Transporte', 'Lazer', 'Casa', 'Saúde',
  'Educação', 'Salário', 'Renda Extra', 'Outros',
] as const;

export const CATEGORY_EMOJI: Record<string, string> = {
  Mercado: '🛒', Delivery: '🍔', Transporte: '🚗', Lazer: '🎮',
  Casa: '🏠', Saúde: '💊', Educação: '📚', Salário: '💰',
  'Renda Extra': '✨', Outros: '📦',
};
