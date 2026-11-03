// src/lib/localStore/index.ts
import { DB_NAME, DB_VERSION, STORES, type StoreName } from "./tables";

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureIndex(
  store: IDBObjectStore,
  indexName: string,
  keyPath: string | string[],
  opts?: IDBIndexParameters
) {
  if (!store.indexNames.contains(indexName)) {
    store.createIndex(indexName, keyPath as any, opts);
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = () => {
      const db = req.result;
      const tx = req.transaction!;

       // WIN ENTRIES (one per date, but allow edits => unique by_date is fine)
let wins: IDBObjectStore;
if (!db.objectStoreNames.contains(STORES.winEntries)) {
  wins = db.createObjectStore(STORES.winEntries, { keyPath: "id" });
} else {
  wins = req.transaction!.objectStore(STORES.winEntries);
}
if (wins.indexNames.contains("by_date")) wins.deleteIndex("by_date");
ensureIndex(wins, "by_date", "date", { unique: true });


      const must = (name: StoreName, keyPath: string) => {
        if (!db.objectStoreNames.contains(name)) {
          return db.createObjectStore(name, { keyPath });
        }
        const existing = tx.objectStore(name);
        if (existing.keyPath !== keyPath) {
          db.deleteObjectStore(name);
          return db.createObjectStore(name, { keyPath });
        }
        return existing;
      };

      // Core
      const daily = must(STORES.dailyGoals, "id");
      ensureIndex(daily, "by_date", "date");

      const mood = must(STORES.moodEntries, "id");
      ensureIndex(mood, "by_date", "date", { unique: true });

      const weekly = must(STORES.weeklyGoals, "id");
      ensureIndex(weekly, "by_week", "weekKey");

      must(STORES.weeklyMeta, "weekKey");

      const monthly = must(STORES.monthlyGoals, "id");
      ensureIndex(monthly, "by_month", "monthKey");

      must(STORES.monthlyMeta, "monthKey");

      const yearly = must(STORES.yearlyGoals, "id");
      ensureIndex(yearly, "by_year", "yearKey");

      must(STORES.yearlyMeta, "yearKey");

      // Habits
      const habits = must(STORES.habits, "id");
      ensureIndex(habits, "by_active", "active");
      ensureIndex(habits, "by_order", "order");

      const habitChecks = must(STORES.habitChecks, "id");
      ensureIndex(habitChecks, "by_date", "date");
      ensureIndex(habitChecks, "by_habit", "habitId");
      ensureIndex(habitChecks, "by_habit_date", ["habitId", "date"], { unique: true });

      // Self-care
      const selfCareItems = must(STORES.selfCareItems, "id");
      ensureIndex(selfCareItems, "by_active", "active");

      const selfCareEntries = must(STORES.selfCareEntries, "id");
      ensureIndex(selfCareEntries, "by_date", "date");

      // Affirmations
      const affirmations = must(STORES.affirmations, "id");
      ensureIndex(affirmations, "by_active", "active");

      // Wins
      wins = must(STORES.winEntries, "id");
      ensureIndex(wins, "by_date", "date");

      // Letters
      const letters = must(STORES.letters, "id");
      ensureIndex(letters, "by_section", "section");
      ensureIndex(letters, "by_createdAt", "createdAt");
    };
  });

  return dbPromise;
}

/* ------------------------------------------------------------------ */
/* ---------------------- PUBLIC DB HELPERS -------------------------- */
/* ------------------------------------------------------------------ */

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIndex<T>(
  store: StoreName,
  index: string,
  value: any
): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).index(index).getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function put<T extends { id: string }>(
  store: StoreName,
  value: T
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function bulkPut<T extends { id: string }>(
  store: StoreName,
  values: T[]
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(store: StoreName, key: any): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function del(store: StoreName, key: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

