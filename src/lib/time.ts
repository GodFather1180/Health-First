export function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function prettyDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert YYYY-MM-DD -> Date (local) at noon to avoid DST edge cases. */
export function dateKeyToDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Add/subtract days from a dateKey safely. */
export function addDays(dateKey: string, deltaDays: number) {
  const dt = dateKeyToDate(dateKey);
  dt.setDate(dt.getDate() + deltaDays);
  return todayKey(dt);
}

/** Monday-start week start for a given dateKey. */
export function weekStartKey(dateKey: string) {
  const dt = dateKeyToDate(dateKey);
  const day = dt.getDay(); // 0=Sun, 1=Mon...
  const diffToMon = (day + 6) % 7; // Mon -> 0, Sun -> 6
  dt.setDate(dt.getDate() - diffToMon);
  return todayKey(dt);
}

/** Week key is the Monday dateKey, like "2025-12-29" */
export function weekKeyFromDateKey(dateKey: string) {
  return weekStartKey(dateKey);
}

export function addWeeks(weekKey: string, deltaWeeks: number) {
  return addDays(weekKey, deltaWeeks * 7);
}

export function prettyWeekRange(weekKey: string) {
  const start = dateKeyToDate(weekKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return `${startStr} – ${endStr}`;
}

/** Month key: YYYY-MM */
export function monthKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function addMonths(monthKey: string, deltaMonths: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, m - 1, 1, 12, 0, 0);
  dt.setMonth(dt.getMonth() + deltaMonths);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export function prettyMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Year key: YYYY */
export function yearKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 4);
}

export function addYears(yearKey: string, deltaYears: number) {
  const y = Number(yearKey) + deltaYears;
  return String(y);
}
