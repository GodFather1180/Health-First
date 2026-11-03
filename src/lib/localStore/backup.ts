// src/lib/localStore/backup.ts
import { STORES, type StoreName } from "@/lib/localStore/tables";
import { clearStore, bulkPut, getAll } from "@/lib/localStore";
import { uid } from "@/lib/id";

export type BackupBundle = Partial<Record<StoreName, any[]>>;

function ensureId(store: StoreName, row: any, i: number) {
  const r = { ...(row ?? {}) };
  if (r.id) return r;

  // Prefer deterministic IDs when possible
  switch (store) {
    case STORES.dailyGoals:
      r.id = r.date ? `daily_${r.date}_${i}` : uid("daily");
      return r;
    case STORES.moodEntries:
      r.id = r.date ? `mood_${r.date}` : uid("mood");
      return r;
    case STORES.weeklyGoals:
      r.id = r.weekKey ? `weekly_${r.weekKey}_${i}` : uid("weekly");
      return r;
    case STORES.monthlyGoals:
      r.id = r.monthKey ? `monthly_${r.monthKey}_${i}` : uid("monthly");
      return r;
    case STORES.yearlyGoals:
      r.id = r.yearKey ? `yearly_${r.yearKey}_${i}` : uid("yearly");
      return r;
    case STORES.habits:
      r.id = r.name ? `habit_${String(r.name).toLowerCase().replace(/\s+/g, "_")}_${i}` : uid("habit");
      return r;
    case STORES.habitChecks:
      r.id = r.habitId && r.date ? `hc_${r.habitId}_${r.date}` : uid("hc");
      return r;
    case STORES.selfCareItems:
      r.id = r.name ? `sci_${String(r.name).toLowerCase().replace(/\s+/g, "_")}_${i}` : uid("sci");
      return r;
    case STORES.selfCareEntries:
      r.id = r.date ? `sce_${r.date}_${i}` : uid("sce");
      return r;
    case STORES.affirmations:
      r.id = r.text ? `aff_${String(r.text).slice(0, 24)}_${i}` : uid("aff");
      return r;
    case STORES.winEntries:
      r.id = r.date ? `win_${r.date}_${i}` : uid("win");
      return r;
    case STORES.letters:
      r.id = r.createdAt ? `letter_${r.createdAt}_${i}` : uid("letter");
      return r;
    default:
      r.id = uid(String(store));
      return r;
  }
}

function ensureMetaKey(store: StoreName, row: any) {
  const r = { ...(row ?? {}) };

  if (store === STORES.weeklyMeta) {
    if (!r.weekKey) r.weekKey = r.id ?? uid("week");
    return r;
  }
  if (store === STORES.monthlyMeta) {
    if (!r.monthKey) r.monthKey = r.id ?? uid("month");
    return r;
  }
  if (store === STORES.yearlyMeta) {
    if (!r.yearKey) r.yearKey = r.id ?? String(new Date().getFullYear());
    return r;
  }
  return r;
}

function normalize(store: StoreName, rows: any[]) {
  if (!Array.isArray(rows)) return [];

  if (store === STORES.weeklyMeta || store === STORES.monthlyMeta || store === STORES.yearlyMeta) {
    return rows.map((x) => ensureMetaKey(store, x));
  }

  return rows.map((x, i) => ensureId(store, x, i));
}

export async function exportAllLocal(): Promise<BackupBundle> {
  const bundle: BackupBundle = {};
  const stores = Object.values(STORES) as StoreName[];

  for (const s of stores) {
    bundle[s] = await getAll<any>(s);
  }
  return bundle;
}

export async function importAllLocal(bundle: BackupBundle): Promise<void> {
  const stores = Object.values(STORES) as StoreName[];

  // wipe then import
  for (const s of stores) await clearStore(s);

  for (const s of stores) {
    const rows = normalize(s, (bundle as any)?.[s] ?? []);
    if (!rows.length) continue;

    try {
      await bulkPut(s, rows);
    } catch (e: any) {
      throw new Error(`Import failed for store "${s}": ${e?.message ?? "unknown error"}`);
    }
  }
}
