"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STORES } from "@/lib/localStore/tables";
import { getAll, put, del } from "@/lib/localStore";
import { uid } from "@/lib/id";
import type { Habit } from "@/types/domain";

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

export default function SelfCarePage() {
  const path = usePathname();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const [badDay, setBadDay] = useState(false);

  // mobile drawer
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);

  // load bad day mode
  useEffect(() => {
    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
  }, []);

  // persist bad day mode
  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  async function refresh() {
    const all = await getAll<Habit>(STORES.habits);
    const normalized = all.map((h: any) => ({ ...h, active: h.active === true || h.active === 1 }));
    normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setHabits(normalized);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await refresh();
      if (!alive) return;
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // always contiguous next order (based on count)
  const nextOrder = useMemo(() => habits.length + 1, [habits.length]);

  const total = habits.length;
  const activeCount = habits.filter((h) => !!h.active).length;
  const pausedCount = total - activeCount;

  async function normalizeOrders() {
    const all = await getAll<Habit>(STORES.habits);
    const normalized = all.map((h: any) => ({ ...h, active: h.active === true || h.active === 1 }));
    normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const updates: Habit[] = [];
    for (let i = 0; i < normalized.length; i++) {
      const desired = i + 1;
      if ((normalized[i].order ?? 0) !== desired) updates.push({ ...normalized[i], order: desired });
    }
    for (const u of updates) await put<Habit>(STORES.habits, u);
  }

  async function addHabit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const now = Date.now();
    const row: Habit = {
      id: uid("h"),
      name: trimmed,
      order: nextOrder,
      active: true,
      createdAt: now,
    };

    await put<Habit>(STORES.habits, row);
    setName("");
    await refresh();
  }

  async function toggleActive(h: Habit) {
    await put<Habit>(STORES.habits, { ...h, active: !h.active });
    await refresh();
  }

  async function removeHabit(h: Habit) {
    await del(STORES.habits, h.id);
    await normalizeOrders();
    await refresh();
  }

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
                onClick={() => setNavOpen(false)} // ✅ close drawer after navigation (mobile)
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
        {/* Mobile top bar (so you can OPEN the drawer) */}
        <div className="mobileTopbar">
          <button className="mobileMenuBtn" type="button" onClick={() => setNavOpen(true)} aria-label="Open sidebar">
            <span className="mobileMenuIcon">≡</span>
            <span className="mobileMenuText">Health First</span>
          </button>
        </div>

        <div className="content">
          {badDay ? (
            <section className="heroCard heroCentered">
              <div className="heroMeta">Self-care is still progress.</div>
              <div className="heroTitle">Tiny wins only.</div>
              <div className="heroMsg">Pick one gentle thing. That’s enough. You’re not behind — you’re healing.</div>

              <div className="softLine" />

              <div className="miniHint">
                Tip: If everything feels hard, just mark “Shower” or “Water” and call it a win.
              </div>
            </section>
          ) : (
            <section className="grid2">
              {/* LEFT: Habits manager */}
              <div className="card">
                <div className="cardTop">
                  <div>
                    <div className="muted">Self-Care Menu</div>
                    <div className="h2">Habits</div>
                  </div>
                  <div className="chip">{total} total</div>
                </div>

                <div className="kpiRow">
                  <Kpi label="Active" value={String(activeCount)} />
                  <Kpi label="Paused" value={String(pausedCount)} />
                  <Kpi label="Next order" value={String(nextOrder)} />
                  <Kpi label="Today" value={"✿"} />
                </div>

                <div className="msgCard">
                  <div className="msgTitle">Add a habit once</div>
                  <div className="msgText">It will appear automatically on Daily.</div>
                </div>

                <div className="formRow">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='e.g. "Shower"'
                    className="input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHabit();
                      }
                    }}
                  />
                  <button className="primaryBtn" onClick={addHabit}>
                    Add
                  </button>
                </div>

                {loading ? <div className="mutedBlock">Loading…</div> : null}

                {!loading ? (
                  <div className="habitList">
                    {habits.length === 0 ? (
                      <div className="mutedBlock">No habits yet. Add “Sleep”, “Shower”, “Water”, etc.</div>
                    ) : (
                      habits.map((h) => (
                        <div key={h.id} className="habitRow">
                          <div className="habitLeft">
                            <div className="habitName">{h.name}</div>
                            <div className="habitMeta">Order: {h.order}</div>
                          </div>

                          <div className="habitRight">
                            <button onClick={() => toggleActive(h)} className={`pill ${h.active ? "pillOn" : "pillOff"}`}>
                              {h.active ? "Active" : "Paused"}
                            </button>

                            <button onClick={() => removeHabit(h)} className="dangerBtn">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              {/* RIGHT: Quick shortcuts */}
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
                  <Quick href="/goals/daily" label="Daily" sub="mark habits" />
                  <Quick href="/mood" label="Mood check-in" sub="tap + note" />
                  <Quick href="/win" label="Log a win" sub="tiny counts" />
                  <Quick href="/progress" label="Progress" sub="charts + streaks" />
                </div>

                <div className="miniHint">Tip: keep your habit list short. If it feels heavy, pause it.</div>
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

  --border: rgba(124,58,237,.16);
  --border2: rgba(124,58,237,.26);

  --accent: rgba(124,58,237,.12);
  --accent2: rgba(124,58,237,.20);

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

  --surface: rgba(255,255,255,.08);

  --border: rgba(167,139,250,.20);
  --border2: rgba(167,139,250,.30);

  --accent: rgba(124,58,237,.16);
  --accent2: rgba(124,58,237,.24);
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
  position: relative;
  color: var(--text);
  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.18), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.12), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.10), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
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
  box-shadow: 0 30px 80px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.10);
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
  width: 28px; height: 28px;
  display:grid; place-items:center;
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
  padding: 12px 14px;
  border-radius: 18px;
  font-weight: 1000;
  cursor:pointer;
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
  box-shadow: 0 30px 90px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.10);
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
  box-shadow: 0 22px 60px rgba(0,0,0,.12);
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
  font-weight: 1000;
  font-size: 12px;
}

