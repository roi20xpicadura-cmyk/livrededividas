export interface Transaction {
  id: string;
  date: string;
  desc: string;
  val: number;
  type: 'income' | 'expense';
  origin: 'business' | 'personal';
  cat: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  start: string;
  deadline: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  used: number;
  due: number;
  color: string;
}

export interface Investment {
  id: string;
  date: string;
  name: string;
  val: number;
  cur: number;
  type: string;
}

export interface Config {
  name: string;
  currency: string;
  period: string;
  pStart: string;
  pEnd: string;
}

export interface AppData {
  transactions: Transaction[];
  goals: Goal[];
  cards: CreditCard[];
  investments: Investment[];
  cfg: Config;
}

export const INCOME_CATEGORIES = ['Salário', 'Freelance', 'Vendas', 'Investimento', 'Aluguel', 'Outro'];
export const EXPENSE_CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Marketing', 'Fornecedor', 'Impostos', 'Salários Equipe', 'Outro'
];
export const INVESTMENT_TYPES = ['Renda Fixa', 'Ações', 'FIIs', 'Cripto', 'Tesouro', 'Poupança', 'Outro'];
export const PERIODS = ['Dia', 'Semana', 'Mês', 'Trimestre', 'Ano', 'Personalizado'] as const;

export const TAB_NAMES = [
  'Visão Geral', 'Lançamentos', 'Metas', 'Fluxo de Caixa', 'DRE',
  'Cartões', 'Investimentos', 'Gráficos', 'Exportar'
] as const;
