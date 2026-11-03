"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { todayKey, prettyDate, addDays } from "@/lib/time";
import { getAll, getByIndex, put } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import type { Habit, HabitCheck, HabitStatus } from "@/types/domain";

const now = () => new Date().getTime();
const newId = () => crypto.randomUUID();
const CYCLE: HabitStatus[] = ["DONE", "PARTIAL", "SKIPPED"];
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

export default function DailyPage() {
  const path = usePathname();

  const [dateKey, setDateKey] = useState(todayKey());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checksByHabit, setChecksByHabit] = useState<Record<string, HabitCheck>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  const [badDay, setBadDay] = useState(false);

  // mobile sidebar
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);

  useEffect(() => {
    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  const title = useMemo(() => prettyDate(dateKey), [dateKey]);

  async function load() {
    const all = await getAll<Habit>(STORES.habits);
    const hs = all.filter((h: any) => h.active === true || h.active === 1);
    hs.sort((a, b) => a.order - b.order);

    const cs = await getByIndex<HabitCheck>(
      STORES.habitChecks,
      "by_date",
      dateKey
    );
    const map: Record<string, HabitCheck> = {};
    for (const c of cs) map[c.habitId] = c;

    setHabits(hs);
    setChecksByHabit(map);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await load();
      if (!alive) return;
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  function statusFor(habitId: string): HabitStatus {
    return checksByHabit[habitId]?.status ?? "SKIPPED";
  }

  function pill(status: HabitStatus) {
    if (status === "DONE")
      return {
        bg: "rgba(34,197,94,.12)",
        bd: "rgba(34,197,94,.22)",
        fg: "#166534",
        label: "Done",
      };
    if (status === "PARTIAL")
      return {
        bg: "rgba(59,130,246,.12)",
        bd: "rgba(59,130,246,.22)",
        fg: "#1d4ed8",
        label: "Partial",
      };
    return {
      bg: "rgba(148,163,184,.14)",
      bd: "rgba(148,163,184,.26)",
      fg: "#475569",
      label: "Missed",
    };
  }

  async function setStatus(habitId: string, status: HabitStatus) {
    const existing = checksByHabit[habitId];

    if (existing) {
      await put<HabitCheck>(STORES.habitChecks, {
        ...existing,
        status,
        updatedAt: now(),
      });
    } else {
      await put<HabitCheck>(STORES.habitChecks, {
        id: newId(),
        habitId,
        date: dateKey,
        status,
        updatedAt: now(),
      } as any);
    }

    await load();
  }

  async function cycle(habitId: string) {
    const cur = statusFor(habitId);
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    await setStatus(habitId, next);
  }

  const effortPct = useMemo(() => {
    if (!habits.length) return 0;
    let score = 0;
    for (const h of habits) {
      const s = statusFor(h.id);
      if (s === "DONE") score += 1;
      else if (s === "PARTIAL") score += 0.5;
    }
    return Math.round((score / habits.length) * 100);
  }, [habits, checksByHabit]);

  const doneCount = useMemo(
    () => habits.filter((h) => statusFor(h.id) === "DONE").length,
    [habits, checksByHabit]
  );
  const partialCount = useMemo(
    () => habits.filter((h) => statusFor(h.id) === "PARTIAL").length,
    [habits, checksByHabit]
  );
  const missedCount = useMemo(
    () => habits.filter((h) => statusFor(h.id) === "SKIPPED").length,
    [habits, checksByHabit]
  );

  return (
    <div className="shell">
      {/* overlay for mobile drawer */}
      <button
        className={`overlay ${navOpen ? "overlayOn" : ""}`}
        aria-label="Close sidebar"
        onClick={() => setNavOpen(false)}
      />

      <aside className={`sidebar ${navOpen ? "sidebarOpen" : ""}`}>
        {/* brand button toggles ONLY useful when open on mobile, but harmless on desktop */}
        <button
          className="brandBtn"
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <div className="logoDot" />
          <div className="brandText">
            <div className="brandTop">Health First</div>
            <div className="brandSub">
              {badDay ? "Rest Mode" : "Your Wellness Space"}
            </div>
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
                onClick={() => setNavOpen(false)} // close drawer after navigation (mobile)
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

        <div className="sideHint">
          {badDay ? "Go gentle today" : "One step at a time"}
        </div>
      </aside>

      <main className="main">
        {/* Mobile top bar: visible ONLY on mobile to open the drawer */}
        <div className="mobileTopbar">
          <button
            className="mobileMenuBtn"
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open sidebar"
          >
            <span className="mobileMenuIcon">≡</span>
            <span className="mobileMenuText">Health First</span>
          </button>
        </div>

        <div className="content">
          <section className="grid2">
            {/* LEFT: daily habits */}
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">{title}</div>
                  <div className="h2">Daily</div>
                </div>
                <div className="chip">{effortPct}% effort</div>
              </div>

              <div className="dateRow">
                <button
                  className="iconBtn"
                  onClick={() => setDateKey((d) => addDays(d, -1))}
                  aria-label="Previous day"
                >
                  ←
                </button>
                <button
                  className="softBtn"
                  onClick={() => setDateKey(todayKey())}
                >
                  Today
                </button>
                <button
                  className="iconBtn"
                  onClick={() => setDateKey((d) => addDays(d, 1))}
                  aria-label="Next day"
                >
                  →
                </button>

                <input
                  className="dateInput"
                  type="date"
                  value={dateKey}
                  onChange={(e) => setDateKey(e.target.value)}
                />
              </div>

              <div className="kpiRow">
                <Kpi label="Done" value={String(doneCount)} />
                <Kpi label="Partial" value={String(partialCount)} />
                <Kpi label="Missed" value={String(missedCount)} />
                <Kpi label="Habits" value={String(habits.length)} />
              </div>

              <div className="effortCard">
                <div className="effortTop">
                  <div className="effortTitle">Self-care effort</div>
                  <div className="effortPct">{effortPct}%</div>
                </div>
                <div className="bar">
                  <div className="barFill" style={{ width: `${effortPct}%` }} />
                </div>
                <div className="effortHint">
                  Done = 1 • Partial = 0.5 • Missed = 0
                </div>
              </div>

              {loading ? <div className="mutedBlock">Loading…</div> : null}

              {!loading ? (
                <div className="habitList">
                  {habits.length === 0 ? (
                    <div className="mutedBlock">
                      No habits yet. Go to <b>Self-Care</b> and add “Sleep”,
                      “Shower”, etc.
                    </div>
                  ) : (
                    habits.map((h) => {
                      const s = statusFor(h.id);
                      const p = pill(s);

                      return (
                        <div key={h.id} className="habitRow">
                          <div className="habitLeft">
                            <div className="habitName">{h.name}</div>
                            <div className="habitMeta">
                              Tap “Cycle” to rotate statuses.
                            </div>
                          </div>

                          <div className="habitRight">
                            <span
                              className="statusPill"
                              style={{
                                background: p.bg,
                                borderColor: p.bd,
                                color: p.fg,
                              }}
                            >
                              {p.label}
                            </span>

                            <button
                              className="miniBtn"
                              onClick={() => setStatus(h.id, "DONE")}
                            >
                              Done
                            </button>
                            <button
                              className="miniBtn"
                              onClick={() => setStatus(h.id, "PARTIAL")}
                            >
                              Partial
                            </button>
                            <button
                              className="miniBtn"
                              onClick={() => setStatus(h.id, "SKIPPED")}
                            >
                              Missed (ok)
                            </button>

                            <button
                              className="cycleBtn"
                              onClick={() => cycle(h.id)}
                            >
                              Cycle
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>

            {/* RIGHT: optional space; keep it minimal */}
            <div className="card rightCard">
              <div className="cardTop">
                <div>
                  <div className="muted">Quick</div>
                  <div className="h2">Shortcuts</div>
                </div>
                <Link className="viewAll" href="/self-care">
                  Self-Care
                </Link>
              </div>

              <div className="quickGrid">
                <Quick href="/self-care" label="Edit habits" sub="add / pause" />
                <Quick href="/mood" label="Mood check-in" sub="tap + note" />
                <Quick href="/win" label="Log a win" sub="tiny counts" />
                <Quick href="/letters" label="Letters" sub="comfort reads" />
              </div>

              <div className="miniHint">
                Tip: open the sidebar on mobile by tapping “Health First” up top.
              </div>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

/* helpers */

function Quick({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub?: string;
}) {
  return (
    <Link href={href} className="quick">
      <div className="quickIcon">✦</div>
      <div className="quickText">
        <div className="quickLabel">{label}</div>
        {sub ? <div className="quickSub">{sub}</div> : null}
      </div>
      <div className="quickGo">›</div>
    </Link>
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

const styles = `
/* ================= THEME TOKENS ================= */
/* Light */
:global(:root){
  --bg0:#f6f1ff;
  --bg1:#efe6ff;

  --text:#1b1230;
  --muted: rgba(27,18,48,.70);

  --card: rgba(255,255,255,.82);
  --card2: rgba(255,255,255,.55);

  --surface: rgba(255,255,255,.92);
  --surface2: rgba(255,255,255,.78);

  --border: rgba(124,58,237,.16);
  --border2: rgba(124,58,237,.24);

  --accent: rgba(124,58,237,.10);
  --accent2: rgba(124,58,237,.16);

  --violet-500:#7c3aed;
  --violet-400:#a78bfa;
}

/* Dark (supports multiple patterns) */
:global(html[data-theme="dark"]),
:global(body[data-theme="dark"]),
:global(html.dark),
:global(body.dark),
:global(.dark){
  --bg0:#070611;
  --bg1:#0b0a16;

  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.70);

  --card: rgba(255,255,255,.06);
  --card2: rgba(255,255,255,.04);

  --surface: rgba(255,255,255,.08);
  --surface2: rgba(255,255,255,.10);

  --border: rgba(167,139,250,.20);
  --border2: rgba(167,139,250,.30);

  --accent: rgba(124,58,237,.16);
  --accent2: rgba(124,58,237,.22);
}

:global(html, body){
  background: var(--bg0);
  color: var(--text);
}

/* ================= LAYOUT ================= */

.shell{
  min-height: 100vh;
  display:grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 16px;
  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.20), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.16), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.10), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  color: var(--text);
  position: relative;
}

/* overlay for mobile drawer */
.overlay{ display:none; border:0; padding:0; background: transparent; }
@media (max-width: 980px){
  .overlay{
    display:block;
    position:fixed;
    inset:0;
    background: rgba(0,0,0,0.48);
    opacity:0;
    pointer-events:none;
    transition: opacity 160ms ease;
    z-index:40;
  }
}
.overlayOn{ opacity: 1; pointer-events: auto; }

/* ================= SIDEBAR ================= */

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
  background: radial-gradient(circle at 30% 30%, #fff, var(--violet-400), var(--violet-500));
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
  background: var(--accent);
  border: 1px solid var(--accent2);
  color: var(--text);
  font-weight: 1000;
}

.nav{ display:flex; flex-direction:column; gap: 6px; padding: 4px; }

.navItem{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 12px; border-radius: 16px;
  color: var(--text); opacity:.92;
  border: 1px solid transparent;
  text-decoration: none;
}
.navItem:hover{ opacity: 1; border-color: var(--border); background: rgba(124,58,237,.12); }
.navItem.active{
  opacity: 1;
  background: linear-gradient(90deg, rgba(124,58,237,.18), rgba(255,255,255,.04));
  border-color: var(--border2);
}

.navIcon{
  width: 28px; height: 28px; display:grid; place-items:center;
  border-radius: 12px;
  background: var(--accent);
  border: 1px solid var(--accent2);
  font-size: 12px;
  color: var(--text);
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
  border: 1px dashed rgba(167,139,250,.30);
  background: rgba(255,255,255,.06);
}

/* ================= MAIN ================= */

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
  display:inline-flex;
  align-items:center;
  gap:10px;
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
  background: var(--accent);
  border: 1px solid var(--accent2);
  font-weight: 1200;
}
.mobileMenuText{ font-size: 14px; }

.content{ padding: 16px; }

.grid2{
  display:grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 14px;
  align-items:start;
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

.rightCard{ align-self: start; }

.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
.muted{ font-size: 12px; color: var(--muted); font-weight: 950; letter-spacing: .2px; }
.h2{ font-size: 26px; font-weight: 1100; margin-top: 2px; letter-spacing: -.4px; }

.chip{
  padding: 8px 10px; border-radius: 999px;
  background: var(--accent); border: 1px solid var(--accent2);
  color: var(--text); font-weight: 1000; font-size: 12px;
}

.viewAll{
  font-weight: 1000; font-size: 12px;
  color: var(--text);
  padding: 8px 10px; border-radius: 999px;
  background: var(--accent); border: 1px solid var(--accent2);
  text-decoration:none;
}
.viewAll:hover{ filter: brightness(1.05); }

/* ================= DATE ROW ================= */

.dateRow{
  display:flex;
  gap: 8px;
  align-items:center;
  flex-wrap:wrap;
  margin: 10px 0 12px;
}

.iconBtn{
  width: 40px; height: 40px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  cursor: pointer;
  font-weight: 1100;
}
.softBtn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.12);
  color: var(--text);
  cursor: pointer;
  font-weight: 1100;
}

.dateInput{
  margin-left: auto;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 1000;
  outline: none;
}
.dateInput:focus{
  border-color: var(--border2);
  box-shadow: 0 0 0 5px rgba(124,58,237,.16);
}

/* ================= KPIS ================= */

.kpiRow{
  display:grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 10px;
  margin: 10px 0 12px;
}
.kpi{
  border-radius: 18px;
  padding: 12px 12px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(124,58,237,.12), rgba(255,255,255,.06));
}
.kpiValue{ font-size: 22px; font-weight: 1100; color: var(--text); }
.kpiLabel{ font-size: 11px; color: var(--muted); font-weight: 950; margin-top: 4px; }

/* ================= EFFORT CARD ================= */

.effortCard{
  border-radius: 20px;
  padding: 14px;
  background: linear-gradient(90deg, rgba(124,58,237,.16), rgba(167,139,250,.12));
  border: 1px solid var(--border);
  margin-bottom: 12px;
}
.effortTop{ display:flex; align-items:flex-end; justify-content:space-between; gap: 10px; }
.effortTitle{ font-weight: 1100; color: var(--text); }
.effortPct{ font-size: 26px; font-weight: 1200; letter-spacing: -.4px; color: var(--text); }
.bar{
  margin-top: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.10);
  border: 1px solid var(--border);
  overflow:hidden;
}
.barFill{
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(124,58,237,.55), rgba(167,139,250,.65));
}
.effortHint{ margin-top: 8px; font-size: 12px; color: var(--muted); font-weight: 900; }

/* ================= HABITS LIST ================= */

.mutedBlock{ margin-top: 12px; color: var(--muted); font-weight: 950; }

.habitList{ display:grid; gap: 10px; margin-top: 12px; }

.habitRow{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
}
.habitLeft{ display:flex; flex-direction:column; min-width: 0; }
.habitName{ font-weight: 1100; font-size: 16px; }
.habitMeta{ font-size: 12px; color: var(--muted); font-weight: 950; margin-top: 2px; }

.habitRight{
  display:flex;
  gap: 8px;
  align-items:center;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.statusPill{
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 1100;
  border: 1px solid var(--border);
}

.miniBtn{
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 1000;
  cursor: pointer;
}
.miniBtn:hover{ border-color: var(--border2); background: rgba(124,58,237,.12); }

.cycleBtn{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(17,24,39,.92);
  background: linear-gradient(180deg, #111827, #0b1220);
  color: #fff;
  font-weight: 1100;
  cursor: pointer;
}

/* ================= SHORTCUTS ================= */

.quickGrid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick{
  display:flex; align-items:center; gap: 10px;
  padding: 12px 12px; border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  text-decoration:none;
  color: var(--text);
}
.quick:hover{ background: rgba(124,58,237,.12); border-color: var(--border2); }
.quickIcon{
  width: 36px; height: 36px; border-radius: 14px;
  display:grid; place-items:center;
  background: var(--accent);
  border: 1px solid var(--accent2);
  color: var(--text);
  font-weight: 1100;
}
.quickText{ flex:1; min-width: 0; }
.quickLabel{ font-weight: 1100; }
.quickSub{ font-size: 12px; color: var(--muted); font-weight: 950; margin-top: 2px; }
.quickGo{ font-size: 22px; opacity: .55; font-weight: 1100; }

.miniHint{
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 950;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px dashed rgba(167,139,250,.30);
  background: rgba(124,58,237,.10);
}

/* ================= MOBILE ================= */
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

  .grid2{ grid-template-columns: 1fr; }
  .dateInput{ margin-left: 0; width: 100%; }
}
`;

