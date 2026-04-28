import { motion } from 'framer-motion';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface Props {
  id: string;
  size?: number;
  rarity: Rarity;
  unlocked: boolean;
}

const RARITY_GRAD: Record<Rarity, [string, string]> = {
  common:    ['#e2e8f0', '#475569'],
  rare:      ['#bfdbfe', '#1d4ed8'],
  epic:      ['#e9d5ff', '#7c3aed'],
  legendary: ['#fef3c7', '#b45309'],
};

const ICONS: Record<string, (g: string) => JSX.Element> = {
  first_launch: (g) => (
    <>
      <circle cx="32" cy="32" r="22" fill={`url(#${g})`} opacity="0.3" />
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="32" cy="32" r="13" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
      <circle cx="32" cy="32" r="5" fill="currentColor" />
      <path d="M32 32 L48 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 14 L50 14 L50 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  first_goal: (g) => (
    <>
      <path d="M8 50 L24 22 L36 38 L46 18 L56 50 Z" fill={`url(#${g})`} opacity="0.35" />
      <path d="M8 50 L24 22 L36 38 L46 18 L56 50 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M46 18 L46 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 8 L56 11 L46 14 Z" fill={`url(#${g})`} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  first_budget: (g) => (
    <>
      <rect x="10" y="18" width="44" height="32" rx="6" fill={`url(#${g})`} opacity="0.3" />
      <rect x="10" y="18" width="44" height="32" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M10 26 L54 26" stroke="currentColor" strokeWidth="2" />
      <circle cx="44" cy="36" r="3.5" fill="currentColor" />
    </>
  ),
  connect_whatsapp: (g) => (
    <>
      <path d="M12 16 Q12 12 16 12 L48 12 Q52 12 52 16 L52 38 Q52 42 48 42 L26 42 L18 50 L18 42 L16 42 Q12 42 12 38 Z" fill={`url(#${g})`} opacity="0.3" />
      <path d="M12 16 Q12 12 16 12 L48 12 Q52 12 52 16 L52 38 Q52 42 48 42 L26 42 L18 50 L18 42 L16 42 Q12 42 12 38 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M22 26 L29 33 L42 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  streak_3: (g) => (
    <>
      <path d="M32 10 Q42 22 42 34 Q42 48 32 54 Q22 48 22 34 Q22 22 32 10 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M32 10 Q42 22 42 34 Q42 48 32 54 Q22 48 22 34 Q22 22 32 10 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M32 28 Q37 35 37 42 Q37 48 32 52 Q27 48 27 42 Q27 35 32 28 Z" fill="currentColor" opacity="0.85" />
    </>
  ),
  streak_7: (g) => (
    <>
      <path d="M36 6 L16 36 L28 36 L24 58 L48 26 L36 26 L42 6 Z" fill={`url(#${g})`} opacity="0.4" />
      <path d="M36 6 L16 36 L28 36 L24 58 L48 26 L36 26 L42 6 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    </>
  ),
  streak_30: (g) => (
    <>
      <path d="M32 4 L38 24 L58 24 L42 36 L48 56 L32 44 L16 56 L22 36 L6 24 L26 24 Z" fill={`url(#${g})`} opacity="0.4" />
      <path d="M32 4 L38 24 L58 24 L42 36 L48 56 L32 44 L16 56 L22 36 L6 24 L26 24 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="4" fill="currentColor" />
    </>
  ),
  launches_10: (g) => (
    <>
      <path d="M16 8 L40 8 L52 20 L52 56 L16 56 Z" fill={`url(#${g})`} opacity="0.3" />
      <path d="M16 8 L40 8 L52 20 L52 56 L16 56 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M40 8 L40 20 L52 20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M22 30 L46 30 M22 38 L46 38 M22 46 L38 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  launches_100: (g) => (
    <>
      <path d="M14 32 Q14 18 28 18 L40 18 Q52 18 52 28 Q52 38 42 40 L42 48 Q42 54 36 54 L24 54 Q18 54 18 48 L18 42 Q14 40 14 32 Z" fill={`url(#${g})`} opacity="0.35" />
      <path d="M14 32 Q14 18 28 18 L40 18 Q52 18 52 28 Q52 38 42 40 L42 48 Q42 54 36 54 L24 54 Q18 54 18 48 L18 42 Q14 40 14 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <circle cx="32" cy="30" r="5" fill="currentColor" opacity="0.7" />
    </>
  ),
  positive_month: (g) => (
    <>
      <circle cx="32" cy="32" r="24" fill={`url(#${g})`} opacity="0.3" />
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M18 38 L26 30 L32 36 L42 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M36 24 L44 24 L44 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  positive_3months: (g) => (
    <>
      <path d="M20 12 L44 12 L44 28 Q44 38 32 38 Q20 38 20 28 Z" fill={`url(#${g})`} opacity="0.4" />
      <path d="M20 12 L44 12 L44 28 Q44 38 32 38 Q20 38 20 28 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M20 16 L12 16 L12 22 Q12 28 20 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M44 16 L52 16 L52 22 Q52 28 44 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M28 38 L28 46 L36 46 L36 38" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M22 50 L42 50 L42 54 L22 54 Z" fill={`url(#${g})`} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),
  goal_complete: (g) => (
    <>
      <circle cx="32" cy="32" r="14" fill={`url(#${g})`} opacity="0.45" />
      <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M22 22 L18 18 M42 22 L46 18 M22 42 L18 46 M42 42 L46 46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="11" cy="32" r="2.5" fill="currentColor" />
      <circle cx="53" cy="32" r="2.5" fill="currentColor" />
      <circle cx="32" cy="11" r="2.5" fill="currentColor" />
      <circle cx="32" cy="53" r="2.5" fill="currentColor" />
      <path d="M26 32 L30 36 L38 26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  budget_respected: (g) => (
    <>
      <path d="M32 14 L58 24 L32 34 L6 24 Z" fill={`url(#${g})`} opacity="0.4" />
      <path d="M32 14 L58 24 L32 34 L6 24 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M16 28 L16 42 Q16 48 32 48 Q48 48 48 42 L48 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M58 24 L58 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="58" cy="40" r="2.5" fill="currentColor" />
    </>
  ),
  save_500: (g) => (
    <>
      <ellipse cx="32" cy="18" rx="18" ry="6" fill={`url(#${g})`} opacity="0.45" />
      <ellipse cx="32" cy="18" rx="18" ry="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M14 18 L14 30 Q14 34 32 34 Q50 34 50 30 L50 18" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.3" />
      <path d="M14 30 L14 42 Q14 46 32 46 Q50 46 50 42 L50 30" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.3" />
      <ellipse cx="32" cy="30" rx="18" ry="6" stroke="currentColor" strokeWidth="2" fill="none" />
      <ellipse cx="32" cy="42" rx="18" ry="6" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  save_5000: (g) => (
    <>
      <path d="M16 22 L24 10 L40 10 L48 22 L32 56 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M16 22 L24 10 L40 10 L48 22 L32 56 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M16 22 L48 22 M24 10 L32 22 L40 10 M32 22 L32 56" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  emergency_fund: (g) => (
    <>
      <path d="M32 6 L52 14 L52 32 Q52 46 32 56 Q12 46 12 32 L12 14 Z" fill={`url(#${g})`} opacity="0.4" />
      <path d="M32 6 L52 14 L52 32 Q52 46 32 56 Q12 46 12 32 L12 14 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M22 30 L30 38 L44 22" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  debt_paid: (g) => (
    <>
      <path d="M44 6 L58 20 L48 30 L34 16 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M44 6 L58 20 L48 30 L34 16 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M34 16 L10 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 44 L20 58 M16 36 L30 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="44" r="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="52" cy="52" r="6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="2 3" opacity="0.7" />
    </>
  ),
  debt_free: (g) => (
    <>
      <path d="M32 22 Q22 8 12 16 Q6 24 16 34 Q24 38 32 32 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M32 22 Q22 8 12 16 Q6 24 16 34 Q24 38 32 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M32 22 Q42 8 52 16 Q58 24 48 34 Q40 38 32 32 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M32 22 Q42 8 52 16 Q58 24 48 34 Q40 38 32 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M32 32 Q26 44 32 56 Q38 44 32 32 Z" fill={`url(#${g})`} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 14 L32 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  pro_subscriber: (g) => (
    <>
      <path d="M8 22 L16 42 L24 18 L32 40 L40 18 L48 42 L56 22 L52 52 L12 52 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M8 22 L16 42 L24 18 L32 40 L40 18 L48 42 L56 22 L52 52 L12 52 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <circle cx="8" cy="22" r="3" fill="currentColor" />
      <circle cx="56" cy="22" r="3" fill="currentColor" />
      <circle cx="32" cy="40" r="3" fill="currentColor" />
      <path d="M12 52 L52 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  whatsapp_10: (g) => (
    <>
      <rect x="14" y="18" width="36" height="32" rx="8" fill={`url(#${g})`} opacity="0.35" />
      <rect x="14" y="18" width="36" height="32" rx="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M32 10 L32 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="8" r="3" fill="currentColor" />
      <circle cx="24" cy="30" r="3.5" fill="currentColor" />
      <circle cx="40" cy="30" r="3.5" fill="currentColor" />
      <path d="M24 40 L40 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 28 L10 38 M54 28 L54 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  couple_connected: (g) => (
    <>
      <path d="M22 32 Q22 22 28 22 Q32 22 32 28 Q32 22 36 22 Q42 22 42 32 Q42 38 32 48 Q22 38 22 32 Z" fill={`url(#${g})`} opacity="0.45" />
      <path d="M22 32 Q22 22 28 22 Q32 22 32 28 Q32 22 36 22 Q42 22 42 32 Q42 38 32 48 Q22 38 22 32 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="14" r="5" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.5" />
      <circle cx="44" cy="14" r="5" stroke="currentColor" strokeWidth="2.5" fill={`url(#${g})`} fillOpacity="0.5" />
      <path d="M21 19 L25 26 M43 19 L39 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
};

const Fallback = (g: string) => (
  <>
    <circle cx="32" cy="32" r="20" fill={`url(#${g})`} opacity="0.4" />
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" fill="none" />
    <path d="M24 18 L32 36 L40 18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    <circle cx="32" cy="38" r="6" fill={`url(#${g})`} stroke="currentColor" strokeWidth="2" />
  </>
);

export function AchievementIcon({ id, size = 40, rarity, unlocked }: Props) {
  const [c1, c2] = RARITY_GRAD[rarity];
  const Render = ICONS[id] || Fallback;
  const gradId = `ach-${id}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{
        color: unlocked ? '#ffffff' : 'hsl(var(--muted-foreground))',
        filter: unlocked ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' : 'none',
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={unlocked ? 'rgba(255,255,255,0.95)' : c1} />
          <stop offset="100%" stopColor={unlocked ? 'rgba(254,243,199,0.6)' : c2} />
        </linearGradient>
      </defs>
      {Render(gradId)}
    </motion.svg>
  );
}