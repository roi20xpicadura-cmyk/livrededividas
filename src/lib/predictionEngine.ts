import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DayPrediction {
  date: string;
  projectedBalance: number;
  confidence: number;
  events: PredictedEvent[];
  isNegative: boolean;
  isCritical: boolean;
}

export interface PredictedEvent {
  type: 'recurring_expense' | 'recurring_income' | 'scheduled_bill' | 'historical_pattern';
  description: string;
  amount: number;
  probability: number;
  category: string;
}

export interface PredictionAlert {
  type: 'danger' | 'warning' | 'info' | 'success';
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

function getDayName(day: number): string {
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return names[day] || '';
}

function analyzePatterns(transactions: any[]) {
  const byDayOfWeek = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const day = new Date(t.date + 'T12:00:00').getDay();
    byDayOfWeek[day].total += Number(t.amount);
    byDayOfWeek[day].count++;
  });

  const avgByDayOfWeek = byDayOfWeek.map(d => d.count > 0 ? d.total / d.count : 0);

  const incomes = transactions.filter(t => t.type === 'income');
  const dayCount: Record<number, number> = {};
  incomes.forEach(t => {
    const d = new Date(t.date + 'T12:00:00').getDate();
    dayCount[d] = (dayCount[d] || 0) + 1;
  });
  const salaryDays = Object.entries(dayCount)
    .filter(([, count]) => count >= 2)
    .map(([day]) => Number(day));

  const monthGroups: Record<string, number> = {};
  incomes.forEach(t => {
    const key = t.date.substring(0, 7);
    monthGroups[key] = (monthGroups[key] || 0) + Number(t.amount);
  });
  const monthVals = Object.values(monthGroups);
  const avgMonthlySalary = monthVals.length > 0 ? monthVals.reduce((a, b) => a + b, 0) / monthVals.length : 0;

  const weekdayAvg = (avgByDayOfWeek[1] + avgByDayOfWeek[2] + avgByDayOfWeek[3] + avgByDayOfWeek[4] + avgByDayOfWeek[5]) / 5;
  const weekendAvg = (avgByDayOfWeek[0] + avgByDayOfWeek[6]) / 2;
  const weekendMultiplier = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 1.2;

  return { avgByDayOfWeek, salaryDays, avgMonthlySalary, weekendMultiplier };
}

function isRecurringDue(rec: any, date: Date): boolean {
  if (!rec.active) return false;
  const dayOfMonth = rec.day_of_month || new Date(rec.next_date + 'T12:00:00').getDate();
  if (rec.frequency === 'monthly') return date.getDate() === dayOfMonth;
  if (rec.frequency === 'weekly') return date.getDay() === new Date(rec.next_date + 'T12:00:00').getDay();
  return false;
}

export function buildPrediction(
  currentBalance: number,
  transactions: any[],
  recurring: any[],
  scheduledBills: any[],
  days: number = 90
): DayPrediction[] {
  const predictions: DayPrediction[] = [];
  let runningBalance = currentBalance;
  const patterns = analyzePatterns(transactions);

  for (let d = 1; d <= days; d++) {
    const date = addDays(new Date(), d);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();
    const dayEvents: PredictedEvent[] = [];

    for (const rec of recurring) {
      if (isRecurringDue(rec, date)) {
        const amt = Number(rec.amount) * (rec.type === 'expense' ? -1 : 1);
        dayEvents.push({ type: rec.type === 'expense' ? 'recurring_expense' : 'recurring_income', description: rec.description, amount: amt, probability: 0.95, category: rec.category });
        runningBalance += amt;
      }
    }

    for (const bill of scheduledBills) {
      if (bill.due_date === dateStr && bill.status === 'pending') {
        dayEvents.push({ type: 'scheduled_bill', description: bill.description, amount: -Number(bill.amount), probability: 0.99, category: bill.category });
        runningBalance -= Number(bill.amount);
      }
    }

    const avgDaily = patterns.avgByDayOfWeek[dayOfWeek];
    if (avgDaily > 0) {
      const adj = dayOfWeek === 0 || dayOfWeek === 6 ? patterns.weekendMultiplier : 1.0;
      const expected = avgDaily * adj;
      dayEvents.push({ type: 'historical_pattern', description: `Gastos típicos de ${getDayName(dayOfWeek)}`, amount: -expected, probability: 0.7, category: 'Variável' });
      runningBalance -= expected * 0.7;
    }

    if (patterns.salaryDays.includes(dayOfMonth)) {
      const perDay = patterns.salaryDays.length > 0 ? patterns.avgMonthlySalary / patterns.salaryDays.length : patterns.avgMonthlySalary;
      dayEvents.push({ type: 'recurring_income', description: 'Salário/renda prevista', amount: perDay, probability: 0.9, category: 'Salário' });
      runningBalance += perDay * 0.9;
    }

    const timeFactor = Math.max(0.3, 1 - (d / 90) * 0.7);
    const confirmedRatio = dayEvents.filter(e => e.probability > 0.9).length / Math.max(1, dayEvents.length);
    const confidence = Math.min(0.95, timeFactor * (0.6 + confirmedRatio * 0.4));

    predictions.push({
      date: dateStr,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      confidence,
      events: dayEvents,
      isNegative: runningBalance < 0,
      isCritical: runningBalance < -500,
    });
  }

  return predictions;
}

export function generateAlerts(predictions: DayPrediction[], monthlyExpenses: number): PredictionAlert[] {
  const alerts: PredictionAlert[] = [];
  const firstNeg = predictions.find(p => p.isNegative);
  const lowestBal = Math.min(...predictions.map(p => p.projectedBalance));

  if (firstNeg) {
    const daysUntil = Math.round((new Date(firstNeg.date).getTime() - Date.now()) / 86400000);
    alerts.push({
      type: 'danger', icon: '🚨',
      title: 'Saldo negativo previsto',
      description: `Em ${daysUntil} dias, seu saldo pode chegar a R$ ${firstNeg.projectedBalance.toFixed(0)}. Aja agora para evitar.`,
      actionLabel: 'Simular solução', actionPath: '/app/simulator',
    });
  } else if (lowestBal < 500) {
    alerts.push({
      type: 'warning', icon: '⚠️',
      title: 'Saldo baixo previsto',
      description: `Seu saldo pode cair para R$ ${lowestBal.toFixed(0)} nos próximos dias. Fique atento.`,
    });
  }

  // Check for expense clusters
  for (let i = 0; i < predictions.length - 7; i++) {
    const week = predictions.slice(i, i + 7);
    const weekTotal = week.reduce((s, d) => s + d.events.filter(e => e.amount < 0).reduce((a, e) => a + Math.abs(e.amount), 0), 0);
    if (weekTotal > monthlyExpenses * 0.6) {
      const startDate = format(new Date(week[0].date), 'dd/MM');
      const endDate = format(new Date(week[6].date), 'dd/MM');
      alerts.push({
        type: 'warning', icon: '📊',
        title: 'Semana crítica detectada',
        description: `Entre ${startDate} e ${endDate} há R$ ${weekTotal.toFixed(0)} em despesas concentradas.`,
        actionLabel: 'Ver detalhes', actionPath: '/app/predictions',
      });
      break;
    }
  }

  if (!firstNeg && lowestBal > 500) {
    alerts.push({
      type: 'success', icon: '✅',
      title: 'Finanças saudáveis',
      description: 'Nenhum risco de saldo negativo detectado nos próximos 90 dias. Continue assim!',
    });
  }

  return alerts;
}
