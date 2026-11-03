import { STORES } from "@/lib/localStore/tables";
import { getAll, getByIndex, put } from "@/lib/localStore";
import { uid } from "@/lib/id";
import type { Habit, HabitCheck, HabitStatus } from "@/types/domain";

export async function ensureDefaultHabits() {
  const existing = await getAll<Habit>(STORES.habits);
  if (existing.length) return;

  const now = Date.now();
  const defaults = ["Sleep", "Shower", "Brush teeth", "Take meds", "Go outside", "Stretch"];

  await Promise.all(
    defaults.map((name, i) =>
      put<Habit>(STORES.habits, {
        id: uid("h"),
        name,
        order: i + 1,
        active: true,
        createdAt: now,
      })
    )
  );
}

export async function listActiveHabits(): Promise<Habit[]> {
  // your DB index is by_active on keyPath "active"
  // if you store active as boolean true/false, use true.
  // if you store 1/0, use 1.
  const habits = await getByIndex<Habit>(STORES.habits, "by_active", 1);
  return habits.sort((a, b) => a.order - b.order);
}

export async function getChecksForDate(dateKey: string): Promise<HabitCheck[]> {
  // IMPORTANT: your DB uses "date" field, not "dateKey"
  return getByIndex<HabitCheck>(STORES.habitChecks, "by_date", dateKey);
}

export async function getCheck(habitId: string, dateKey: string): Promise<HabitCheck | null> {
  const rows = await getByIndex<HabitCheck>(STORES.habitChecks, "by_habit_date", [habitId, dateKey] as any);
  return rows[0] ?? null;
}

export async function upsertHabitCheck(habitId: string, dateKey: string, status: HabitStatus) {
  const existing = await getCheck(habitId, dateKey);
  const now = Date.now();

  if (existing) {
    await put<HabitCheck>(STORES.habitChecks, { ...existing, status, updatedAt: now });
    return;
  }

  await put<HabitCheck>(STORES.habitChecks, {
    id: uid("hc"),
    habitId,
    date: dateKey,      // <-- IMPORTANT (matches your index.ts keyPath)
    status,
    updatedAt: now,
  } as any);
}
