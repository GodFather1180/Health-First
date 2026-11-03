"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAll } from "@/lib/localStore";
import { STORES } from "@/lib/localStore/tables";
import type { Letter, LetterSection } from "@/types/domain";

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

const SECTION_ORDER: LetterSection[] = ["LOW", "FUTURE", "NEW_YEAR", "GENERAL"];

export default function LettersPage() {
  const path = usePathname();

  const [letters, setLetters] = useState<Letter[]>([]);
  const [section, setSection] = useState<LetterSection | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

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

  async function load() {
    setLoading(true);
    const all = await getAll<Letter>(STORES.letters);
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setLetters(all);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (section === "ALL") return letters;
    return letters.filter((l) => l.section === section);
  }, [letters, section]);

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
          <section className="grid2">
            {/* LEFT: Letters */}
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">Write to yourself</div>
                  <div className="h2">Letters</div>
                </div>

                <Link className="primaryLink" href="/letters/new">
                  + New letter
                </Link>
              </div>

              <div className="subCopy">Write to yourself. Keep it soft. Keep it honest.</div>

              <div className="filters">
                <FilterPill active={section === "ALL"} onClick={() => setSection("ALL")}>
                  All
                </FilterPill>
                {SECTION_ORDER.map((s) => (
                  <FilterPill key={s} active={section === s} onClick={() => setSection(s)}>
                    {LABELS[s]}
                  </FilterPill>
                ))}
              </div>

              {loading ? <div className="mutedBlock">Loading…</div> : null}

              {!loading ? (
                <div className="letterGrid">
                  {filtered.length === 0 ? (
                    <div className="mutedBlock">
                      No letters yet. Write one for the version of you that needs it.
                    </div>
                  ) : (
                    filtered.map((l) => (
                      <Link key={l.id} href={`/letters/${l.id}`} className="letterCard">
                        <div className="letterTag">{LABELS[l.section]}</div>
                        <div className="letterTitle">{l.title || "Untitled"}</div>
                        <div className="letterBody">
                          {l.body.length > 140 ? l.body.slice(0, 140) + "…" : l.body}
                        </div>
                        <div className="letterTime">{new Date(l.createdAt).toLocaleString()}</div>
                      </Link>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {/* RIGHT: Shortcuts */}
            <div className="card rightCard">
              <div className="cardTop">
                <div>
                  <div className="muted">Quick</div>
                  <div className="h2">Shortcuts</div>
                </div>
                <Link className="viewAll" href="/affirmations">
                  Affirmations
                </Link>
              </div>

              <div className="quickGrid">
                <Quick href="/letters/new" label="New letter" sub="write it out" />
                <Quick href="/affirmations" label="Affirmations" sub="instant soothe" />
                <Quick href="/mood" label="Mood check-in" sub="tap + note" />
                <Quick href="/win" label="Log a win" sub="tiny counts" />
              </div>

              <div className="miniHint">Tip: write like you’re talking to your favorite person (you).</div>
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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`pill ${active ? "pillOn" : ""}`}>
      {children}
    </button>
  );
}
const styles = `
/* ---------------- THEME TOKENS (GLOBAL) ---------------- */
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

.primaryLink{
  display:inline-flex;
  align-items:center;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(17,24,39,.92);
  background: linear-gradient(180deg, #111827, #0b1220);
  color: #fff;
  text-decoration:none;
  font-weight: 1100;
}

.filters{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.06);
  box-shadow: 0 14px 30px rgba(0,0,0,.10);
}
.pill{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.08);
  color: var(--text);
  font-weight: 950;
  cursor: pointer;
}
.pillOn{
  border-color: rgba(17,24,39,.90);
  background: linear-gradient(180deg, #111827, #0b1220);
  color: #fff;
}

.mutedBlock{ margin-top: 12px; color: var(--muted); font-weight: 950; }

.letterGrid{ margin-top: 14px; display:grid; gap: 12px; }

.letterCard{
  text-decoration:none;
  color: inherit;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  background: rgba(255,255,255,.08);
  box-shadow: 0 18px 45px rgba(0,0,0,.16);
}
.letterCard:hover{
  border-color: var(--border2);
  background: linear-gradient(180deg, rgba(124,58,237,.12), rgba(255,255,255,.06));
}
.letterTag{ font-size: 12px; font-weight: 1000; color: var(--muted); margin-bottom: 6px; }
.letterTitle{ font-size: 18px; font-weight: 1100; margin-bottom: 6px; }
.letterBody{ color: var(--muted); line-height: 1.4; white-space: pre-wrap; }
.letterTime{ margin-top: 10px; font-size: 12px; color: var(--muted); opacity: .9; }

/* shortcuts */
.viewAll{
  font-weight: 1000; font-size: 12px;
  color: var(--text);
  padding: 8px 10px; border-radius: 999px;
  background: rgba(124,58,237,.14); border: 1px solid rgba(124,58,237,.24);
  text-decoration:none;
}
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
.quick:hover{
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
