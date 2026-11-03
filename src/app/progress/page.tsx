"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addDays, todayKey } from "@/lib/time";
import { getAll } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import type { Habit, HabitCheck, MoodEntry, Mood } from "@/types/domain";

type MetricKey = "HABITS" | "MOOD";
type ChartKey = "LINE" | "HIST" | "GRID";
type ViewKey = "WEEK" | "MONTH" | "7D" | "30D" | "75D" | "CUSTOM";

const BAD_DAY_KEY = "healthfirst_bad_day_mode";

const sideLinks = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/self-care", label: "Self-Care", icon: "✿" },
  { href: "/goals/daily", label: "Daily", icon: "✓" },
  { href: "/win", label: "Win", icon: "★" },
  { href: "/mood", label: "Mood", icon: "☺" },
  { href: "/progress", label: "Progress", icon: "↗" },
  { href: "/goals/weekly", label: "Weekly", icon: "▦" },
  { href: "/goals/monthly", label: "Monthly", icon: "☾" },
  { href: "/goals/yearly", label: "Yearly", icon: "✶" },
  { href: "/affirmations", label: "Affirmations", icon: "❀" },
  { href: "/letters", label: "Letters", icon: "✉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

const moodToScore: Record<Mood, number> = {
  SHIT: 1,
  BAD: 2,
  MEH: 3,
  GOOD: 4,
  SLAYING: 5,
};

const HABIT_COLORS = {
  done: "#22c55e",
  partial: "#3b82f6",
  missed: "#9ca3af",
};

const MOOD_COLORS = {
  shit: "#ef4444",
  bad: "#f97316",
  meh: "#9ca3af",
  good: "#22c55e",
  slaying: "#14b8a6",
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function formatPct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function parseKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toKeyUTC(dt: Date) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function startOfWeekUTC(dateKey: string) {
  const dt = parseKey(dateKey);
  const day = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const mondayOffset = (day + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - mondayOffset);
  return toKeyUTC(dt);
}
function startOfMonthUTC(dateKey: string) {
  const dt = parseKey(dateKey);
  dt.setUTCDate(1);
  return toKeyUTC(dt);
}
function addWeeks(dateKey: string, weeks: number) {
  return addDays(dateKey, weeks * 7);
}
function addMonths(dateKey: string, months: number) {
  const dt = parseKey(dateKey);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return toKeyUTC(dt);
}
function dateKeysForWeek(weekStartKey: string) {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) keys.push(addDays(weekStartKey, i));
  return keys;
}
function dateKeysForMonth(monthStartKey: string) {
  const start = parseKey(monthStartKey);
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const keys: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    keys.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return keys;
}

function safeInt(n: any, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.floor(v);
}

export default function ProgressPage() {
  const path = usePathname();

  const [badDay, setBadDay] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);

  useEffect(() => {
    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  const [view, setView] = useState<ViewKey>("7D");
  const [metric, setMetric] = useState<MetricKey>("HABITS");
  const [chartType, setChartType] = useState<ChartKey>("GRID");
  const [anchorKey, setAnchorKey] = useState<string>(todayKey());

  // Custom range: start date + number of days
  const [customStartKey, setCustomStartKey] = useState<string>(() => startOfMonthUTC(todayKey()));
  const [customDays, setCustomDays] = useState<number>(31);

  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checksByDate, setChecksByDate] = useState<Record<string, Record<string, HabitCheck>>>({});
  const [dayRows, setDayRows] = useState<
    {
      dateKey: string;
      total: number;
      done: number;
      partial: number;
      missed: number;
      effort: number; // 0..1
      moodScore?: number;
    }[]
  >([]);

  const dateKeys = useMemo(() => {
    const t = todayKey();

    if (view === "7D") return Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
    if (view === "30D") return Array.from({ length: 30 }, (_, i) => addDays(t, i - 29));
    if (view === "75D") return Array.from({ length: 75 }, (_, i) => addDays(t, i - 74));

    if (view === "WEEK") return dateKeysForWeek(startOfWeekUTC(anchorKey));
    if (view === "MONTH") return dateKeysForMonth(startOfMonthUTC(anchorKey));

    // CUSTOM
    const days = Math.min(365, Math.max(1, safeInt(customDays, 30)));
    return Array.from({ length: days }, (_, i) => addDays(customStartKey, i));
  }, [view, anchorKey, customStartKey, customDays]);

  const title = useMemo(() => {
    if (view === "7D") return "Last 7 days";
    if (view === "30D") return "Last 30 days";
    if (view === "75D") return "Last 75 days";
    if (view === "WEEK") {
      const s = startOfWeekUTC(anchorKey);
      const e = addDays(s, 6);
      return `Week: ${s} → ${e}`;
    }
    if (view === "MONTH") {
      const s = startOfMonthUTC(anchorKey);
      return `Month: ${s.slice(0, 7)}`;
    }

    // CUSTOM
    const days = Math.min(365, Math.max(1, safeInt(customDays, 30)));
    const endKey = addDays(customStartKey, days - 1);
    return `Custom: ${customStartKey} → ${endKey} (${days} days)`;
  }, [view, anchorKey, customStartKey, customDays]);

  const labelEvery = useMemo(() => {
    const n = dateKeys.length;
    if (n >= 75) return 5;
    if (n >= 45) return 3;
    if (n >= 28) return 2;
    if (view === "MONTH" || view === "30D") return 4;
    return 1;
  }, [view, dateKeys.length]);

  const canNav = view === "WEEK" || view === "MONTH";
  function goPrev() {
    if (view === "WEEK") setAnchorKey((k) => addWeeks(k, -1));
    else if (view === "MONTH") setAnchorKey((k) => addMonths(k, -1));
  }
  function goNext() {
    if (view === "WEEK") setAnchorKey((k) => addWeeks(k, 1));
    else if (view === "MONTH") setAnchorKey((k) => addMonths(k, 1));
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const [allHabits, allChecks, allMoods] = await Promise.all([
        getAll<Habit>(STORES.habits),
        getAll<HabitCheck>(STORES.habitChecks),
        getAll<MoodEntry>(STORES.moodEntries),
      ]);

      const activeHabits = allHabits
        .filter((h: any) => h.active === true || h.active === 1 || h.active === "true")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const checksMap: Record<string, Record<string, HabitCheck>> = {};
      for (const c of allChecks as any[]) {
        const dk = c.date ?? c.dateKey;
        if (!dk) continue;
        if (!checksMap[dk]) checksMap[dk] = {};
        if (c.habitId) checksMap[dk][c.habitId] = c as HabitCheck;
      }

      const moodByDate: Record<string, MoodEntry> = {};
      for (const m of allMoods as any[]) {
        const dk = m.date ?? m.dateKey;
        if (!dk) continue;
        moodByDate[dk] = m as MoodEntry;
      }

      const rows = dateKeys.map((dateKey) => {
        const perHabit = checksMap[dateKey] ?? {};
        let done = 0;
        let partial = 0;
        let missed = 0;

        for (const h of activeHabits) {
          const s = (perHabit as any)[h.id]?.status ?? "SKIPPED";
          if (s === "DONE") done++;
          else if (s === "PARTIAL") partial++;
          else missed++;
        }

        const total = activeHabits.length;
        const effort = total ? clamp01((done * 1 + partial * 0.5) / total) : 0;

        const mood = (moodByDate[dateKey] as any)?.mood as Mood | undefined;
        const moodScore = mood ? moodToScore[mood] : undefined;

        return { dateKey, total, done, partial, missed, effort, moodScore };
      });

      if (!alive) return;
      setHabits(activeHabits);
      setChecksByDate(checksMap);
      setDayRows(rows);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKeys.join("|")]);

  const stats = useMemo(() => {
    const total = dayRows.reduce((s, r) => s + r.total, 0);
    const done = dayRows.reduce((s, r) => s + r.done, 0);

    const effortAvg = mean(dayRows.map((r) => r.effort));
    const doneRate = total ? done / total : 0;

    const moodScores = dayRows.map((r) => r.moodScore).filter((v): v is number => typeof v === "number");
    const moodAvg = mean(moodScores);
    const moodDays = moodScores.length;

    return { total, doneRate, effortAvg, moodAvg, moodDays };
  }, [dayRows]);

  const labels = useMemo(() => dayRows.map((r) => r.dateKey.slice(5)), [dayRows]);

  return (
    <div className="shell">
      <button
        className={`overlay ${navOpen ? "overlayOn" : ""}`}
        aria-label="Close sidebar"
        onClick={() => setNavOpen(false)}
      />

      <aside className={`sidebar ${navOpen ? "sidebarOpen" : ""}`}>
        <button
          className="brandBtn"
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <div className="logoDot" />
          <div className="brandText">
            <div className="brandTop">Health First</div>
            <div className="brandSub">{badDay ? "Rest Mode" : "Your Wellness Space"}</div>
          </div>
          <div className="brandChevron" aria-hidden>
            {navOpen ? "×" : "≡"}
          </div>
        </button>

        <nav className="nav" aria-label="Sidebar">
          {sideLinks.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`navItem ${active ? "active" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                <span className="navIcon">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {badDay ? (
          <button className="cta" onClick={() => setBadDay(false)}>
            Turn off Bad Day Mode
          </button>
        ) : (
          <button className="cta" onClick={() => setBadDay(true)}>
            Bad Day Mode <span className="ctaRight">Turn on</span>
          </button>
        )}

        <div className="sideHint">{badDay ? "Go gentle today" : "One step at a time"}</div>
      </aside>

      <main className="main">
        <div className="mobileTopbar">
          <button className="mobileMenuBtn" type="button" onClick={() => setNavOpen(true)} aria-label="Open sidebar">
            <span className="mobileMenuIcon">≡</span>
            <span className="mobileMenuText">Health First</span>
          </button>
        </div>

        <div className="content">
          <div className="headerRow">
            <div>
              <div className="muted">Tracking</div>
              <div className="h1">Progress</div>
              <div className="sub">{title}</div>
            </div>

            <div className="kpiRow">
              <Kpi label="Habits" value={String(habits.length)} />
              <Kpi label="Follow-through" value={formatPct(stats.doneRate)} />
              <Kpi label="Avg effort" value={formatPct(stats.effortAvg)} />
              <Kpi label="Mood days" value={String(stats.moodDays)} />
            </div>
          </div>

          <div className="toolbar">
            <div className="group">
              <Pill active={view === "WEEK"} onClick={() => setView("WEEK")}>
                Week
              </Pill>
              <Pill active={view === "MONTH"} onClick={() => setView("MONTH")}>
                Month
              </Pill>
              <Pill active={view === "7D"} onClick={() => setView("7D")}>
                Last 7
              </Pill>
              <Pill active={view === "30D"} onClick={() => setView("30D")}>
                Last 30
              </Pill>
              <Pill active={view === "75D"} onClick={() => setView("75D")}>
                Last 75
              </Pill>
              <Pill active={view === "CUSTOM"} onClick={() => setView("CUSTOM")}>
                Custom
              </Pill>
            </div>

            {canNav ? (
              <div className="group">
                <Pill onClick={goPrev}>←</Pill>
                <Pill onClick={() => setAnchorKey(todayKey())}>Today</Pill>
                <Pill onClick={goNext}>→</Pill>
              </div>
            ) : null}

            <div className="group">
              <Pill active={metric === "HABITS"} onClick={() => setMetric("HABITS")}>
                Self-care
              </Pill>
              <Pill active={metric === "MOOD"} onClick={() => setMetric("MOOD")}>
                Mood
              </Pill>
            </div>

            <div className="group">
              <Pill active={chartType === "LINE"} onClick={() => setChartType("LINE")}>
                Dotted line
              </Pill>
              <Pill active={chartType === "HIST"} onClick={() => setChartType("HIST")}>
                Histogram
              </Pill>
              <Pill active={chartType === "GRID"} onClick={() => setChartType("GRID")}>
                Grid
              </Pill>
            </div>

            {view === "CUSTOM" ? (
              <div className="group customRange">
                <div className="customLabel">From</div>
                <input
                  className="customInput"
                  type="date"
                  value={customStartKey}
                  onChange={(e) => setCustomStartKey(e.target.value)}
                />
                <div className="customLabel">Days</div>
                <input
                  className="customInput"
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.min(365, Math.max(1, Number(e.target.value) || 1)))}
                />
                <button
                  className="customQuick"
                  type="button"
                  onClick={() => {
                    setCustomStartKey(startOfMonthUTC(todayKey()));
                    setCustomDays(31);
                  }}
                >
                  Jan vibe
                </button>
              </div>
            ) : null}
          </div>

          {loading ? <div className="mutedBlock">Loading…</div> : null}

          {!loading ? (
            <div className="card">
              {metric === "HABITS" ? (
                <>
                  <div className="cardTop">
                    <div>
                      <div className="muted">Self-care</div>
                      <div className="h2">Habits</div>
                    </div>
                    <div className="chip">Done=1 • Partial=0.5 • Missed=0</div>
                  </div>

                  {chartType === "LINE" ? (
                    <PrettyDottedLineChart
                      values={dayRows.map((r) => r.effort)}
                      labels={labels}
                      labelEvery={labelEvery}
                      min={0}
                      max={1}
                      height={260}
                      stroke="#111827"
                    />
                  ) : chartType === "HIST" ? (
                    <PrettyStackedHistogram
                      labels={labels}
                      labelEvery={labelEvery}
                      series={[
                        { name: "Done", values: dayRows.map((r) => r.done), color: HABIT_COLORS.done },
                        { name: "Partial", values: dayRows.map((r) => r.partial), color: HABIT_COLORS.partial },
                        { name: "Missed", values: dayRows.map((r) => r.missed), color: HABIT_COLORS.missed },
                      ]}
                      height={270}
                    />
                  ) : (
                    <HabitsGridWithTrend
                      dateKeys={dayRows.map((r) => r.dateKey)}
                      habits={habits}
                      checksByDate={checksByDate}
                      effortValues={dayRows.map((r) => r.effort)}
                    />
                  )}

                  <Legend
                    items={[
                      { label: "Done", color: HABIT_COLORS.done },
                      { label: "Partial", color: HABIT_COLORS.partial },
                      { label: "Missed", color: HABIT_COLORS.missed },
                    ]}
                  />
                </>
              ) : (
                <>
                  <div className="cardTop">
                    <div>
                      <div className="muted">Check-ins</div>
                      <div className="h2">Mood</div>
                    </div>
                    <div className="chip">{stats.moodDays ? `Avg ${stats.moodAvg.toFixed(1)} / 5` : "No check-ins yet"}</div>
                  </div>

                  {chartType === "LINE" ? (
                    <PrettyDottedLineChart
                      values={dayRows.map((r) => r.moodScore ?? null)}
                      labels={labels}
                      labelEvery={labelEvery}
                      min={1}
                      max={5}
                      height={260}
                      stroke="#111827"
                    />
                  ) : chartType === "HIST" ? (
                    <MoodHistogram rows={dayRows} />
                  ) : (
                    <PrettyMoodDayHistogram labels={labels} labelEvery={labelEvery} rows={dayRows} height={270} />
                  )}

                  <Legend
                    items={[
                      { label: "shit", color: MOOD_COLORS.shit },
                      { label: "bad", color: MOOD_COLORS.bad },
                      { label: "meh", color: MOOD_COLORS.meh },
                      { label: "good", color: MOOD_COLORS.good },
                      { label: "slaying", color: MOOD_COLORS.slaying },
                    ]}
                  />
                </>
              )}
            </div>
          ) : null}
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

/* ---------- tiny components ---------- */

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`pill ${active ? "pillActive" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="kpiValue">{value}</div>
      <div className="kpiLabel">{label}</div>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <div key={it.label} className="legendItem">
          <span className="dot" style={{ background: it.color }} />
          <span className="legendLabel">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- styles (same vibe as Daily) ---------- */

const styles = `
:global(html, body){
  background: var(--bg0);
  color: var(--text);
}

.shell{
  min-height: 100vh;
  display:grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 16px;
  position: relative;
  color: var(--text);

  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.18), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.12), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.10), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
}

/* overlay */
.overlay{ display:none; border:0; padding:0; background: transparent; }
@media (max-width: 980px){
  .overlay{
    display:block;
    position:fixed;
    inset:0;
    background: rgba(0,0,0,0.45);
    opacity:0;
    pointer-events:none;
    transition: opacity 160ms ease;
    z-index:40;
  }
}
.overlayOn{ opacity: 1; pointer-events: auto; }

/* sidebar */
.sidebar{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: 24px;
  padding: 12px 16px 16px;
  backdrop-filter: blur(14px);
  display:flex;
  flex-direction:column;
  gap: 14px;
  box-shadow: 0 30px 80px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.08);
}

.brandBtn{
  border:0;
  background: transparent;
  padding: 10px 8px 8px;
  border-radius: 16px;
  display:flex;
  align-items:center;
  gap: 10px;
  cursor: pointer;
  text-align:left;
  color: inherit;
}
.brandBtn:hover{ background: rgba(124,58,237,.12); }

.logoDot{
  width: 14px; height: 14px; border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #fff, #a78bfa, #7c3aed);
  box-shadow: 0 14px 34px rgba(124,58,237,.28);
  flex: 0 0 auto;
}

.brandText{ flex: 1 1 auto; min-width: 0; }
.brandTop{ font-weight: 1000; letter-spacing: -.2px; }
.brandSub{ font-size: 12px; opacity: .72; margin-top: 1px; }

.brandChevron{
  display:none;
  width: 36px; height: 36px;
  border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.22);
  color: var(--text);
  font-weight: 1000;
}

.nav{ display:flex; flex-direction:column; gap: 6px; padding: 4px; }

.navItem{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 12px; border-radius: 16px;
  color: var(--text); opacity:.92;
  border: 1px solid transparent;
  text-decoration:none;
}
.navItem:hover{ opacity: 1; border-color: var(--border); background: rgba(124,58,237,.12); }
.navItem.active{
  opacity: 1;
  background: linear-gradient(90deg, rgba(124,58,237,.18), rgba(255,255,255,.04));
  border-color: rgba(124,58,237,.30);
}

.navIcon{
  width: 28px; height: 28px; display:grid; place-items:center;
  border-radius: 12px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.22);
  font-size: 12px; color: var(--text);
}

.cta{
  margin-top: 6px;
  border: 1px solid rgba(124,58,237,.28);
  background: linear-gradient(90deg, rgba(124,58,237,.20), rgba(167,139,250,.12));
  color: var(--text);
  padding: 12px 14px; border-radius: 18px;
  font-weight: 1000; cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap: 10px;
  box-shadow: 0 18px 40px rgba(0,0,0,.12);
}
.ctaRight{
  font-weight: 1000; opacity: .9;
  padding: 6px 10px; border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(124,58,237,.22);
}
.sideHint{
  margin-top:auto;
  font-size: 12px;
  color: var(--muted);
  padding: 10px 12px; border-radius: 16px;
  border: 1px dashed rgba(124,58,237,.30);
  background: rgba(255,255,255,.06);
}

/* main */
.main{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: 24px;
  backdrop-filter: blur(14px);
  overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow: 0 30px 90px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.08);
}

/* mobile top bar opener */
.mobileTopbar{ display:none; padding: 12px 12px 0; }
.mobileMenuBtn{
  display:inline-flex; align-items:center; gap:10px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 10px 12px;
  font-weight: 1100;
  color: var(--text);
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(0,0,0,.10);
}
.mobileMenuIcon{
  width: 34px; height: 34px;
  display:grid; place-items:center;
  border-radius: 14px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.22);
  font-weight: 1200;
}
.mobileMenuText{ font-size: 14px; }

.content{ padding: 16px; }

.headerRow{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.h1{ font-size: 40px; font-weight: 1100; letter-spacing: -.5px; margin-top: 2px; }
.muted{ font-size: 12px; color: var(--muted); font-weight: 950; letter-spacing: .2px; }
.sub{ color: var(--muted); font-weight: 900; margin-top: 6px; }

.kpiRow{
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px;
  min-width: 300px;
}
.kpi{
  border-radius: 18px;
  padding: 12px 12px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.10);
}
.kpiValue{ font-size: 20px; font-weight: 1100; color: var(--text); }
.kpiLabel{ font-size: 11px; color: var(--muted); font-weight: 950; margin-top: 4px; }

.toolbar{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items:center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  box-shadow: 0 14px 30px rgba(0,0,0,.10);
  margin-bottom: 12px;
}
.group{ display:flex; gap: 8px; flex-wrap:wrap; align-items:center; }

.pill{
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  font-weight: 1000;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
}
.pillActive{
  background: linear-gradient(180deg, #111827, #0b1220);
  border-color: rgba(17,24,39,.92);
  color: #fff;
  box-shadow: 0 10px 22px rgba(0,0,0,.25);
}

.customRange{
  padding-left: 6px;
  border-left: 1px dashed rgba(124,58,237,.28);
  margin-left: 2px;
}
.customLabel{
  font-size: 12px;
  color: var(--muted);
  font-weight: 950;
}
.customInput{
  height: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  color: var(--text);
  font-weight: 900;
}
.customQuick{
  height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(124,58,237,.28);
  background: rgba(124,58,237,.12);
  color: var(--text);
  font-weight: 1000;
  cursor: pointer;
}

.card{
  background: var(--card);
  color: var(--text);
  border-radius: 20px;
  border: 1px solid var(--border);
  box-shadow: 0 22px 60px rgba(0,0,0,.14);
  padding: 16px;
  overflow: hidden;
}
.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
.h2{ font-size: 26px; font-weight: 1100; margin-top: 2px; letter-spacing: -.4px; }

.chip{
  padding: 8px 10px; border-radius: 999px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.24);
  color: var(--text);
  font-weight: 1000; font-size: 12px;
}

.mutedBlock{ margin-top: 12px; color: var(--muted); font-weight: 950; }

.legend{
  display:flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.legendItem{ display:flex; align-items:center; gap: 8px; opacity: .92; }
.dot{ width: 12px; height: 12px; border-radius: 999px; display:inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.14); }
.legendLabel{ font-size: 13px; font-weight: 800; }

/* mobile */
@media (max-width: 980px){
  .shell{ grid-template-columns: 1fr; padding: 12px; gap: 12px; }
  .mobileTopbar{ display:block; }

  .sidebar{
    position: fixed;
    left: 12px;
    top: 12px;
    bottom: 12px;
    width: min(320px, calc(100vw - 24px));
    transform: translateX(calc(-100% - 18px));
    transition: transform 180ms ease;
    z-index: 60;
    overflow: auto;
  }
  .sidebarOpen{ transform: translateX(0); }
  .brandChevron{ display:grid; }

  .headerRow{ flex-direction:column; }
  .kpiRow{ min-width: 0; grid-template-columns: repeat(2, minmax(0,1fr)); width: 100%; }
}
`;

/* ---------- Charts ---------- */

function PrettyDottedLineChart({
  values,
  labels,
  labelEvery,
  min,
  max,
  height,
  stroke,
}: {
  values: (number | null)[];
  labels: string[];
  labelEvery: number;
  min: number;
  max: number;
  height: number;
  stroke: string;
}) {
  const n = labels.length;
  const stepX = n <= 10 ? 54 : 22;
  const width = Math.max(560, 70 + (n - 1) * stepX + 50);

  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 64;

  const innerH = height - padTop - padBottom;
  const range = max - min || 1;
  const baselineY = padTop + innerH;

  const points = values.map((v, i) => {
    const x = padLeft + i * stepX;
    if (v == null) return null;
    const t = (v - min) / range;
    const y = padTop + (1 - t) * innerH;
    return { x, y };
  });

  const paths: string[] = [];
  let cur: string[] = [];
  points.forEach((p) => {
    if (!p) {
      if (cur.length) paths.push(cur.join(" "));
      cur = [];
      return;
    }
    cur.push(cur.length === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`);
  });
  if (cur.length) paths.push(cur.join(" "));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <rect x={6} y={6} width={width - 12} height={height - 12} rx={16} fill="white" stroke="#e5e7eb" />
        {[0.25, 0.5, 0.75].map((t) => {
          const y = padTop + (1 - t) * innerH;
          return <line key={t} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#eef2f7" />;
        })}
        <line x1={padLeft} y1={baselineY} x2={width - padRight} y2={baselineY} stroke="#9ca3af" />
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={stroke} strokeWidth={3} strokeDasharray="6 7" />
        ))}
        {points.map((p, i) => (p ? <circle key={i} cx={p.x} cy={p.y} r={4} fill={stroke} /> : null))}
        {labels.map((lab, i) => {
          if (i % labelEvery !== 0 && i !== labels.length - 1) return null;
          const x = padLeft + i * stepX;
          const y = baselineY + 24;
          return (
            <text key={i} x={x} y={y} fontSize="11" textAnchor="end" fill="#111827" transform={`rotate(-35 ${x} ${y})`}>
              {lab}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function PrettyStackedHistogram({
  labels,
  labelEvery,
  series,
  height,
}: {
  labels: string[];
  labelEvery: number;
  series: { name: string; values: number[]; color: string }[];
  height: number;
}) {
  const n = labels.length;
  const stepX = n <= 10 ? 54 : 22;
  const width = Math.max(560, 70 + (n - 1) * stepX + 50);

  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 64;

  const innerH = height - padTop - padBottom;
  const baselineY = padTop + innerH;

  const totals = Array.from({ length: n }, (_, i) => series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  const maxTotal = Math.max(1, ...totals);
  const barW = n <= 10 ? 18 : 10;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <rect x={6} y={6} width={width - 12} height={height - 12} rx={16} fill="white" stroke="#e5e7eb" />
        {[0.25, 0.5, 0.75].map((t) => {
          const y = padTop + (1 - t) * innerH;
          return <line key={t} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#eef2f7" />;
        })}
        <line x1={padLeft} y1={baselineY} x2={width - padRight} y2={baselineY} stroke="#9ca3af" />

        {Array.from({ length: n }, (_, i) => {
          const xCenter = padLeft + i * stepX;
          let yCursor = baselineY;

          return (
            <g key={i}>
              {series.map((ser, idx) => {
                const v = ser.values[i] ?? 0;
                if (v <= 0) return null;
                const h = (v / maxTotal) * innerH;
                yCursor -= h;
                const rx = idx === series.length - 1 ? 8 : 0;
                return (
                  <rect
                    key={ser.name}
                    x={xCenter - barW / 2}
                    y={yCursor}
                    width={barW}
                    height={h}
                    rx={rx}
                    fill={ser.color}
                    opacity={0.95}
                  />
                );
              })}

              {i % labelEvery === 0 || i === labels.length - 1 ? (
                <text
                  x={xCenter}
                  y={baselineY + 24}
                  fontSize="11"
                  textAnchor="end"
                  fill="#111827"
                  transform={`rotate(-35 ${xCenter} ${baselineY + 24})`}
                >
                  {labels[i]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- Mood histogram ---------- */

function MoodHistogram({ rows }: { rows: { moodScore?: number }[] }) {
  const moods = [
    { key: "shit", score: 1, color: MOOD_COLORS.shit },
    { key: "bad", score: 2, color: MOOD_COLORS.bad },
    { key: "meh", score: 3, color: MOOD_COLORS.meh },
    { key: "good", score: 4, color: MOOD_COLORS.good },
    { key: "slaying", score: 5, color: MOOD_COLORS.slaying },
  ] as const;

  const counts = moods.map((m) => rows.filter((r) => r.moodScore === m.score).length);
  const maxCount = Math.max(1, ...counts);

  const W = 720;
  const H = 260;
  const padL = 22;
  const padR = 22;
  const padT = 18;
  const padB = 78;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const n = moods.length;
  const slot = innerW / n;
  const barW = Math.min(72, slot * 0.55);

  const baselineY = padT + innerH;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        <rect x={6} y={6} width={W - 12} height={H - 12} rx={16} fill="white" stroke="#e5e7eb" />

        {[0.25, 0.5, 0.75].map((t) => {
          const y = padT + (1 - t) * innerH;
          return <line key={t} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#eef2f7" />;
        })}
        <line x1={padL} y1={baselineY} x2={W - padR} y2={baselineY} stroke="#9ca3af" />

        {moods.map((m, i) => {
          const cx = padL + i * slot + slot / 2;
          const c = counts[i];
          const h = (c / maxCount) * innerH;
          const y = baselineY - h;

          return (
            <g key={m.key}>
              <rect x={cx - barW / 2} y={y} width={barW} height={h} rx={14} fill={m.color} opacity={0.95} />

              <text x={cx} y={Math.max(padT + 12, y - 8)} fontSize="12" textAnchor="middle" fill="#111827" fontWeight={900}>
                {c}
              </text>

              <text x={cx} y={baselineY + 28} fontSize="12" textAnchor="middle" fill={m.color} fontWeight={950}>
                {m.key}
              </text>

              <circle cx={cx} cy={baselineY + 46} r={5} fill={m.color} opacity={0.95} />
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: 8, opacity: 0.72, fontSize: 13 }}>Mood histogram (counts in selected time period)</div>
    </div>
  );
}

/* ---------- Notebook Grid + Effort Line ---------- */

function HabitsGridWithTrend({
  dateKeys,
  habits,
  checksByDate,
  effortValues,
}: {
  dateKeys: string[];
  habits: Habit[];
  checksByDate: Record<string, Record<string, HabitCheck>>;
  effortValues: number[];
}) {
  const labelEveryTop = dateKeys.length >= 70 ? 5 : dateKeys.length >= 40 ? 3 : dateKeys.length >= 28 ? 2 : 1;

  return (
    <div>
      <NotebookHabitGridTopDates dateKeys={dateKeys} habits={habits} checksByDate={checksByDate} labelEvery={labelEveryTop} />
      <div style={{ marginTop: 20 }}>
        <NotebookEffortLine values={effortValues} />
      </div>
    </div>
  );
}

/* ---------- Notebook grid: DATES ON TOP, HABITS ON SIDE ---------- */

function NotebookHabitGridTopDates({
  dateKeys,
  habits,
  checksByDate,
  labelEvery = 1, // kept for compatibility, but we’ll show every date
}: {
  dateKeys: string[];
  habits: Habit[];
  checksByDate: Record<string, Record<string, HabitCheck>>;
  labelEvery?: number;
}) {
  const cols = Math.max(1, dateKeys.length);
  const rows = Math.max(1, habits.length);

  // We want the whole grid to fit without horizontal scroll.
  // Pick a "target" drawable width for the grid area (not including habit labels).
  const TARGET_GRID_W = 920;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Smaller cells as columns grow, but keep them readable.
  // Compute a cell size that makes (cols * cell + gaps) ~= TARGET_GRID_W
const gap = cols >= 120 ? 2 : cols >= 70 ? 3 : cols >= 40 ? 4 : 8;
  const rawCell = (TARGET_GRID_W + gap) / cols - gap;
  const cell = clamp(Math.floor(rawCell), cols >= 120 ? 5 : 6, cols >= 28 ? 12 : 16);

  // With the chosen cell, compute exact inner width.
  const innerW = cols * (cell + gap) - gap;
  const innerH = rows * (cell + gap) - gap;

  // Layout pads (habit labels on the left, date labels on top)
  const leftPad = cols >= 70 ? 88 : cols >= 40 ? 104 : 130;
  const topPad = cols >= 40 ? 66 : 52;
  const outerPad = 16;

  const W = outerPad * 2 + leftPad + innerW + 12;
  const H = outerPad * 2 + topPad + innerH + 12;

  const paper = "#fffdf8";
  const gridLine = "#eef2f7";
  const ink = "#111827";
  const pencil = "#6b7280";

  const gridX = outerPad + leftPad;
  const gridY = outerPad + topPad;

  const rotate = cols >= 18 ? -35 : 0;
  const dateFont = cols >= 120 ? 7 : cols >= 75 ? 8 : cols >= 40 ? 9 : 12;

  // Habit label truncation
  const maxName = cols >= 70 ? 9 : cols >= 40 ? 12 : 18;

  function statusFor(dateKey: string, habitId: string) {
    return checksByDate[dateKey]?.[habitId]?.status ?? "SKIPPED";
  }

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <rect x={6} y={6} width={W - 12} height={H - 12} rx={18} fill={paper} stroke="#e5e7eb" />

        <rect
          x={gridX - 10}
          y={gridY - 10}
          width={innerW + 20}
          height={innerH + 20}
          rx={14}
          fill="transparent"
          stroke="#cbd5e1"
        />

        {/* date labels (SHOW EVERY DATE) */}
        {dateKeys.map((dk, c) => {
          const dayNum = Number(dk.slice(8, 10));
          const x = gridX + c * (cell + gap) + cell / 2;
const y = outerPad + (cols >= 40 ? 54 : 40);

          return (
            <g key={dk}>
              <text
                x={x}
                y={y}
                fontSize={dateFont}
                fill={ink}
                textAnchor={rotate ? "end" : "middle"}
                fontWeight={800}
                transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
              >
                {dayNum}
              </text>
              <line x1={x - 6} y1={y + 6} x2={x + 6} y2={y + 6} stroke="#d1d5db" />
            </g>
          );
        })}

        {/* habits + cells */}
        {habits.map((h, r) => {
          const y = gridY + r * (cell + gap);
          const name = h.name.length > maxName ? h.name.slice(0, maxName) + "…" : h.name;

          return (
            <g key={h.id}>
              <text
                x={outerPad + leftPad - 14}
                y={y + cell - 2}
                fontSize={cols >= 75 ? 10 : 12}
                fill={pencil}
                textAnchor="end"
                fontWeight={800}
              >
                {name}
              </text>

              {dateKeys.map((dk, c) => {
                const x = gridX + c * (cell + gap);
                const s = statusFor(dk, h.id);

                return (
                  <g key={dk}>
                    <rect x={x} y={y} width={cell} height={cell} rx={4} fill="#ffffff" stroke={gridLine} />

                    {s === "DONE" ? (
                      <>
                        <line
                          x1={x + cell * 0.25}
                          y1={y + cell * 0.55}
                          x2={x + cell * 0.45}
                          y2={y + cell * 0.75}
                          stroke={HABIT_COLORS.done}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        />
                        <line
                          x1={x + cell * 0.45}
                          y1={y + cell * 0.75}
                          x2={x + cell * 0.78}
                          y2={y + cell * 0.28}
                          stroke={HABIT_COLORS.done}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        />
                      </>
                    ) : null}

                    {s === "PARTIAL" ? (
                      <>
                        <line
                          x1={x + 3}
                          y1={y + 3}
                          x2={x + cell - 3}
                          y2={y + cell - 3}
                          stroke={HABIT_COLORS.partial}
                          strokeWidth={2}
                        />
                        <line
                          x1={x + cell - 3}
                          y1={y + 3}
                          x2={x + 3}
                          y2={y + cell - 3}
                          stroke={HABIT_COLORS.partial}
                          strokeWidth={2}
                        />
                      </>
                    ) : null}

                    {s === "SKIPPED" ? (
                      <circle
                        cx={x + cell / 2}
                        cy={y + cell / 2}
                        r={Math.max(2.3, cell * 0.18)}
                        fill={HABIT_COLORS.missed}
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div style={{ display: "flex", gap: 14, marginTop: 10, alignItems: "center", opacity: 0.9, flexWrap: "wrap" }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: HABIT_COLORS.done }} />
          Done
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: HABIT_COLORS.partial }} />
          Partial
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: HABIT_COLORS.missed }} />
          Missed
        </span>
      </div>
    </div>
  );
}



/* ---------- Effort chart ---------- */

function NotebookEffortLine({ values }: { values: number[] }) {
  const n = values.length;

  const W = 640;
  const H = 220;
  const padLeft = 18;
  const padRight = 46;
  const padTop = 18;
  const padBottom = 26;

  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const scaled = values.map((v) => v * 10);
  const denom = Math.max(1, n - 1);

  const pts = scaled.map((v, i) => {
    const x = padLeft + (i / denom) * innerW;
    const t = v / 10;
    const y = padTop + (1 - t) * innerH;
    return { x, y };
  });

  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const axisX = W - padRight + 18;

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        <rect x={6} y={6} width={W - 12} height={H - 12} rx={18} fill="#fffdf8" stroke="#e5e7eb" />

        {[2, 4, 6, 8].map((t) => {
          const y = padTop + (1 - t / 10) * innerH;
          return <line key={t} x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="#eef2f7" />;
        })}

        <line x1={axisX} y1={padTop} x2={axisX} y2={padTop + innerH} stroke="#94a3b8" strokeWidth={2} />
        {Array.from({ length: 11 }, (_, i) => {
          const y = padTop + (1 - i / 10) * innerH;
          return <circle key={i} cx={axisX} cy={y} r={i % 2 === 0 ? 2.3 : 1.6} fill="#111827" opacity={i % 2 === 0 ? 0.9 : 0.55} />;
        })}

        <path d={d} fill="none" stroke="#ef4444" strokeWidth={3} />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.2} fill="#ef4444" />
        ))}

        <text x={padLeft} y={H - 10} fontSize="12" fill="#6b7280">
          Effort (0–10)
        </text>
      </svg>

      <div style={{ marginTop: 8, opacity: 0.72, fontSize: 13 }}>Effort trend (notebook style)</div>
    </div>
  );
}

function PrettyMoodDayHistogram({
  labels,
  labelEvery,
  rows,
  height,
}: {
  labels: string[];
  labelEvery: number;
  rows: { moodScore?: number }[];
  height: number;
}) {
  const n = labels.length;
  const stepX = n <= 10 ? 54 : 22;
  const width = Math.max(560, 70 + (n - 1) * stepX + 50);

  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 64;

  const innerH = height - padTop - padBottom;
  const baselineY = padTop + innerH;

  const values = rows.map((r) => (typeof r.moodScore === "number" ? 1 : 0));
  const maxV = 1;

  const barW = n <= 10 ? 18 : 10;

  function colorFor(score?: number) {
    if (score === 1) return MOOD_COLORS.shit;
    if (score === 2) return MOOD_COLORS.bad;
    if (score === 3) return MOOD_COLORS.meh;
    if (score === 4) return MOOD_COLORS.good;
    if (score === 5) return MOOD_COLORS.slaying;
    return "#e5e7eb";
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <rect x={6} y={6} width={width - 12} height={height - 12} rx={16} fill="white" stroke="#e5e7eb" />

        {[0.25, 0.5, 0.75].map((t) => {
          const y = padTop + (1 - t) * innerH;
          return <line key={t} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#eef2f7" />;
        })}
        <line x1={padLeft} y1={baselineY} x2={width - padRight} y2={baselineY} stroke="#9ca3af" />

        {Array.from({ length: n }, (_, i) => {
          const xCenter = padLeft + i * stepX;
          const v = values[i];
          const h = (v / maxV) * innerH;
          const y = baselineY - h;

          return (
            <g key={i}>
              {v > 0 ? (
                <rect
                  x={xCenter - barW / 2}
                  y={y}
                  width={barW}
                  height={h}
                  rx={999}
                  fill={colorFor(rows[i]?.moodScore)}
                  opacity={0.95}
                />
              ) : (
                <rect x={xCenter - barW / 2} y={padTop} width={barW} height={innerH} rx={999} fill="#e5e7eb" opacity={0.25} />
              )}

              {i % labelEvery === 0 || i === labels.length - 1 ? (
                <text
                  x={xCenter}
                  y={baselineY + 24}
                  fontSize="11"
                  textAnchor="end"
                  fill="#111827"
                  transform={`rotate(-35 ${xCenter} ${baselineY + 24})`}
                >
                  {labels[i]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
