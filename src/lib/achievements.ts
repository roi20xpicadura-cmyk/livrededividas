export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
  xp: number;
  category: 'inicio' | 'habito' | 'meta' | 'divida' | 'poupanca' | 'especial';
  progress?: {
    total: number;
    label: string;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ─── INÍCIO ──────────────────────────────────────
  { id: 'first_launch', emoji: '🎯', name: 'Primeiro Passo', description: 'Registre seu primeiro lançamento no app.', xp: 50, category: 'inicio' },
  { id: 'first_goal', emoji: '🏕️', name: 'Sonhador', description: 'Crie sua primeira meta financeira.', xp: 50, category: 'inicio' },
  { id: 'first_budget', emoji: '📋', name: 'Carteirinha', description: 'Configure seu primeiro orçamento mensal.', xp: 30, category: 'inicio' },
  { id: 'connect_whatsapp', emoji: '💬', name: 'Conectado', description: 'Conecte seu WhatsApp para registrar gastos pelo app.', xp: 80, category: 'inicio' },

  // ─── HÁBITO ──────────────────────────────────────
  { id: 'streak_3', emoji: '🔥', name: 'Aquecendo', description: 'Registre lançamentos por 3 dias consecutivos.', xp: 30, category: 'habito', progress: { total: 3, label: 'dias consecutivos' } },
  { id: 'streak_7', emoji: '⚡', name: 'Na Chama', description: 'Registre lançamentos por 7 dias consecutivos.', xp: 100, category: 'habito', progress: { total: 7, label: 'dias consecutivos' } },
  { id: 'streak_30', emoji: '🌟', name: 'Imparável', description: 'Registre lançamentos por 30 dias consecutivos.', xp: 500, category: 'habito', progress: { total: 30, label: 'dias consecutivos' } },
  { id: 'launches_10', emoji: '📝', name: 'Organizador', description: 'Registre 10 lançamentos no total.', xp: 50, category: 'habito', progress: { total: 10, label: 'lançamentos' } },
  { id: 'launches_100', emoji: '💪', name: 'Dedicado', description: 'Registre 100 lançamentos no total.', xp: 200, category: 'habito', progress: { total: 100, label: 'lançamentos' } },

  // ─── METAS ───────────────────────────────────────
  { id: 'positive_month', emoji: '✅', name: 'Mês no Azul', description: 'Termine o mês com saldo positivo.', xp: 150, category: 'meta' },
  { id: 'positive_3months', emoji: '🏆', name: 'Conquistador', description: 'Termine 3 meses consecutivos com saldo positivo.', xp: 300, category: 'meta', progress: { total: 3, label: 'meses no azul' } },
  { id: 'goal_complete', emoji: '🎊', name: 'Realizador', description: 'Conclua uma meta financeira 100%.', xp: 200, category: 'meta' },
  { id: 'budget_respected', emoji: '🎓', name: 'Mestre do Orçamento', description: 'Respeite todos os orçamentos em um mês.', xp: 300, category: 'meta' },

  // ─── POUPANÇA ────────────────────────────────────
  { id: 'save_500', emoji: '💰', name: 'Poupador', description: 'Economize R$500 em um único mês.', xp: 200, category: 'poupanca' },
  { id: 'save_5000', emoji: '💎', name: 'Reserva Sólida', description: 'Acumule R$5.000 em metas de poupança.', xp: 500, category: 'poupanca' },
  { id: 'emergency_fund', emoji: '🕊️', name: 'Liberdade', description: 'Construa uma reserva de emergência de 3 meses.', xp: 1000, category: 'poupanca' },

  // ─── DÍVIDAS ─────────────────────────────────────
  { id: 'debt_paid', emoji: '🗡️', name: 'Caçador de Dívidas', description: 'Quite sua primeira dívida completamente.', xp: 300, category: 'divida' },
  { id: 'debt_free', emoji: '🦋', name: 'Livre', description: 'Quite todas as suas dívidas ativas.', xp: 400, category: 'divida' },

  // ─── ESPECIAL ────────────────────────────────────
  { id: 'pro_subscriber', emoji: '⭐', name: 'Saúde Premium', description: 'Assine o plano Pro do KoraFinance.', xp: 300, category: 'especial' },
  { id: 'whatsapp_10', emoji: '🤖', name: 'IA no Bolso', description: 'Registre 10 lançamentos pelo WhatsApp.', xp: 150, category: 'especial', progress: { total: 10, label: 'lançamentos via WPP' } },
  { id: 'couple_connected', emoji: '👫', name: 'Dupla Financeira', description: 'Conecte-se ao modo casal.', xp: 200, category: 'especial' },
];

export const CATEGORIES = {
  inicio: { label: 'Início', emoji: '🚀' },
  habito: { label: 'Hábito', emoji: '🔥' },
  meta: { label: 'Metas', emoji: '🎯' },
  divida: { label: 'Dívidas', emoji: '💳' },
  poupanca: { label: 'Poupança', emoji: '💰' },
  especial: { label: 'Especial', emoji: '⭐' },
} as const;

export interface Level {
  name: string;
  emoji: string;
  min: number;
  max: number;
}

export function getLevel(xp: number): Level {
  if (xp >= 3000) return { name: 'Lenda', emoji: '👑', min: 3000, max: 9999 };
  if (xp >= 1500) return { name: 'Expert', emoji: '💎', min: 1500, max: 3000 };
  if (xp >= 800) return { name: 'Avançado', emoji: '🌟', min: 800, max: 1500 };
  if (xp >= 400) return { name: 'Intermediário', emoji: '⚡', min: 400, max: 800 };
  if (xp >= 200) return { name: 'Aprendiz', emoji: '🔥', min: 200, max: 400 };
  return { name: 'Iniciante', emoji: '🌱', min: 0, max: 200 };
}

export function getNextLevelName(currentName: string): string {
  const order = ['Iniciante', 'Aprendiz', 'Intermediário', 'Avançado', 'Expert', 'Lenda'];
  const i = order.indexOf(currentName);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : '🏆';
}

// Legacy exports for backward compatibility with useAchievementChecker
export const LEVELS = [
  { name: 'Iniciante', minXP: 0, color: '#94a3b8' },
  { name: 'Aprendiz', minXP: 200, color: '#22c55e' },
  { name: 'Intermediário', minXP: 400, color: '#7C3AED' },
  { name: 'Avançado', minXP: 800, color: '#2563eb' },
  { name: 'Expert', minXP: 1500, color: '#d97706' },
  { name: 'Lenda', minXP: 3000, color: '#dc2626' },
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
