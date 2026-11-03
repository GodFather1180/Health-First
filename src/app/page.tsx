"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { todayKey, prettyDate } from "@/lib/time";
import { groundingMessage } from "@/lib/gentleCopy";
import { STORES } from "@/lib/localStore/tables";
import { getAll, getByIndex } from "@/lib/localStore";

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

// -------- helpers for KPI counting --------
function countStrings(arr: unknown): number {
  if (!Array.isArray(arr)) return 0;
  return arr.filter((x) => typeof x === "string" && x.trim().length > 0).length;
}
function countGoalObjects(arr: unknown): number {
  if (!Array.isArray(arr)) return 0;
  // supports { text }, { title }, { label }, { value }
  return arr.filter((x) => {
    if (!x || typeof x !== "object") return false;
    const o = x as any;
    const s = (o.text ?? o.title ?? o.label ?? o.value ?? "").toString();
    return s.trim().length > 0;
  }).length;
}
function toDateKeyFromMs(ms: number): string {
  // local-ish date key (YYYY-MM-DD)
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HomePage() {
  const path = usePathname();

  const dateKey = useMemo(() => todayKey(), []);
  const msg = useMemo(() => groundingMessage(dateKey), [dateKey]);

  const [badDay, setBadDay] = useState(false);

  // Mobile drawer open/close
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);

  // KPI stats (real data)
  const [stats, setStats] = useState({
    dailyGoals: 0,
    moodCheck: 0,
    selfCare: 0,
    letters: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // load bad day mode
  useEffect(() => {
    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
  }, []);

  // persist bad day mode
  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  async function loadStats() {
    setStatsLoading(true);

    try {
      // ---- Daily goals ----
      // We try index by date first (if it exists), otherwise fall back to getAll+filter.
      let dailyCount = 0;
      try {
        const byDate = await getByIndex<any>(
          // if your tables file uses a different key, this still compiles because TS sees STORES as known keys
          (STORES as any).dailyGoals,
          "date",
          dateKey
        );
        const row = Array.isArray(byDate) ? byDate[0] : byDate;
        if (row) {
          dailyCount =
            countStrings(row.priorities) ||
            countStrings(row.goals) ||
            countGoalObjects(row.items) ||
            countGoalObjects(row.goals) ||
            countGoalObjects(row.priorities) ||
            0;
        }
      } catch {
        // fallback: scan all
        const allDaily = await getAll<any>((STORES as any).dailyGoals);
        const row = allDaily.find((r: any) => r?.date === dateKey);
        if (row) {
          dailyCount =
            countStrings(row.priorities) ||
            countStrings(row.goals) ||
            countGoalObjects(row.items) ||
            countGoalObjects(row.goals) ||
            countGoalObjects(row.priorities) ||
            0;
        }
      }

      // ---- Mood ----
      let moodCount = 0;
      try {
        const moods = await getByIndex<any>((STORES as any).moodEntries, "date", dateKey);
        moodCount = Array.isArray(moods) ? (moods.length ? 1 : 0) : moods ? 1 : 0;
      } catch {
        const allMoods = await getAll<any>((STORES as any).moodEntries);
        moodCount = allMoods.some((m: any) => m?.date === dateKey) ? 1 : 0;
      }

      // ---- Self-care (habit checks DONE/PARTIAL for date) ----
      let selfCareCount = 0;
      try {
        const checks = await getByIndex<any>((STORES as any).habitChecks, "by_date", dateKey);
        selfCareCount = (checks ?? []).filter(
          (c: any) => c?.status === "DONE" || c?.status === "PARTIAL"
        ).length;
      } catch {
        const allChecks = await getAll<any>((STORES as any).habitChecks);
        selfCareCount = allChecks.filter(
          (c: any) =>
            c?.date === dateKey && (c?.status === "DONE" || c?.status === "PARTIAL")
        ).length;
      }

      // ---- Letters (created today) ----
      // Supports several table names (depending on what you used).
      const lettersStore =
        (STORES as any).letters ?? (STORES as any).letterEntries ?? (STORES as any).letterDrafts;

      let lettersCount = 0;
      if (lettersStore) {
        const allLetters = await getAll<any>(lettersStore);
        lettersCount = allLetters.filter((l: any) => {
          // prefer explicit date/dateKey, otherwise use createdAt
          const dk =
            l?.dateKey ??
            l?.date ??
            (typeof l?.createdAt === "number" ? toDateKeyFromMs(l.createdAt) : null);
          return dk === dateKey;
        }).length;
      }

      setStats({
        dailyGoals: dailyCount,
        moodCheck: moodCount,
        selfCare: selfCareCount,
        letters: lettersCount,
      });
    } catch {
      // if anything goes wrong, just keep zeros rather than breaking home page
      setStats({ dailyGoals: 0, moodCheck: 0, selfCare: 0, letters: 0 });
    } finally {
      setStatsLoading(false);
    }
  }

  // refresh KPIs when you come back / navigate / refocus tab
  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    const onFocus = () => loadStats();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        <div className="topbar">
          <div className="topHero">
            <div className="topHeroText">Health First</div>
          </div>
        </div>

        <div className="content">
          {badDay ? (
            <section className="heroCard heroCentered">
              <div className="heroMeta">{prettyDate(dateKey)}</div>
              <div className="heroTitle">It’s okay to rest.</div>
              <div className="heroMsg">
                Today can be your rest day. Rest is productive too. Just breathe.
              </div>

              <div className="softLine" />

              <div className="catSection">
                <div className="catTitle">Gentle ideas</div>
                <ul className="restList">
                  <li>Drink a glass of water</li>
                  <li>Take five slow, deep breaths</li>
                  <li>Step outside for a few minutes</li>
                  <li>Text someone you trust</li>
                </ul>
              </div>

              <div className="footerNote">
                <div className="big">You’re doing enough 🌿</div>
                
              </div>
            </section>
          ) : (
            <section className="grid2">
              <div className="card">
                <div className="cardTop">
                  <div>
                    <div className="muted">{prettyDate(dateKey)}</div>
                    <div className="h2">Small steps, every day. You’re already enough.</div>
                  </div>
                  <div className="chip">{statsLoading ? "…" : "Today"}</div>
                </div>

              

                <div className="msgCard">
                  <div className="msgTitle">Your message</div>
                  <div className="msgText">{msg}</div>
                </div>
              </div>

              <div className="card">
                <div className="cardTop">
                  <div>
                    <div className="muted">Quick start</div>
                    <div className="h2">Where to?</div>
                  </div>
                  <Link className="viewAll" href="/progress">
                    Progress
                  </Link>
                </div>

                <div className="quickGrid">
                  <Quick href="/goals/daily" label="Daily Goals" sub="10 priorities" />
                  <Quick href="/mood" label="Mood Check-In" sub="tap + note" />
                  <Quick href="/self-care" label="Self-Care Menu" sub="gentle actions" />
                  <Quick href="/letters" label="Letters" sub="comfort reads" />
                </div>

                <div className="miniHint">Tip: if it’s heavy today, you can turn on Bad Day Mode.</div>
              </div>
            </section>
          )}
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

/* ---------- helpers ---------- */

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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="kpiValue">{value}</div>
      <div className="kpiLabel">{label}</div>
    </div>
  );
}




const styles = `
/* Use GLOBAL theme variables (from globals.css + applyUiPrefs) */
:global(html, body) {
  background: var(--bg0);
  color: var(--text);
}

:global(::selection){
  background: rgba(124,58,237,.25);
}

.shell{
  min-height: 100vh;
  display:grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 16px;
  position: relative;

  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.18), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.14), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.10), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  color: var(--text);
}

/* Dark mode background punch */
:global(:root[data-theme="dark"]) .shell,
:global(html.dark) .shell,
:global(body.dark) .shell,
:global(.dark) .shell{
  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.42), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.24), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.20), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
}

/* overlay for mobile */
.overlay{ display:none; border:0; padding:0; background: transparent; }
@media (max-width: 980px){
  .overlay{
    display:block;
    position:fixed;
    inset:0;
    background: rgba(10, 6, 20, 0.40);
    opacity:0;
    pointer-events:none;
    transition: opacity 160ms ease;
    z-index:40;
  }
}
.overlayOn{ opacity:1; pointer-events:auto; }

/* Sidebar */
.sidebar{
  border: 1px solid var(--border);
  background: var(--card2);
  border-radius: 22px;
  padding: 12px 16px 16px;
  backdrop-filter: blur(14px);
  display:flex;
  flex-direction:column;
  gap: 14px;
  box-shadow: 0 28px 70px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.22);
}

.brandBtn{
  border:0;
  background: transparent;
  padding: 10px 6px 8px;
  border-radius: 16px;
  display:flex;
  align-items:center;
  gap: 10px;
  cursor: pointer;
  text-align:left;
}
.brandBtn:hover{ background: rgba(124,58,237,.08); }

.logoDot{
  width: 14px; height: 14px; border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(167,139,250,.95), rgba(124,58,237,.95));
  box-shadow: 0 14px 34px rgba(124,58,237,.22);
  flex: 0 0 auto;
}

.brandText{ flex: 1 1 auto; min-width: 0; }
.brandTop{ font-weight: 1000; letter-spacing: -.2px; }
.brandSub{ font-size: 12px; opacity: .72; margin-top: 1px; color: var(--muted); }

.brandChevron{
  display:none;
  width: 34px; height: 34px;
  border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(124,58,237,.12);
  border: 1px solid rgba(124,58,237,.22);
  color: var(--text);
  font-weight: 1000;
}

.nav{ display:flex; flex-direction:column; gap: 6px; padding: 4px; }

.navItem{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 12px; border-radius: 14px;
  color: var(--text);
  opacity:.92;
  border: 1px solid transparent;
  text-decoration: none;
}
.navItem:hover{
  opacity: 1;
  border-color: rgba(124,58,237,.22);
  background: rgba(124,58,237,.10);
}
.navItem.active{
  opacity: 1;
  background: linear-gradient(90deg, rgba(124,58,237,.20), rgba(255,255,255,.06));
  border-color: rgba(124,58,237,.28);
}

.navIcon{
  width: 26px; height: 26px; display:grid; place-items:center;
  border-radius: 12px;
  background: rgba(124,58,237,.12);
  border: 1px solid rgba(124,58,237,.22);
  font-size: 12px;
  color: var(--text);
  opacity: .9;
}

.cta{
  margin-top: 6px;
  border: 1px solid rgba(124,58,237,.26);
  background: linear-gradient(90deg, rgba(124,58,237,.22), rgba(167,139,250,.14));
  color: var(--text);
  padding: 12px 14px;
  border-radius: 16px;
  font-weight: 1000;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  box-shadow: 0 18px 40px rgba(124,58,237,.12);
}
.ctaRight{
  font-weight: 1000;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(124,58,237,.22);
}

.sideHint{
  margin-top:auto;
  opacity:.78;
  font-size: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(124,58,237,.30);
  background: rgba(124,58,237,.08);
  color: var(--muted);
}

/* Main */
.main{
  border: 1px solid var(--border);
  background: var(--card2);
  border-radius: 22px;
  backdrop-filter: blur(14px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  box-shadow: 0 28px 90px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.20);
}

/* ✅ mobile top opener */
.mobileTopbar{
  display:none;
  padding: 12px 12px 0;
}
.mobileMenuBtn{
  display:inline-flex;
  align-items:center;
  gap:10px;
  border: 1px solid rgba(124,58,237,.22);
  background: rgba(255,255,255,.10);
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
  border: 1px solid rgba(124,58,237,.24);
  font-weight: 1200;
}
.mobileMenuText{ font-size: 14px; }

.topbar{
  position: relative;
  padding: 14px;
  border-bottom: 1px solid rgba(124,58,237,.18);
  display:flex;
  justify-content:center;
}

.topHero{
  width: min(420px, 92%);
  height: 135px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(124,58,237,.20);
  background: rgba(255,255,255,.10);
  box-shadow: 0 18px 50px rgba(0,0,0,.10);
  position: relative;
}
.topHeroText{
  height: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 34px;
  font-weight: 1200;
  letter-spacing: -0.6px;
  background: linear-gradient(135deg, rgba(124,58,237,.18), rgba(236,72,153,.14));
}

.content{ padding: 16px; }

.grid2{
  display:grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 14px;
}

/* Cards */
.card{
  background: var(--card);
  color: var(--text);
  border-radius: 18px;
  border: 1px solid var(--border);
  box-shadow: 0 22px 60px rgba(0,0,0,.10);
  padding: 14px;
  overflow: hidden;
}

.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
.muted{ font-size: 12px; opacity: .70; font-weight: 950; color: var(--muted); }
.h2{ font-size: 22px; font-weight: 1100; margin-top: 2px; letter-spacing: -.2px; }

.chip{
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.24);
  color: var(--text);
  font-weight: 950;
  font-size: 12px;
}

.viewAll{
  font-weight: 950;
  font-size: 12px;
  color: var(--text);
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.24);
  text-decoration:none;
}
.viewAll:hover{ filter: brightness(1.02); }

.kpiRow{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin: 10px 0 12px; }
.kpi{ border-radius: 16px; padding: 12px 10px; border: 1px solid rgba(124,58,237,.22); background: linear-gradient(180deg, rgba(124,58,237,.12), rgba(255,255,255,.06)); }
.kpiValue{ font-size: 20px; font-weight: 1100; }
.kpiLabel{ font-size: 11px; opacity: .74; font-weight: 950; margin-top: 4px; color: var(--muted); }

.msgCard{
  border-radius: 18px;
  padding: 14px;
  background: linear-gradient(90deg, rgba(124,58,237,.18), rgba(167,139,250,.12));
  border: 1px solid rgba(124,58,237,.24);
}
.msgTitle{ font-size: 12px; font-weight: 1100; opacity: .82; margin-bottom: 6px; color: var(--muted); }
.msgText{ font-size: 18px; font-weight: 1000; line-height: 1.2; }

.bottomPhoto{
  margin-top: 12px;
  border-radius: 16px;
  overflow:hidden;
  border: 1px solid rgba(124,58,237,.20);
  background: rgba(255,255,255,.08);
  height: 200px;
  position: relative;
}
:global(.bottomImg){ object-fit: contain; object-position: center; }

.quickGrid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick{
  display:flex; align-items:center; gap: 10px;
  padding: 12px 12px;
  border-radius: 16px;
  border: 1px solid rgba(124,58,237,.22);
  background: rgba(255,255,255,.06);
  color: var(--text);
  text-decoration:none;
}
.quick:hover{ background: rgba(124,58,237,.10); border-color: rgba(124,58,237,.30); }
.quickIcon{ width: 34px; height: 34px; border-radius: 14px; display:grid; place-items:center; background: rgba(124,58,237,.14); border: 1px solid rgba(124,58,237,.26); font-weight: 1000; }
.quickText{ flex:1; min-width: 0; }
.quickLabel{ font-weight: 1100; }
.quickSub{ font-size: 12px; opacity: .72; font-weight: 950; margin-top: 2px; color: var(--muted); }
.quickGo{ font-size: 22px; opacity: .45; font-weight: 1100; }

.miniHint{
  margin-top: 12px;
  font-size: 12px;
  opacity: .80;
  font-weight: 950;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(124,58,237,.30);
  background: rgba(124,58,237,.08);
  color: var(--muted);
}

/* Bad day mode card */
.heroCentered{ display:flex; flex-direction:column; align-items:center; }
.heroCard{
  background: var(--card);
  border-radius: 22px;
  border: 1px solid var(--border);
  box-shadow: 0 22px 60px rgba(0,0,0,.10);
  padding: 18px;
  width: 100%;
}
.heroMeta{ font-size: 12px; opacity: .70; font-weight: 1000; align-self:flex-start; color: var(--muted); }
.heroTitle{ font-size: 40px; font-weight: 1200; margin-top: 6px; letter-spacing: -0.6px; align-self:flex-start; }
.heroMsg{ margin-top: 6px; font-weight: 950; opacity: .88; max-width: 56ch; align-self:flex-start; color: var(--text); }
.softLine{ height: 1px; background: rgba(124,58,237,.22); margin: 14px 0; width: 100%; }

.catSection{ width: 100%; display:flex; flex-direction:column; gap: 10px; margin-top: 6px; }
.catTitle{ font-weight: 1100; font-size: 14px; }
.restList{ margin: 0; padding-left: 20px; display:flex; flex-direction:column; gap: 6px; font-weight: 800; opacity: .9; }

.catScroller{
  display:flex;
  gap: 12px;
  overflow-x: auto;
  padding: 6px 2px 10px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.catScroller::-webkit-scrollbar{ display:none; }

.catCard{
  flex: 0 0 auto;
  width: 260px;
  height: 200px;
  border-radius: 18px;
  overflow:hidden;
  border: 1px solid rgba(124,58,237,.22);
  background: rgba(255,255,255,.06);
  box-shadow: 0 18px 40px rgba(0,0,0,.10);
  scroll-snap-align: center;
  position: relative;
}
:global(.catImg){ object-fit: contain; object-position: center; }

.footerNote{
  margin-top: 14px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 18px;
  background: linear-gradient(90deg, rgba(124,58,237,.16), rgba(167,139,250,.10));
  border: 1px solid rgba(124,58,237,.24);
}
.footerNote .big{ font-weight: 1200; }
.footerNote .small{ margin-top: 4px; font-size: 12px; font-weight: 1000; opacity: .80; color: var(--muted); }

/* Mobile drawer */
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
  .topHero{ height: 180px; width: min(520px, 92%); }
  .catCard{ width: 240px; height: 190px; }
}
`;
