/**
 * LocalStorage fallback cache for Goals.
 * - Caches the last successful Supabase fetch per user.
 * - On reload, hydrates the UI instantly from cache while fresh data loads.
 * - If Supabase is unreachable, the cached values + progress remain visible.
 * - Optimistic deposits are written to cache immediately so reloads survive offline.
 */
import type { Database } from '@/integrations/supabase/types';

export type GoalRow = Database['public']['Tables']['goals']['Row'];

const VERSION = 1;
const KEY_PREFIX = 'kora.goals.cache.v' + VERSION + ':';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface CacheShape {
  v: number;
  savedAt: number;
  goals: GoalRow[];
}

function key(userId: string) {
  return KEY_PREFIX + userId;
}

export function readGoalsCache(userId: string | undefined): GoalRow[] | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (parsed.v !== VERSION) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!Array.isArray(parsed.goals)) return null;
    return parsed.goals;
  } catch {
    return null;
  }
}

export function writeGoalsCache(userId: string | undefined, goals: GoalRow[]) {
  if (!userId || typeof window === 'undefined') return;
  try {
    const payload: CacheShape = { v: VERSION, savedAt: Date.now(), goals };
    window.localStorage.setItem(key(userId), JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage disabled — silently ignore.
  }
}

export function clearGoalsCache(userId: string | undefined) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}

/**
 * Apply an optimistic deposit to the cache so a reload right after
 * (e.g., during a flaky network) shows the updated value/progress.
 */
export function applyDepositToCache(
  userId: string | undefined,
  goalId: string,
  amount: number,
) {
  if (!userId) return;
  const current = readGoalsCache(userId);
  if (!current) return;
  const updated = current.map((g) =>
    g.id === goalId
      ? { ...g, current_amount: Number(g.current_amount || 0) + amount }
      : g,
  );
  writeGoalsCache(userId, updated);
}
