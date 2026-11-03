"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { todayKey, prettyDate, addDays } from "@/lib/time";
import { getByIndex, put } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import type { Mood, MoodEntry } from "@/types/domain";

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();
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

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: "SHIT", label: "shit", emoji: "☁️" },
  { value: "BAD", label: "bad", emoji: "⛈️" },
  { value: "MEH", label: "meh", emoji: "😐" },
  { value: "GOOD", label: "good", emoji: "🌤️" },
  { value: "SLAYING", label: "slaying", emoji: "✨" },
];

function moodLabel(m: Mood) {
  return MOODS.find((x) => x.value === m)?.label ?? m;
}

export default function MoodPage() {
  const path = usePathname();

  const [dateKey, setDateKey] = useState(todayKey());

  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);

  const [savedNote, setSavedNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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

  const title = useMemo(() => prettyDate(dateKey), [dateKey]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const list = await getByIndex<MoodEntry>(STORES.moodEntries, "by_date", dateKey);
      const existing = list[0] ?? null;

      if (!alive) return;

      setEntry(existing);
      setMood(existing?.mood ?? null);

      const n = existing?.note ?? "";
      setSavedNote(n);
      setNoteDraft(n);
      setStatusMsg(null);
    })();

    return () => {
      alive = false;
    };
  }, [dateKey]);

  function flash(msg: string) {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(null), 2000);
  }

  async function saveMood(selected: Mood) {
    setMood(selected);

    const next: MoodEntry = entry
      ? {
          ...entry,
          mood: selected,
          note: noteDraft.trim() || undefined,
          updatedAt: now(),
        }
      : {
          id: makeId(),
          date: dateKey,
          mood: selected,
          note: noteDraft.trim() || undefined,
          createdAt: now(),
          updatedAt: now(),
        };

    await put(STORES.moodEntries, next);
    setEntry(next);
    setSavedNote(next.note ?? "");
    flash(`Saved ✅ (${moodLabel(selected)})`);
  }

  async function saveNote() {
    if (!mood) {
      flash("Pick a mood first 💛");
      return;
    }

    const next: MoodEntry = {
      ...(entry ?? {
        id: makeId(),
        date: dateKey,
        createdAt: now(),
      }),
      mood,
      note: noteDraft.trim() || undefined,
      updatedAt: now(),
    };

    await put(STORES.moodEntries, next as MoodEntry);
    setEntry(next as MoodEntry);
    setSavedNote(next.note ?? "");
    flash("Note saved ✅");
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
          <button className="mobileMenuBtn" type="button" onClick={() => setNavOpen(true)} aria-label="Open sidebar">
            <span className="mobileMenuIcon">≡</span>
            <span className="mobileMenuText">Health First</span>
          </button>
        </div>

        <div className="content">
          <section className="grid2">
            {/* LEFT: mood */}
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">{title}</div>
                  <div className="h2">Mood Check-In</div>
                </div>
                <div className="chip">{mood ? moodLabel(mood) : "No mood yet"}</div>
              </div>

              {/* date row */}
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

                <input className="dateInput" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
              </div>

              {statusMsg ? (
                <div className="notice">
                  <span className="noticeText">{statusMsg}</span>
                </div>
              ) : null}

              <div className="moodState">
                <div className="moodStateTitle">
                  Selected mood: <b>{mood ? moodLabel(mood) : "—"}</b>
                </div>
                <div className="moodStateNote">
                  <b>Saved note:</b> {savedNote.trim() ? savedNote : "—"}
                </div>
              </div>

              <div className="moodGrid">
                {MOODS.map((m) => {
                  const on = mood === m.value;
                  return (
                    <button
                      key={m.value}
                      className={`moodBtn ${on ? "moodOn" : ""}`}
                      onClick={() => saveMood(m.value)}
                      aria-pressed={on}
                    >
                      <span className="moodEmoji">{m.emoji}</span>
                      <span className="moodText">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="noteWrap">
                <div className="noteTop">
                  <div className="noteTitle">Note</div>
                  <div className="noteHint">Ctrl/⌘ + Enter to save</div>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Optional note…"
                  rows={4}
                  className="textarea"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      saveNote();
                    }
                  }}
                />

                <div className="rowActions">
                  <button className="primaryBtn" onClick={saveNote}>
                    Save note
                  </button>
                  <div className="rowMeta">You can change it anytime. No worries.</div>
                </div>
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
                <Quick href="/self-care" label="Self-Care" sub="edit habits" />
                <Quick href="/progress" label="Progress" sub="charts + streaks" />
                <Quick href="/letters" label="Letters" sub="comfort reads" />
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
const styles = `
/* ---------------- THEME TOKENS (GLOBAL, WORKS WITH styled-jsx) ---------------- */

:global(:root){
  --bg0:#f6f1ff;
  --bg1:#efe6ff;

  --text:#1b1230;
  --muted: rgba(27,18,48,.70);

  --card: rgba(255,255,255,.78);
  --card2: rgba(255,255,255,.52);

  --surface: rgba(255,255,255,.86);
  --surface2: rgba(255,255,255,.92);

  --border: rgba(124,58,237,.16);
  --border2: rgba(124,58,237,.22);

  --violet-500:#7c3aed;
  --violet-400:#a78bfa;
}

/* Dark mode triggers: supports BOTH html[data-theme="dark"] and html.dark */
:global(html[data-theme="dark"]),
:global(html.dark),
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
}

:global(html, body){
  background: var(--bg0);
  color: var(--text);
}

/* ---------------- LAYOUT ---------------- */

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

/* overlay for mobile */
.overlay{
  display:none;
  border:0;
  padding:0;
  background: transparent;
}
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

/* ---------------- SIDEBAR ---------------- */

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
  border: 1px dashed rgba(167,139,250,.30);
  background: rgba(255,255,255,.06);
}

/* ---------------- MAIN ---------------- */

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

.grid2{
  display:grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 14px;
  align-items:start;
}

/* ---------------- CARDS + TYPO ---------------- */

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
.viewAll:hover{ filter: brightness(1.06); }

/* ---------------- DATE ROW + NOTICE ---------------- */

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
  cursor: pointer;
  font-weight: 1100;
  color: var(--text);
}
.dateInput{
  margin-left: auto;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 1000;
}

:global(html[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator),
:global(html.dark input[type="date"]::-webkit-calendar-picker-indicator),
:global(.dark input[type="date"]::-webkit-calendar-picker-indicator){
  filter: invert(1);
  opacity: .85;
}

.notice{
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  box-shadow: 0 14px 30px rgba(0,0,0,.10);
  margin: 6px 0 10px;
}
.noticeText{ font-weight: 1000; }

/* ---------------- MOOD SECTION ---------------- */

.moodState{
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface2);
  padding: 12px 14px;
}
.moodStateTitle{ font-weight: 950; }
.moodStateNote{ margin-top: 6px; color: var(--muted); font-weight: 850; }

.moodGrid{
  display:grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.moodBtn{
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 12px 10px;
  cursor: pointer;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap: 6px;
  font-weight: 1000;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}
.moodBtn:hover{ transform: translateY(-1px); background: rgba(124,58,237,.14); }

.moodOn{
  border-color: var(--border2);
  background: linear-gradient(180deg, rgba(124,58,237,.22), rgba(255,255,255,.06));
  box-shadow: 0 16px 40px rgba(124,58,237,.12);
}

.moodEmoji{ font-size: 18px; }
.moodText{ font-size: 13px; text-transform: lowercase; opacity: .92; }

/* note */
.noteWrap{ margin-top: 12px; }
.noteTop{ display:flex; justify-content:space-between; align-items:baseline; gap: 10px; }
.noteTitle{ font-weight: 1100; }
.noteHint{ font-size: 12px; color: var(--muted); font-weight: 950; }

.textarea{
  width: 100%;
  margin-top: 8px;
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

/* ---------------- SHORTCUTS ---------------- */

.quickGrid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick{
  display:flex; align-items:center; gap: 10px;
  padding: 12px 12px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  text-decoration:none;
  color: var(--text);
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.quick:hover{
  transform: translateY(-1px);
  background: rgba(124,58,237,.12);
  border-color: var(--border2);
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

/* ---------------- MOBILE ---------------- */

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
  .sidebarOpen{ transform: translateX(calc(0px)); }
  .brandChevron{ display:grid; }

  .grid2{ grid-template-columns: 1fr; }
  .dateInput{ margin-left: 0; width: 100%; }
  .rowMeta{ margin-left: 0; width: 100%; }
  .moodGrid{ grid-template-columns: 1fr 1fr; }
}
`;
