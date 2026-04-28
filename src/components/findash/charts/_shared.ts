export const COLORS = ['#7C3AED', '#2563EB', '#A78BFA', '#D97706', '#0891B2', '#DC2626', '#E11D48', '#059669', '#6366F1'];

export const axisStyle = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: 'var(--color-text-subtle)' },
};

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-base)',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-md)',
    padding: '10px 14px',
    fontSize: '13px',
  },
  labelStyle: {
    color: 'var(--color-text-subtle)',
    fontWeight: 500 as const,
    marginBottom: '4px',
  },
};

export function fmt(v: number, c: string) {
  return `${c} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
