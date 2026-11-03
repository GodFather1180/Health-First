"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { todayKey, prettyDate, addDays } from "@/lib/time";
import { getAll, put, del } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import { uid } from "@/lib/id";

type WinRow = {
  id: string;
  dateKey?: string;
  date?: string;
  text?: string;
  win?: string;
  value?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
};

const now = () => Date.now();
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

function normalizeDateKey(row: any): string {
  return row?.dateKey ?? row?.date ?? todayKey();
}
function normalizeText(row: any): string {
  return row?.text ?? row?.win ?? row?.value ?? "";
}

export default function WinPage() {
  const path = usePathname();

  const [dateKey, setDateKey] = useState(todayKey());
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [allWins, setAllWins] = useState<WinRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const [badDay, setBadDay] = useState(false);

  // mobile sidebar
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);

  // load bad day once
  useEffect(() => {
    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
  }, []);

  // persist + notify
  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  const title = useMemo(() => prettyDate(dateKey), [dateKey]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2200);
  }

  async function refresh() {
    const rows = await getAll<WinRow>(STORES.winEntries as any);

    const normalized = rows
      .map((r: any) => ({
        ...r,
        dateKey: normalizeDateKey(r),
        text: normalizeText(r),
      }))
      .sort((a: any, b: any) => {
        const ta = Number(a.updatedAt ?? a.createdAt ?? 0);
        const tb = Number(b.updatedAt ?? b.createdAt ?? 0);
        if (tb !== ta) return tb - ta;
        return String(b.dateKey).localeCompare(String(a.dateKey));
      });

    setAllWins(normalized as any);
  }

  // Load once
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

  const todaysWin = useMemo(() => {
    return allWins.find((w: any) => String(w.dateKey) === String(dateKey)) as any;
  }, [allWins, dateKey]);

  // Keep textbox synced to selected day
  useEffect(() => {
    setText(todaysWin?.text ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysWin?.id, dateKey]);

  const history = useMemo(() => {
    return allWins.filter((w: any) => String(w.text ?? "").trim().length > 0);
  }, [allWins]);

  async function save() {
    const t = text.trim();
    if (!t) {
      flash("Write a tiny win first ✨");
      return;
    }

    if (todaysWin) {
      await put(STORES.winEntries as any, {
        ...todaysWin,
        dateKey,
        text: t,
        updatedAt: now(),
      });
    } else {
      await put(STORES.winEntries as any, {
        id: uid("w"),
        dateKey,
        text: t,
        createdAt: now(),
        updatedAt: now(),
      } satisfies WinRow);
    }

    await refresh();
    flash("Saved ✅");
  }

  async function removeEntry(entry: any) {
    await del(STORES.winEntries as any, entry.id);
    await refresh();
    flash("Deleted");
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
            {/* LEFT: Win editor + history */}
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">{title}</div>
                  <div className="h2">Win of the Day</div>
                </div>
                <div className="chip">{todaysWin ? "Saved" : "Draft"}</div>
              </div>

              {/* DATE NAV — matches Daily */}
              <div className="dateRow">
                <button className="iconBtn" onClick={() => setDateKey((d) => addDays(d, -1))} aria-label="Previous day">
                  ←
                </button>
                <button className="softBtn" onClick={() => setDateKey(todayKey())}>
                  Today
                </button>
                <button className="iconBtn" onClick={() => setDateKey((d) => addDays(d, 1))} aria-label="Next day">
                  →
                </button>

                <input
                  className="dateInput"
                  type="date"
                  value={dateKey}
                  onChange={(e) => setDateKey(e.target.value)}
                />
              </div>

              {notice ? (
                <div className="notice">
                  <span className="noticeText">{notice}</span>
                </div>
              ) : null}

              <div className="mutedBlock" style={{ marginTop: 0 }}>
                One small win counts. Even tiny: getting out of bed, drinking water, sending one message.
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Type your win…"
                className="textarea"
              />

              <div className="rowActions">
                <button className="primaryBtn" onClick={save}>
                  Save win
                </button>

                {todaysWin ? (
                  <button className="dangerBtn" onClick={() => removeEntry(todaysWin)}>
                    Delete
                  </button>
                ) : null}

                <div className="rowMeta">{todaysWin ? "Saved for this date" : "Not saved yet"}</div>
              </div>

              <div className="sectionTitle">History</div>

              {loading ? <div className="mutedBlock">Loading…</div> : null}

              {!loading ? (
                <div className="historyList">
                  {history.length === 0 ? (
                    <div className="mutedBlock">No wins yet. Your first tiny win can be today ✨</div>
                  ) : (
                    history.slice(0, 30).map((w: any) => (
                      <div key={w.id} className="historyRow">
                        <div className="historyTop">
                          <div className="historyDate">{w.dateKey}</div>
                          <button className="miniBtn" onClick={() => setDateKey(w.dateKey)}>
                            Jump
                          </button>
                        </div>

                        <div className="historyText">{w.text}</div>

                        <div className="historyActions">
                          <button className="miniDangerBtn" onClick={() => removeEntry(w)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {/* RIGHT: shortcuts like Daily */}
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
                <Quick href="/mood" label="Mood check-in" sub="tap + note" />
                <Quick href="/self-care" label="Edit habits" sub="add / pause" />
                <Quick href="/letters" label="Letters" sub="comfort reads" />
                <Quick href="/progress" label="Progress" sub="charts + streaks" />
              </div>

              <div className="miniHint">Tip: open the sidebar on mobile by tapping “Health First” up top.</div>
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

/* --------- styles (same vibe as Daily) --------- */

const styles = `
:global(html, body) { background: var(--bg0); color: var(--text); }

.shell{
  /* use GLOBAL tokens (these change automatically in dark mode) */
  min-height: 100vh;
  display:grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 16px;
  color: var(--text);
  position: relative;

  /* background uses global vars so it flips in dark */
  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.18), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.12), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.10), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
}

/* overlay for mobile */
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
.brandBtn:hover{ background: rgba(124,58,237,.10); }

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
  place-items:center;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.22);
  color: var(--text);
  font-weight: 1000;
}

.nav{ display:flex; flex-direction:column; gap: 6px; padding: 4px; }

.navItem{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 12px; border-radius: 16px;
  color: var(--text);
  opacity:.92;
  border: 1px solid transparent;
  text-decoration: none;
}
.navItem:hover{
  opacity: 1;
  border-color: var(--border);
  background: rgba(124,58,237,.10);
}
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
  opacity:.78; font-size: 12px;
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
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.22);
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

.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
.muted{ font-size: 12px; color: var(--muted); font-weight: 950; letter-spacing: .2px; }
.h2{ font-size: 26px; font-weight: 1100; margin-top: 2px; letter-spacing: -.4px; }

.chip{
  padding: 8px 10px; border-radius: 999px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.24);
  color: var(--text);
  font-weight: 1000; font-size: 12px;
}

.viewAll{
  font-weight: 1000; font-size: 12px;
  color: var(--text);
  padding: 8px 10px; border-radius: 999px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.24);
  text-decoration:none;
}

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
  background: rgba(255,255,255,.06);
  cursor: pointer;
  font-weight: 1100;
  color: var(--text);
}
.softBtn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.14);
  cursor: pointer;
  font-weight: 1100;
  color: var(--text);
}
.dateInput{
  margin-left: auto;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  color: var(--text);
  font-weight: 1000;
}

.notice{
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid rgba(124,58,237,.24);
  background: rgba(255,255,255,.06);
  box-shadow: 0 14px 30px rgba(0,0,0,.10);
  margin: 6px 0 10px;
}
.noticeText{ font-weight: 1000; }

.textarea{
  width: 100%;
  margin-top: 10px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  outline: none;
  font-size: 14px;
  background: rgba(255,255,255,.06);
  color: var(--text);
  resize: vertical;
  font-weight: 700;
}
.textarea:focus{ box-shadow: 0 0 0 4px rgba(124,58,237,.18); }

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
.dangerBtn{
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.12);
  color: #fb7185;
  font-weight: 1100;
  cursor: pointer;
}
.rowMeta{
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
  font-weight: 950;
}

.sectionTitle{
  margin-top: 16px;
  font-weight: 1100;
  font-size: 16px;
}

.historyList{ display:grid; gap: 10px; margin-top: 10px; }

.historyRow{
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  padding: 12px 14px;
}
.historyTop{ display:flex; justify-content:space-between; gap: 12px; align-items:baseline; }
.historyDate{ font-weight: 1100; }
.historyText{ margin-top: 6px; white-space: pre-wrap; font-weight: 750; }

.historyActions{ display:flex; gap: 8px; margin-top: 10px; }

.miniBtn{
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  color: var(--text);
  font-weight: 1000;
  cursor: pointer;
  font-size: 12px;
}
.miniDangerBtn{
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.12);
  color: #fb7185;
  font-weight: 1000;
  cursor: pointer;
  font-size: 12px;
}

.quickGrid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick{
  display:flex; align-items:center; gap: 10px;
  padding: 12px 12px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  text-decoration:none;
  color: var(--text);
}
.quick:hover{
  background: rgba(124,58,237,.12);
  border-color: rgba(124,58,237,.30);
}
.quickIcon{
  width: 36px; height: 36px; border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.22);
  color: var(--text);
  font-weight: 1100;
}
.quickText{ flex:1; min-width: 0; }
.quickLabel{ font-weight: 1100; }
.quickSub{ font-size: 12px; color: var(--muted); font-weight: 950; margin-top: 2px; }
.quickGo{ font-size: 22px; opacity: .45; font-weight: 1100; }

.miniHint{
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 950;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px dashed rgba(124,58,237,.30);
  background: rgba(124,58,237,.10);
}

.mutedBlock{ margin-top: 12px; color: var(--muted); font-weight: 950; }

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

  .grid2{ grid-template-columns: 1fr; }
  .dateInput{ margin-left: 0; width: 100%; }
  .rowMeta{ margin-left: 0; width: 100%; }
}
`;
