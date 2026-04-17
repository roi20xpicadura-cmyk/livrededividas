import { format, addDays, addMonths } from 'date-fns';

export interface DayPrediction {
  date: string;
  projectedBalance: number;
  confidence: number;
  events: PredictedEvent[];
  isNegative: boolean;
  isCritical: boolean;
}

export interface PredictedEvent {
  type: 'recurring_expense' | 'recurring_income' | 'scheduled_bill' | 'historical_pattern' | 'card_installment';
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

// Mediana — robusta a outliers (ignora aquele Pix de R$5k que destrói a média)
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Remove outliers usando IQR (Interquartile Range) — descarta valores absurdos
function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values.filter(v => v >= lower && v <= upper);
}

function analyzePatterns(transactions: any[]) {
  // Agrupa gastos por dia da semana, mas usa MEDIANA dos valores diários (não média)
  const expensesByDayOfWeek: number[][] = Array(7).fill(0).map(() => []);
  const dailyTotals: Record<string, Record<number, number>> = {}; // date -> {dayOfWeek: total}

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const date = new Date(t.date + 'T12:00:00');
    const day = date.getDay();
    const key = t.date;
    if (!dailyTotals[key]) dailyTotals[key] = { [day]: 0 };
    dailyTotals[key][day] = (dailyTotals[key][day] || 0) + Number(t.amount);
  });

  // Para cada dia da semana, coleta totais diários e calcula mediana
  Object.values(dailyTotals).forEach(dayMap => {
    Object.entries(dayMap).forEach(([day, total]) => {
      expensesByDayOfWeek[Number(day)].push(total);
    });
  });

  const medianByDayOfWeek = expensesByDayOfWeek.map(vals => {
    const cleaned = removeOutliers(vals);
    return median(cleaned);
  });

  // Detecta dias de salário
  const incomes = transactions.filter(t => t.type === 'income');
  const dayCount: Record<number, number> = {};
  incomes.forEach(t => {
    const d = new Date(t.date + 'T12:00:00').getDate();
    dayCount[d] = (dayCount[d] || 0) + 1;
  });
  const salaryDays = Object.entries(dayCount)
    .filter(([, count]) => count >= 2)
    .map(([day]) => Number(day));

  // Renda mensal: usa mediana mensal (mais estável que média)
  const monthGroups: Record<string, number> = {};
  incomes.forEach(t => {
    const key = t.date.substring(0, 7);
    monthGroups[key] = (monthGroups[key] || 0) + Number(t.amount);
  });
  const monthVals = Object.values(monthGroups);
  const medianMonthlySalary = median(removeOutliers(monthVals));

  const weekdayMedian = median([medianByDayOfWeek[1], medianByDayOfWeek[2], medianByDayOfWeek[3], medianByDayOfWeek[4], medianByDayOfWeek[5]]);
  const weekendMedian = median([medianByDayOfWeek[0], medianByDayOfWeek[6]]);
  const weekendMultiplier = weekdayMedian > 0 ? weekendMedian / weekdayMedian : 1.2;

  return { medianByDayOfWeek, salaryDays, medianMonthlySalary, weekendMultiplier };
}

/**
 * Detecta compras parceladas a partir do histórico.
 * Heurística: descrições parecidas (normalizadas) com mesmo valor recorrendo mensalmente.
 * Retorna parcelas futuras esperadas (ainda não cobradas).
 */
