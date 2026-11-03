"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { todayKey, weekKeyFromDateKey, addWeeks, prettyWeekRange } from "@/lib/time";
import { get, getByIndex, put, del } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import type { WeeklyGoal, WeeklyGoalStatus, WeeklyMeta } from "@/types/domain";

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

const BAD_DAY_KEY = "healthfirst_bad_day_mode";

const MAX_MAIN_GOALS = 10;
const MAIN_LIMIT_MESSAGE = "Try not to do everything at once — pace yourself so you don’t burn out.";

type WeekOption = { key: string; label: string };

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

export default function WeeklyGoalsPage() {
  const path = usePathname();

  const [weekKey, setWeekKey] = useState(() => weekKeyFromDateKey(todayKey()));
  const [text, setText] = useState("");
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);

  const [focusDraft, setFocusDraft] = useState("");
  const [savedFocus, setSavedFocus] = useState("");

  const [notice, setNotice] = useState<string | null>(null);

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

  const range = useMemo(() => prettyWeekRange(weekKey), [weekKey]);

  // Dropdown options: current week ± 26 weeks
  const weekOptions = useMemo<WeekOption[]>(() => {
    const base = weekKeyFromDateKey(todayKey());
    const opts: WeekOption[] = [];
    for (let i = -26; i <= 26; i++) {
      const k = addWeeks(base, i);
      opts.push({ key: k, label: prettyWeekRange(k) });
    }
    return opts;
  }, []);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2800);
  }

  async function load() {
    const list = await getByIndex<WeeklyGoal>(STORES.weeklyGoals, "by_week", weekKey);

    list.sort(
      (a, b) =>
        Number((b as any).isMain) - Number((a as any).isMain) ||
        b.createdAt.localeCompare(a.createdAt)
    );

    const normalized = list.map((g) => ({
      ...g,
      isMain: Boolean((g as any).isMain),
    }));

    setGoals(normalized);

    const meta = await get<WeeklyMeta>(STORES.weeklyMeta, weekKey);
    const note = meta?.focusNote ?? "";
    setSavedFocus(note);
    setFocusDraft(note);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  async function addGoal() {
    const t = text.trim();
    if (!t) return;

    const g: WeeklyGoal = {
      id: makeId(),
      weekKey,
      text: t,
      status: "PARTIAL",
      isMain: false,
      createdAt: now(),
      updatedAt: now(),
    };

    await put(STORES.weeklyGoals, g);
    setText("");
    load();
  }

  async function setStatus(g: WeeklyGoal, status: WeeklyGoalStatus) {
    await put(STORES.weeklyGoals, { ...g, status, updatedAt: now() });
    load();
  }

  async function toggleMain(g: WeeklyGoal) {
    if (g.isMain) {
      await put(STORES.weeklyGoals, { ...g, isMain: false, updatedAt: now() });
      load();
      return;
    }

    const sameWeek = await getByIndex<WeeklyGoal>(STORES.weeklyGoals, "by_week", weekKey);
    const mainCount = sameWeek.filter((x) => Boolean((x as any).isMain)).length;

    if (mainCount >= MAX_MAIN_GOALS) {
      flash(MAIN_LIMIT_MESSAGE);
      return;
    }

    await put(STORES.weeklyGoals, { ...g, isMain: true, updatedAt: now() });
    load();
  }

  async function removeGoal(g: WeeklyGoal) {
    await del(STORES.weeklyGoals, g.id);
    load();
  }

  async function saveFocus() {
    const meta = {
      id: weekKey,
      weekKey,
      focusNote: focusDraft.trim() || undefined,
      updatedAt: now(),
    } satisfies WeeklyMeta & { id: string };

    await put(STORES.weeklyMeta, meta);
    setSavedFocus(meta.focusNote ?? "");
    flash("Focus saved ✅");
  }

  async function carryUnfinishedToNextWeek() {
    const current = await getByIndex<WeeklyGoal>(STORES.weeklyGoals, "by_week", weekKey);
    const unfinished = current.filter((g) => g.status !== "DONE");
    if (unfinished.length === 0) {
      flash("Nothing to carry — you’re good ✅");
      return;
    }

    const nextWeekKey = addWeeks(weekKey, 1);
    const nextWeek = await getByIndex<WeeklyGoal>(STORES.weeklyGoals, "by_week", nextWeekKey);
    const nextTexts = new Set(nextWeek.map((g) => g.text.trim().toLowerCase()));

    const toCopy = unfinished.filter((g) => !nextTexts.has(g.text.trim().toLowerCase()));
    if (toCopy.length === 0) {
      flash("Already carried into next week ✅");
      return;
    }

    await Promise.all(
      toCopy.map((g) =>
        put(STORES.weeklyGoals, {
          id: makeId(),
          weekKey: nextWeekKey,
          text: g.text,
          status: "PARTIAL",
          isMain: false,
          carriedFromWeekKey: weekKey,
          createdAt: now(),
          updatedAt: now(),
        } satisfies WeeklyGoal)
      )
    );

    flash(`Carried ${toCopy.length} goal(s) into next week ✅`);
  }

  const mainCount = goals.filter((g) => g.isMain).length;

  return (
    <div className="shell">
      {/* overlay for mobile drawer */}
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
        {/* Mobile top bar */}
        <div className="mobileTopbar">
          <button className="mobileMenuBtn" type="button" onClick={() => setNavOpen(true)} aria-label="Open sidebar">
            <span className="mobileMenuIcon">≡</span>
            <span className="mobileMenuText">Health First</span>
          </button>
        </div>

        <div className="content">
          <section className="grid2">
            {/* LEFT: weekly goals */}
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">{range}</div>
                  <div className="h2">Weekly Goals</div>
                </div>
                <div className="chip">
                  {mainCount}/{MAX_MAIN_GOALS} main
                </div>
              </div>

              {notice ? (
                <div className="notice">
                  <span className="noticeText">{notice}</span>
                </div>
              ) : null}

              {/* nav row */}
              <div className="weekRow">
                <button className="iconBtn" onClick={() => setWeekKey((w) => addWeeks(w, -1))} aria-label="Previous week">
                  ←
                </button>
                <button className="softBtn" onClick={() => setWeekKey(weekKeyFromDateKey(todayKey()))}>
                  This Week
                </button>
                <button className="iconBtn" onClick={() => setWeekKey((w) => addWeeks(w, 1))} aria-label="Next week">
                  →
                </button>

                <div className="jumpWrap">
                  <span className="jumpLabel">Jump to</span>
                  <select className="select" value={weekKey} onChange={(e) => setWeekKey(e.target.value)}>
                    {weekOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="carryBtn" onClick={carryUnfinishedToNextWeek}>
                  Carry unfinished → next week
                </button>
              </div>

              {/* focus note */}
              <div className="focusCard">
                <div className="focusTop">
                  <div className="focusTitle">Weekly focus note</div>
                  <div className="focusSaved">
                    Saved: <b>{savedFocus.trim() ? "Yes" : "—"}</b>
                  </div>
                </div>

                <textarea
                  value={focusDraft}
                  onChange={(e) => setFocusDraft(e.target.value)}
                  rows={3}
                  className="textarea"
                  placeholder="Example: Keep it gentle. Hydrate. One thing at a time."
                />

                <div className="rowActions">
                  <button className="primaryBtn" onClick={saveFocus}>
                    Save focus
                  </button>
                  <div className="rowMeta">Saved: {savedFocus.trim() ? savedFocus : "—"}</div>
                </div>
              </div>

              {/* add goal */}
              <div className="addRow">
                <input
                  className="input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGoal();
                    }
                  }}
                  placeholder="Add a weekly goal"
                />
                <button className="primaryBtn" onClick={addGoal}>
                  Add
                </button>
              </div>

              {/* list */}
              <div className="goalList">
                {goals.length === 0 ? (
                  <div className="mutedBlock">No weekly goals yet. Keep it small — even one intention is a win.</div>
                ) : (
                  goals.map((g) => (
                    <div key={g.id} className={`goalRow ${g.isMain ? "goalMain" : ""}`}>
                      <div className="goalTop">
                        <div className="goalText">
                          {g.isMain ? <span className="star">★</span> : null}
                          {g.text}
                          {g.carriedFromWeekKey ? <span className="carried">(carried)</span> : null}
                        </div>
                        <span className="statusChip">Status: {g.status}</span>
                      </div>

                      <div className="goalActions">
                        <button className="miniBtn" onClick={() => setStatus(g, "DONE")}>
                          Done
                        </button>
                        <button className="miniBtn" onClick={() => setStatus(g, "PARTIAL")}>
                          Partial
                        </button>
                        <button className="miniBtn" onClick={() => setStatus(g, "SKIPPED")}>
                          Skipped (ok)
                        </button>

                        <button className="miniBtn" onClick={() => toggleMain(g)}>
                          {g.isMain ? "Un-main" : "Main"}
                        </button>

                        <button className="miniDangerBtn" onClick={() => removeGoal(g)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: shortcuts */}
            <div className="card rightCard">
              <div className="cardTop">
                <div>
                  <div className="muted">Quick</div>
                  <div className="h2">Shortcuts</div>
                </div>
                <Link className="viewAll" href="/goals/daily">
                  Daily
                </Link>
              </div>

              <div className="quickGrid">
                <Quick href="/win" label="Log a win" sub="tiny counts" />
                <Quick href="/mood" label="Mood check-in" sub="tap + note" />
                <Quick href="/self-care" label="Self-Care" sub="edit habits" />
                <Quick href="/progress" label="Progress" sub="charts + streaks" />
              </div>

              <div className="miniHint">Tip: main goals are your top 10. Keep it gentle.</div>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

/* helpers */

function Quick({ href, label, sub }: { href: string; label: string; sub?: string }) {
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

const styles = `
/* ================= THEME TOKENS (GLOBAL) ================= */

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
  --border2: rgba(124,58,237,.22);

  --accent: rgba(124,58,237,.10);
  --accent2: rgba(124,58,237,.14);

  --dangerBorder: rgba(254,202,202,.90);
  --dangerBg: rgba(255,241,242,.90);
  --dangerText: #9f1239;

  --violet-500:#7c3aed;
  --violet-400:#a78bfa;
}

/* Dark */
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

  --surface: rgba(255,255,255,.07);
  --surface2: rgba(255,255,255,.10);

  --border: rgba(167,139,250,.20);
  --border2: rgba(167,139,250,.28);

  --accent: rgba(124,58,237,.16);
  --accent2: rgba(124,58,237,.22);

  --dangerBorder: rgba(251,113,133,.35);
  --dangerBg: rgba(251,113,133,.12);
  --dangerText: #fb7185;
}

:global(html, body){
  background: var(--bg0);
  color: var(--text);
}

/* ================= PAGE LAYOUT ================= */

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

/* ================= OVERLAY (MOBILE) ================= */

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
  border:0; background: transparent;
  padding: 10px 8px 8px;
  border-radius: 16px;
  display:flex; align-items:center; gap: 10px;
  cursor: pointer; text-align:left;
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
  background: var(--accent);
  border: 1px solid var(--accent2);
  color: var(--text);
  font-weight: 1000; font-size: 12px;
}
.viewAll{
  font-weight: 1000; font-size: 12px;
  color: var(--text);
  padding: 8px 10px; border-radius: 999px;
  background: var(--accent);
  border: 1px solid var(--accent2);
  text-decoration:none;
}
.viewAll:hover{ filter: brightness(1.05); }

.notice{
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  box-shadow: 0 14px 30px rgba(0,0,0,.10);
  margin: 6px 0 10px;
}
.noticeText{ font-weight: 1000; }

/* ================= WEEK ROW ================= */

.weekRow{
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
.jumpWrap{
  display:flex; align-items:center; gap: 8px;
  margin-left: auto;
}
.jumpLabel{ font-size: 12px; color: var(--muted); font-weight: 950; }
.select{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 1000;
  outline: none;
}
.select:focus{
  border-color: var(--border2);
  box-shadow: 0 0 0 5px rgba(124,58,237,.16);
}
.carryBtn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(124,58,237,.35);
  background: rgba(124,58,237,.10);
  color: var(--text);
  font-weight: 1000;
  cursor: pointer;
}
.carryBtn:hover{ filter: brightness(1.06); }

/* ================= FOCUS ================= */

.focusCard{
  border-radius: 20px;
  padding: 14px;
  background: linear-gradient(90deg, rgba(124,58,237,.14), rgba(167,139,250,.10));
  border: 1px solid var(--border);
  margin-bottom: 12px;
}
.focusTop{ display:flex; justify-content:space-between; align-items:baseline; gap: 10px; }
.focusTitle{ font-weight: 1100; color: var(--text); }
.focusSaved{ font-size: 12px; color: var(--muted); font-weight: 950; }

.textarea{
  width: 100%;
  margin-top: 10px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  outline: none;
  font-size: 14px;
  background: rgba(255,255,255,.08);
  color: var(--text);
  resize: vertical;
  font-weight: 700;
}
.textarea:focus{
  border-color: var(--border2);
  box-shadow: 0 0 0 5px rgba(124,58,237,.16);
}

.rowActions{
  display:flex;
  gap: 10px;
  margin-top: 12px;
  align-items:center;
  flex-wrap:wrap;
}
.primaryBtn{
  border-radius: 14px;
  border: 1px solid rgba(17,24,39,.92);
  background: linear-gradient(180deg, #111827, #0b1220);
  color: #fff;
  font-weight: 1100;
  cursor: pointer;
  padding: 11px 14px;
}
.rowMeta{
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
  font-weight: 950;
}

/* ================= ADD + LIST ================= */

.addRow{
  display:flex;
  gap: 10px;
  align-items:center;
  flex-wrap:wrap;
  margin-top: 6px;
}
.input{
  flex: 1;
  min-width: 220px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 850;
  outline: none;
}
.input:focus{
  border-color: var(--border2);
  box-shadow: 0 0 0 5px rgba(124,58,237,.16);
}

.goalList{ display:grid; gap: 10px; margin-top: 12px; }
.goalRow{
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  padding: 12px 14px;
}
.goalMain{
  border-color: var(--border2);
  background: linear-gradient(180deg, rgba(124,58,237,.16), rgba(255,255,255,.06));
}
.goalTop{ display:flex; justify-content:space-between; gap: 10px; align-items:baseline; flex-wrap:wrap; }
.goalText{ font-weight: 1100; display:flex; gap: 8px; align-items:baseline; }
.star{ color: var(--text); opacity: .9; }
.carried{ font-weight: 850; color: var(--muted); margin-left: 6px; }
.statusChip{
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.10);
  font-weight: 950;
  font-size: 12px;
  color: var(--text);
}
.goalActions{ display:flex; gap: 8px; flex-wrap:wrap; margin-top: 10px; }

.miniBtn{
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 1000;
  cursor: pointer;
  font-size: 12px;
}
.miniBtn:hover{ border-color: var(--border2); background: rgba(124,58,237,.12); }

.miniDangerBtn{
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--dangerBorder);
  background: var(--dangerBg);
  color: var(--dangerText);
  font-weight: 1000;
  cursor: pointer;
  font-size: 12px;
}

/* shortcuts */
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

.mutedBlock{ margin-top: 12px; color: var(--muted); font-weight: 950; }

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
  .jumpWrap{ margin-left: 0; width: 100%; }
  .select{ width: 100%; }
  .rowMeta{ margin-left: 0; width: 100%; }
}
`;
