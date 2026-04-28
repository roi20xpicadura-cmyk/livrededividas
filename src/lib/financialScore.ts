export interface ScoreData {
  totalIncome: number;
  totalExpense: number;
  cards: { used_amount: number; credit_limit: number }[];
  goals: { current_amount: number; target_amount: number }[];
  totalDebt: number;
  investments: { asset_type: string }[];
  recentTransactionCount: number;
}

export interface ScoreCriteria {
  label: string;
  points: number;
  max: number;
}

export function calculateFinancialScore(data: ScoreData): { total: number; criteria: ScoreCriteria[] } {
  const criteria: ScoreCriteria[] = [];

  // 1. Savings rate (0-200)
  const savingsRate = data.totalIncome > 0 ? (data.totalIncome - data.totalExpense) / data.totalIncome : 0;
  const savingsPoints = Math.min(200, Math.max(0, Math.round(savingsRate * 1000)));
  criteria.push({ label: 'Taxa de Poupança', points: savingsPoints, max: 200 });

  // 2. Credit utilization (0-200)
  const avgUtil = data.cards.length > 0
    ? data.cards.reduce((s, c) => s + (Number(c.used_amount) / Math.max(1, Number(c.credit_limit))), 0) / data.cards.length
    : 0;
  const creditPoints = data.cards.length > 0 ? Math.round(Math.max(0, (1 - avgUtil / 0.7)) * 200) : 200;
  criteria.push({ label: 'Uso do Crédito', points: Math.min(200, Math.max(0, creditPoints)), max: 200 });

  // 3. Goals progress (0-200)
  const avgGoal = data.goals.length > 0
    ? data.goals.reduce((s, g) => s + Math.min(1, Number(g.current_amount) / Math.max(1, Number(g.target_amount))), 0) / data.goals.length
    : 0;
  const goalPoints = Math.round(avgGoal * 200);
  criteria.push({ label: 'Progresso de Metas', points: goalPoints, max: 200 });

  // 4. Debt control (0-200)
  const dti = data.totalIncome > 0 ? data.totalDebt / (data.totalIncome * 12) : 0;
  const debtPoints = Math.round(Math.max(0, (1 - dti)) * 200);
  criteria.push({ label: 'Controle de Dívidas', points: Math.min(200, debtPoints), max: 200 });

  // 5. Investment diversification (0-100)
  const uniqueTypes = new Set(data.investments.map(i => i.asset_type)).size;
  const investPoints = Math.min(100, uniqueTypes * 25);
  criteria.push({ label: 'Investimentos', points: investPoints, max: 100 });

  // 6. Consistency (0-100)
  const consistencyPoints = Math.min(100, data.recentTransactionCount * 5);
  criteria.push({ label: 'Regularidade', points: consistencyPoints, max: 100 });

  const total = Math.min(1000, Math.max(0, criteria.reduce((s, c) => s + c.points, 0)));
  return { total, criteria };
}

export function getScoreColor(score: number): string {
  if (score >= 800) return '#7C3AED'; // primary
  if (score >= 600) return '#a855f7'; // violet
  if (score >= 400) return '#d97706';
  if (score >= 200) return '#f97316';
  return '#dc2626';
}

export function getScoreLevel(score: number): { emoji: string; label: string } {
  if (score >= 900) return { emoji: '⭐', label: 'Excelente' };
  if (score >= 800) return { emoji: '💚', label: 'Muito Bom' };
  if (score >= 600) return { emoji: '🟢', label: 'Bom' };
  if (score >= 400) return { emoji: '🟡', label: 'Em desenvolvimento' };
  if (score >= 200) return { emoji: '🟠', label: 'Iniciante' };
  return { emoji: '🔴', label: 'Crítico' };
}
