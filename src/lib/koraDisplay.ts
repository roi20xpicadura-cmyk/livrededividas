/**
 * Mapping de agentes legados (Marie/Einstein/Galileu) para os modos de display da Kora.
 * Mantemos o mapping aqui no frontend pra não quebrar registros antigos no banco
 * (alert_type permanece como está; só o que o usuário VÊ muda).
 *
 * 3 modos visuais:
 *  - analysis  → padrões, anomalias, tendências (azul, ícone gráfico)
 *  - alert     → coisas que precisam de ação (âmbar/vermelho conforme severity)
 *  - projection → previsões de fluxo, futuro (roxo, ícone projeção)
 */

export type KoraDisplayMode = 'analysis' | 'alert' | 'projection';

export interface KoraDisplayMeta {
  mode: KoraDisplayMode;
  label: string;
  /** HSL string usable in `hsl(var(...))` form would require tokens; keep raw HSL here */
  accentHsl: string;
  /** Subtle background tint used for the icon chip */
  bgHsl: string;
}

const MODE_META: Record<KoraDisplayMode, KoraDisplayMeta> = {
  analysis: {
    mode: 'analysis',
    label: 'Análise',
    accentHsl: 'hsl(217 91% 60%)',
    bgHsl: 'hsl(217 91% 60% / 0.10)',
  },
  alert: {
    mode: 'alert',
    label: 'Alerta',
    accentHsl: 'hsl(38 92% 50%)',
    bgHsl: 'hsl(38 92% 50% / 0.12)',
  },
  projection: {
    mode: 'projection',
    label: 'Projeção',
    accentHsl: 'hsl(262 83% 58%)',
    bgHsl: 'hsl(262 83% 58% / 0.10)',
  },
};

/**
 * Maps a legacy alert_type (or agent name) to a Kora display mode.
 * Falls back to 'analysis' for unknown values.
 */
export function alertTypeToDisplayMode(alertType: string | null | undefined): KoraDisplayMode {
  if (!alertType) return 'analysis';
  const t = alertType.toLowerCase();

  // Legacy direct agent names
  if (t === 'marie') return 'alert';
  if (t === 'einstein') return 'analysis';
  if (t === 'galileu') return 'projection';

  // Alert-type prefixes (current schema)
  if (t.startsWith('budget_') || t.startsWith('bill_') || t.startsWith('card_') || t.startsWith('debt_')) return 'alert';
  if (t.startsWith('cashflow_') || t.includes('forecast') || t.includes('predict') || t.startsWith('goal_deadline')) return 'projection';
  if (t.includes('anomaly') || t.includes('spike') || t.includes('pattern') || t.startsWith('savings_')) return 'analysis';

  return 'analysis';
}

/**
 * For raw insight payloads (`type: 'warning' | 'success' | 'info' | 'danger'`)
 * coming from the ai-insights edge function.
 */
export function insightTypeToDisplayMode(insightType: string | null | undefined): KoraDisplayMode {
  if (!insightType) return 'analysis';
  const t = insightType.toLowerCase();
  if (t === 'danger' || t === 'warning') return 'alert';
  if (t === 'success') return 'analysis';
  return 'analysis';
}

export function getDisplayMeta(mode: KoraDisplayMode): KoraDisplayMeta {
  return MODE_META[mode];
}

/** Stable hash for deduplication. Two insights with same title+message collapse to one. */
export function insightHash(title: string, message: string | null | undefined): string {
  return `${(title || '').trim().toLowerCase()}|${(message || '').trim().toLowerCase()}`;
}

/** Capitalize first letter of each whitespace-separated token (preserves accented chars). */
export function titleCaseName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)))
    .join('');
}
