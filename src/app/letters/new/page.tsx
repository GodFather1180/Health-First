"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { put } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import type { Letter, LetterSection } from "@/types/domain";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

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

const LABELS: Record<LetterSection, string> = {
  LOW: "Read when I feel low",
  FUTURE: "Future self",
  NEW_YEAR: "New Year letter",
  GENERAL: "General",
};

export default function NewLetterPage() {
  const router = useRouter();
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

  const [section, setSection] = useState<LetterSection>("LOW");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const helper = useMemo(() => {
    if (section === "LOW") return "Write something you’d want to read on your worst day.";
    if (section === "FUTURE") return "Write to the you that’s about to make it through.";
    if (section === "NEW_YEAR") return "Write a letter you’ll read at the start of a new year.";
    return "Write anything you need to say.";
  }, [section]);

  async function save() {
    const t = title.trim();
    const b = body.trim();
    if (!b) return;

    const letter: Letter = {
      id: id(),
      section,
      title: t || LABELS[section],
      body: b,
      createdAt: now(),
      updatedAt: now(),
    };

    await put(STORES.letters, letter);
    router.push("/letters");
  }

  return (
    <div className="shell">
      <button className={`overlay ${navOpen ? "overlayOn" : ""}`} aria-label="Close sidebar" onClick={() => setNavOpen(false)} />

      <aside className={`sidebar ${navOpen ? "sidebarOpen" : ""}`}>
        <button className="brandBtn" type="button" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle sidebar">
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
              <Link key={n.href} href={n.href} className={`navItem ${active ? "active" : ""}`} onClick={() => setNavOpen(false)}>
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
          <section className="grid2">
            {/* LEFT: editor */}
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">{LABELS[section]}</div>
                  <div className="h2">New letter</div>
                </div>

                <Link className="viewAll" href="/letters">
                  Back
                </Link>
              </div>

              <div className="subCopy">{helper}</div>

              <div className="formGrid">
                <label className="field">
                  <div className="fieldLabel">Section</div>
                  <select value={section} onChange={(e) => setSection(e.target.value as LetterSection)} className="select">
                    <option value="LOW">{LABELS.LOW}</option>
                    <option value="FUTURE">{LABELS.FUTURE}</option>
                    <option value="NEW_YEAR">{LABELS.NEW_YEAR}</option>
                    <option value="GENERAL">{LABELS.GENERAL}</option>
                  </select>
                </label>

                <label className="field">
                  <div className="fieldLabel">Title</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" className="input" />
                </label>

                <label className="field">
                  <div className="fieldLabel">Letter</div>

                  {/* NOTEBOOK */}
                  <div className="notebook">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Dear me…"
                      rows={12}
                      className="noteArea"
                    />
                  </div>

                  <div className="hint">Tip: write like you’re talking to your favorite person (you).</div>
                </label>

                <div className="actions">
                  <button className="ghostBtn" onClick={() => router.push("/letters")}>
                    Cancel
                  </button>
                  <button className="primaryBtn" onClick={save}>
                    Save letter
                  </button>
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
                <Link className="viewAll" href="/letters">
                  Letters
                </Link>
              </div>

              <div className="quickGrid">
                <Quick href="/mood" label="Mood check-in" sub="tap + note" />
                <Quick href="/win" label="Log a win" sub="tiny counts" />
                <Quick href="/affirmations" label="Affirmations" sub="instant soothe" />
                <Quick href="/self-care" label="Self-Care" sub="edit habits" />
              </div>

              <div className="miniHint">If your thoughts feel loud, write smaller. One line at a time.</div>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

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
/* THEME TOKENS */
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
:global(html, body){ background: var(--bg0); color: var(--text); }

/* layout */
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

/* overlay */
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

/* sidebar (same base) */
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
  background: rgba(124,58,237,.14); border: 1px solid rgba(124,58,237,.22);
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
  box-shadow: 0 22px 60px rgba(0,0,0,.14);
  padding: 16px;
  overflow: hidden;
}
.rightCard{ align-self: start; }

.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
.muted{ font-size: 12px; color: var(--muted); font-weight: 950; letter-spacing: .2px; }
.h2{ font-size: 26px; font-weight: 1100; margin-top: 2px; letter-spacing: -.4px; }
.subCopy{ color: var(--muted); font-weight: 850; margin-bottom: 12px; }

.viewAll{
  font-weight: 1000; font-size: 12px; color: var(--text);
  padding: 8px 10px; border-radius: 999px;
  background: rgba(124,58,237,.14); border: 1px solid rgba(124,58,237,.24);
  text-decoration:none;
}
.viewAll:hover{ filter: brightness(1.06); }

.formGrid{ display:grid; gap: 12px; margin-top: 6px; }
.field{ display:grid; gap: 6px; }
.fieldLabel{ font-weight: 1000; }

.select, .input{
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 850;
  outline: none;
}

.hint{ margin-top: 10px; font-size: 12px; color: var(--muted); font-weight: 850; }

.actions{
  display:flex;
  gap: 10px;
  justify-content:flex-end;
  flex-wrap:wrap;
  margin-top: 6px;
}
.ghostBtn{
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 1000;
  cursor: pointer;
}
.primaryBtn{
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(17,24,39,.92);
  background: linear-gradient(180deg, #111827, #0b1220);
  color: #fff;
  font-weight: 1100;
  cursor: pointer;
}

/* NOTEBOOK LOOK (dark-safe) */
.notebook{
  position: relative;
  border-radius: 20px;
  border: 1px solid var(--border);
  background:
    linear-gradient(90deg, rgba(236,72,153,.22) 0, rgba(236,72,153,.22) 2px, transparent 2px) 56px 0 / 100% 100%,
    repeating-linear-gradient(
      to bottom,
      rgba(124,58,237,.14) 0px,
      rgba(124,58,237,.14) 1px,
      transparent 1px,
      transparent 26px
    ),
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.06));
  box-shadow: 0 22px 60px rgba(0,0,0,.16);
  padding: 18px 16px 18px 16px;
  overflow: hidden;
}
.notebook:before{
  content:"";
  position:absolute;
  left: 24px;
  top: 0;
  bottom: 0;
  width: 10px;
  background: radial-gradient(circle, rgba(124,58,237,.20) 35%, transparent 36%) 0 14px / 10px 28px;
  opacity: .9;
}
.noteArea{
  width: 100%;
  border: 0;
  outline: none;
  resize: vertical;
  background: transparent;
  padding-left: 56px;
  font-size: 16px;
  line-height: 26px;
  font-weight: 750;
  color: var(--text);
  font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
}

/* shortcuts */
.quickGrid{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick{
  display:flex; align-items:center; gap: 10px;
  padding: 12px 12px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  text-decoration:none;
  color: inherit;
}
.quick:hover{ background: rgba(124,58,237,.12); border-color: var(--border2); }
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
}
`;