function detectFutureInstallments(transactions: any[]): Array<{ date: string; amount: number; description: string; category: string }> {
  const installments: Array<{ date: string; amount: number; description: string; category: string }> = [];
  const cardExpenses = transactions.filter(t => t.type === 'expense' && t.card_id);

  // Normaliza descrição: remove "1/12", "(2/6)", parcelas, números no final
  const normalize = (desc: string) =>
    desc.toLowerCase()
      .replace(/\s*\(?\d+\s*\/\s*\d+\)?/g, '')
      .replace(/\s*parc(ela)?\.?\s*\d+/gi, '')
      .replace(/\s+\d+$/g, '')
      .trim();

  // Agrupa por (descrição normalizada + valor arredondado)
  const groups: Record<string, any[]> = {};
  cardExpenses.forEach(t => {
    const key = `${normalize(t.description)}|${Math.round(Number(t.amount) * 100) / 100}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  Object.entries(groups).forEach(([key, txs]) => {
    if (txs.length < 2) return; // precisa de pelo menos 2 ocorrências

    // Ordena por data
    txs.sort((a, b) => a.date.localeCompare(b.date));
    const dates = txs.map(t => new Date(t.date + 'T12:00:00'));

    // Verifica se tem espaçamento mensal (~25-35 dias)
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const days = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / 86400000);
      intervals.push(days);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval < 25 || avgInterval > 35) return; // não é mensal

    // Tenta detectar total de parcelas a partir da descrição original (ex: "1/12")
    let totalInstallments = 0;
    for (const t of txs) {
      const m = String(t.description).match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        totalInstallments = Math.max(totalInstallments, Number(m[2]));
        break;
      }
    }
    // Fallback: se não detectou e tem 2+ ocorrências mensais, projeta mais 2 parcelas como provável
    if (!totalInstallments) totalInstallments = txs.length + 2;

    const remaining = totalInstallments - txs.length;
    if (remaining <= 0) return;

    const lastDate = dates[dates.length - 1];
    const dayOfMonth = lastDate.getDate();
    const sample = txs[0];
    const cleanDesc = normalize(sample.description) || sample.description;

    for (let i = 1; i <= Math.min(remaining, 12); i++) {
      const next = addMonths(lastDate, i);
      next.setDate(dayOfMonth);
      if (next <= today) continue;
      installments.push({
        date: format(next, 'yyyy-MM-dd'),
        amount: Number(sample.amount),
        description: `${cleanDesc} (parcela ${txs.length + i}/${totalInstallments})`,
        category: sample.category || 'Cartão',
      });
    }
  });

  return installments;
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
  const futureInstallments = detectFutureInstallments(transactions);

  // Indexa parcelas por data
  const installmentsByDate: Record<string, typeof futureInstallments> = {};
  futureInstallments.forEach(inst => {
    if (!installmentsByDate[inst.date]) installmentsByDate[inst.date] = [];
    installmentsByDate[inst.date].push(inst);
  });

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

    // Parcelas futuras detectadas
    const todayInstallments = installmentsByDate[dateStr] || [];
    for (const inst of todayInstallments) {
      dayEvents.push({
        type: 'card_installment',
        description: inst.description,
        amount: -inst.amount,
        probability: 0.92,
        category: inst.category,
      });
      runningBalance -= inst.amount;
    }

    const medianDaily = patterns.medianByDayOfWeek[dayOfWeek];
    if (medianDaily > 0) {
      const adj = dayOfWeek === 0 || dayOfWeek === 6 ? patterns.weekendMultiplier : 1.0;
      const expected = medianDaily * adj;
      dayEvents.push({ type: 'historical_pattern', description: `Gastos típicos de ${getDayName(dayOfWeek)}`, amount: -expected, probability: 0.7, category: 'Variável' });
      runningBalance -= expected * 0.7;
    }

    if (patterns.salaryDays.includes(dayOfMonth)) {
      const perDay = patterns.salaryDays.length > 0 ? patterns.medianMonthlySalary / patterns.salaryDays.length : patterns.medianMonthlySalary;
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

  // Alerta específico de parcelas futuras concentradas
  const installmentDays = predictions.filter(p => p.events.some(e => e.type === 'card_installment'));
  if (installmentDays.length > 0) {
    const totalInstallments = installmentDays.reduce((s, p) =>
      s + p.events.filter(e => e.type === 'card_installment').reduce((a, e) => a + Math.abs(e.amount), 0), 0);
    if (totalInstallments > 200) {
      alerts.push({
        type: 'info', icon: '💳',
        title: `${installmentDays.length} parcelas futuras detectadas`,
        description: `Identificamos R$ ${totalInstallments.toFixed(0)} em parcelas de cartão nos próximos meses.`,
        actionLabel: 'Ver detalhes', actionPath: '/app/predictions',
      });
    }
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
