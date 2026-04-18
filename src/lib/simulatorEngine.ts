import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SimulatorDebt {
  id: string;
  current_amount?: number | string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface SimulatorGoal {
  id: string;
  current_amount?: number | string | null;
  target_amount: number | string;
  name?: string | null;
  [key: string]: unknown;
}

export interface SimulatorRecurring {
  id: string;
  amount?: number | string | null;
  type?: string | null;
  [key: string]: unknown;
}

export interface SimulatorBase {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  expenseByCategory: Record<string, number>;
  totalDebt: number;
  currentBalance: number;
  financialScore: number;
  debts: SimulatorDebt[];
  goals: SimulatorGoal[];
  recurring: SimulatorRecurring[];
}

export interface ScenarioAdjustments {
  incomeChange: number;
  expenseChanges: Record<string, number>;
  newFixedCost: number;
  newFixedIncome: number;
  debtPayoffExtra: number;
  goalContribution: number;
  months: number;
}

export interface MonthData {
  month: number;
  label: string;
  balance: number;
  income: number;
  expenses: number;
  debt: number;
  saving: number;
}

export interface SimulationResults {
  timeline: MonthData[];
  baselineTimeline: MonthData[];
  simIncome: number;
  simExpenses: number;
  simMonthlySaving: number;
  monthlyDelta: number;
  annualDelta: number;
  annualSavings: number;
  debtFreeMonth: number | null;
  goalReachedMonth: number | null;
  scoreDelta: number;
  remainingDebt: number;
  isPositive: boolean;
  isBetter: boolean;
}

export const DEFAULT_SCENARIO: ScenarioAdjustments = {
  incomeChange: 0,
  expenseChanges: {},
  newFixedCost: 0,
  newFixedIncome: 0,
  debtPayoffExtra: 0,
  goalContribution: 0,
  months: 12,
};

export const PRESET_SCENARIOS: { emoji: string; label: string; apply: (base: SimulatorBase) => Partial<ScenarioAdjustments> }[] = [
  {
    emoji: '💸', label: 'Cortar gastos',
    apply: (base) => {
      const changes: Record<string, number> = {};
      Object.entries(base.expenseByCategory).forEach(([cat, val]) => { changes[cat] = -val * 0.2; });
      return { expenseChanges: changes };
    },
  },
  {
    emoji: '📈', label: 'Aumento de salário',
    apply: (base) => ({ incomeChange: base.avgMonthlyIncome * 0.3 }),
  },
  {
    emoji: '🏠', label: 'Aluguel mais caro',
    apply: () => ({ newFixedCost: 500 }),
  },
  {
    emoji: '💳', label: 'Quitar dívida rápido',
    apply: () => ({ debtPayoffExtra: 500 }),
  },
  {
    emoji: '📉', label: 'Perder emprego',
    apply: (base) => ({ incomeChange: -base.avgMonthlyIncome }),
  },
  {
    emoji: '🎯', label: 'Juntar para meta',
    apply: () => ({ goalContribution: 400 }),
  },
];

export function computeSimulation(base: SimulatorBase, scenario: ScenarioAdjustments): SimulationResults {
  const months = scenario.months;
  const timeline: MonthData[] = [];
  const baselineTimeline: MonthData[] = [];

  const simIncome = base.avgMonthlyIncome + scenario.incomeChange + scenario.newFixedIncome;
  const expenseAdj = Object.values(scenario.expenseChanges).reduce((a, b) => a + b, 0);
  const simExpenses = base.avgMonthlyExpenses + scenario.newFixedCost + expenseAdj;
  const simMonthlySaving = simIncome - simExpenses - scenario.debtPayoffExtra - scenario.goalContribution;

  let runningBalance = 0;
  let baselineBalance = 0;
  let remainingDebt = base.totalDebt;
  const baseMonthlyBalance = base.avgMonthlyIncome - base.avgMonthlyExpenses;

  const goalProgress: Record<string, number> = {};
  base.goals.forEach(g => { goalProgress[g.id] = Number(g.current_amount || 0); });

  for (let m = 1; m <= months; m++) {
    if (remainingDebt > 0 && scenario.debtPayoffExtra > 0) {
      remainingDebt = Math.max(0, remainingDebt - scenario.debtPayoffExtra);
    }

    if (scenario.goalContribution > 0 && base.goals.length > 0) {
      const g = base.goals[0];
      goalProgress[g.id] = Math.min(Number(g.target_amount), goalProgress[g.id] + scenario.goalContribution);
    }

    runningBalance += simMonthlySaving;
    baselineBalance += baseMonthlyBalance;

    const label = format(addMonths(new Date(), m), 'MMM yy', { locale: ptBR });

    timeline.push({ month: m, label, balance: runningBalance, income: simIncome, expenses: simExpenses, debt: remainingDebt, saving: simMonthlySaving });
    baselineTimeline.push({ month: m, label, balance: baselineBalance, income: base.avgMonthlyIncome, expenses: base.avgMonthlyExpenses, debt: base.totalDebt, saving: baseMonthlyBalance });
  }

  const debtFreeMonth = scenario.debtPayoffExtra > 0 && base.totalDebt > 0
    ? Math.ceil(base.totalDebt / scenario.debtPayoffExtra)
    : null;

  let goalReachedMonth: number | null = null;
  if (base.goals.length > 0 && scenario.goalContribution > 0) {
    const g = base.goals[0];
    const remaining = Number(g.target_amount) - Number(g.current_amount || 0);
    if (remaining > 0) goalReachedMonth = Math.ceil(remaining / scenario.goalContribution);
  }

  const scoreDelta = calculateScoreDelta(base, scenario);
  const monthlyDelta = simMonthlySaving - baseMonthlyBalance;
  const annualSavings = simMonthlySaving * 12;
  const baseAnnualSavings = baseMonthlyBalance * 12;

  return {
    timeline,
    baselineTimeline,
    simIncome,
    simExpenses,
    simMonthlySaving,
    monthlyDelta,
    annualDelta: annualSavings - baseAnnualSavings,
    annualSavings,
    debtFreeMonth: debtFreeMonth && debtFreeMonth <= scenario.months ? debtFreeMonth : null,
    goalReachedMonth: goalReachedMonth && goalReachedMonth <= scenario.months ? goalReachedMonth : null,
    scoreDelta,
    remainingDebt,
    isPositive: simMonthlySaving > 0,
    isBetter: simMonthlySaving > baseMonthlyBalance,
  };
}

function calculateScoreDelta(base: SimulatorBase, scenario: ScenarioAdjustments): number {
  const savingsImprovement = base.avgMonthlyIncome > 0
    ? (scenario.incomeChange - Object.values(scenario.expenseChanges).filter(v => v > 0).reduce((a, b) => a + b, 0)) / base.avgMonthlyIncome * 100
    : 0;
  const debtReduction = base.totalDebt > 0 ? (scenario.debtPayoffExtra * 12) / base.totalDebt * 80 : 0;
  return Math.min(150, Math.max(-150, Math.round(savingsImprovement * 2 + debtReduction)));
}