/* KPIs */
.kpiRow{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin: 10px 0 12px; }
.kpi{
  border-radius: 18px;
  padding: 12px 12px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.10);
}
.kpiValue{ font-size: 22px; font-weight: 1100; color: var(--text); }
.kpiLabel{ font-size: 11px; color: var(--muted); font-weight: 950; margin-top: 4px; }

/* Message */
.msgCard{
  border-radius: 20px;
  padding: 14px;
  background: linear-gradient(90deg, rgba(124,58,237,.14), rgba(167,139,250,.10));
  border: 1px solid rgba(124,58,237,.22);
}
.msgTitle{ font-size: 12px; font-weight: 1100; color: var(--muted); margin-bottom: 6px; }
.msgText{ font-size: 18px; font-weight: 1000; line-height: 1.25; }

/* Form */
.formRow{
  display:flex;
  gap: 10px;
  align-items:center;
  flex-wrap:wrap;
  margin-top: 12px;
}
.input{
  flex: 1 1 240px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  outline: none;
  font-weight: 950;
}
.input:focus{ border-color: var(--border2); box-shadow: 0 0 0 5px rgba(124,58,237,.18); }

.primaryBtn{
  padding: 11px 16px;
  border-radius: 16px;
  border: 1px solid rgba(17,24,39,.92);
  background: linear-gradient(180deg, #111827, #0b1220);
  color: white;
  font-weight: 1100;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(0,0,0,.12);
}

.mutedBlock{ margin-top: 12px; color: var(--muted); font-weight: 950; }

/* Habit list */
.habitList{ display:grid; gap: 10px; margin-top: 12px; }
.habitRow{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
}
.habitLeft{ display:flex; flex-direction:column; min-width: 0; }
.habitName{ font-weight: 1100; font-size: 16px; }
.habitMeta{ font-size: 12px; color: var(--muted); font-weight: 950; margin-top: 2px; }
.habitRight{ display:flex; gap: 8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }

.pill{
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 1100;
  cursor: pointer;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  color: var(--text);
}
.pillOn{
  background: linear-gradient(180deg, #111827, #0b1220);
  color: white;
  border-color: rgba(17,24,39,.92);
}
.pillOff{ background: rgba(255,255,255,.06); color: var(--text); }

.dangerBtn{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.12);
  color: #fb7185;
  font-weight: 1100;
  cursor: pointer;
}

/* Shortcuts */
.viewAll{
  font-weight: 1000; font-size: 12px;
  color: var(--text);
  padding: 8px 10px; border-radius: 999px;
  background: var(--accent); border: 1px solid var(--accent2);
  text-decoration:none;
}
.viewAll:hover{ filter: brightness(1.06); }

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

/* Bad day card */
.heroCard{
  background: var(--card);
  border-radius: 22px;
  border: 1px solid var(--border);
  box-shadow: 0 22px 50px rgba(0,0,0,.12);
  padding: 18px;
  width: 100%;
}
.heroCentered{ display:flex; flex-direction:column; align-items:flex-start; }
.heroMeta{ font-size: 12px; color: var(--muted); font-weight: 950; }
.heroTitle{ font-size: 38px; font-weight: 1100; margin-top: 6px; letter-spacing: -0.6px; }
.heroMsg{ margin-top: 6px; font-weight: 950; color: var(--muted); max-width: 56ch; }
.softLine{ height: 1px; background: rgba(124,58,237,.24); margin: 14px 0; width: 100%; }

/* ================= MOBILE DRAWER ================= */
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
}
`;
