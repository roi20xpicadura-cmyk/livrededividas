export interface Achievement {
  key: string;
  emoji: string;
  name: string;
  desc: string;
  xp: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: 'first_transaction', emoji: '🎯', name: 'Primeiro Passo', desc: 'Adicionou o primeiro lançamento', xp: 50 },
  { key: 'first_goal', emoji: '🎪', name: 'Sonhador', desc: 'Criou a primeira meta', xp: 50 },
  { key: 'first_card', emoji: '💳', name: 'Carteirinha', desc: 'Cadastrou o primeiro cartão', xp: 30 },
  { key: 'first_investment', emoji: '📈', name: 'Investidor', desc: 'Adicionou o primeiro investimento', xp: 100 },
  { key: 'streak_3', emoji: '🔥', name: 'Aquecendo', desc: '3 dias seguidos lançando', xp: 30 },
  { key: 'streak_7', emoji: '⚡', name: 'Na Chama', desc: '7 dias seguidos', xp: 100 },
  { key: 'streak_30', emoji: '🌟', name: 'Imparável', desc: '30 dias seguidos', xp: 500 },
  { key: 'month_positive', emoji: '✅', name: 'Mês no Azul', desc: 'Fechou o mês com saldo positivo', xp: 150 },
  { key: 'goal_achieved', emoji: '🏆', name: 'Conquistador', desc: 'Atingiu a primeira meta', xp: 300 },
  { key: 'debt_paid', emoji: '🆓', name: 'Livre', desc: 'Quitou a primeira dívida', xp: 400 },
  { key: 'saved_1k', emoji: '💰', name: 'Poupador', desc: 'Guardou R$ 1.000', xp: 200 },
  { key: 'saved_10k', emoji: '💎', name: 'Reserva Sólida', desc: 'Guardou R$ 10.000', xp: 500 },
  { key: 'zero_debt', emoji: '🕊️', name: 'Liberdade', desc: 'Zerou todas as dívidas', xp: 1000 },
  { key: 'score_800', emoji: '⭐', name: 'Saúde Premium', desc: 'Score financeiro acima de 800', xp: 300 },
  { key: 'budget_master', emoji: '🎓', name: 'Mestre do Orçamento', desc: 'Respeitou todos os limites por 3 meses', xp: 400 },
  { key: 'transactions_50', emoji: '📊', name: 'Organizado', desc: '50 lançamentos registrados', xp: 100 },
  { key: 'transactions_200', emoji: '📚', name: 'Disciplinado', desc: '200 lançamentos registrados', xp: 250 },
];

export const LEVELS = [
  { name: 'Iniciante', minXP: 0, color: '#94a3b8' },
  { name: 'Aprendiz', minXP: 200, color: '#22c55e' },
  { name: 'Organizado', minXP: 500, color: '#7C3AED' },
  { name: 'Controlado', minXP: 1000, color: '#2563eb' },
  { name: 'Avançado', minXP: 2000, color: '#7c3aed' },
  { name: 'Expert', minXP: 3500, color: '#d97706' },
  { name: 'Mestre', minXP: 5000, color: '#dc2626' },
  { name: 'Lenda Financeira', minXP: 8000, color: '#f59e0b' },
];

export function getCurrentLevel(xp: number) {
  return LEVELS.filter(l => xp >= l.minXP).pop() || LEVELS[0];
}

export function getXPToNextLevel(xp: number) {
  const next = LEVELS.find(l => l.minXP > xp);
  return next ? next.minXP - xp : 0;
}

export function getNextLevel(xp: number) {
  return LEVELS.find(l => l.minXP > xp) || null;
}
