"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { exportAllLocal, importAllLocal } from "@/lib/localStore/backup";
import { wipeLocalDb } from "@/lib/localStore/reset";
import { pullAccountData, pushAccountData } from "@/lib/accountData/accountDataClient";
import { applyUiPrefs, loadUiPrefs, saveUiPrefs, type UiPrefs } from "@/lib/uiPrefs";

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

function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const path = usePathname();

  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [prefs, setPrefs] = useState<UiPrefs>({
    darkMode: false,
    largeText: false,
  });

  const [badDay, setBadDay] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);

  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [lastCloud, setLastCloud] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3200);
  }

  async function refreshMe() {
    const res = await fetch("/api/auth/me");
    const json = await res.json().catch(() => ({}));
    setMe(json?.user ?? null);
  }

  useEffect(() => {
    const p = loadUiPrefs();
    setPrefs(p);
    applyUiPrefs(p);

    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
    refreshMe();
  }, []);

  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  function updatePrefs(next: UiPrefs) {
    setPrefs(next);
    saveUiPrefs(next);
    applyUiPrefs(next);
  }

  async function register() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return flash(json?.error ?? "Register failed.");

      await refreshMe();
      await pushAccountData().catch(() => {});
      flash("Account created ✅");
    } catch (e: any) {
      flash(e?.message ?? "Register failed.");
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return flash(json?.error ?? "Login failed.");

      await refreshMe();

      const pulled = await pullAccountData();
      if (!pulled.found) {
        await pushAccountData().catch(() => {});
        flash("Logged in ✅ (no cloud data yet — uploaded local)");
      } else {
        setLastCloud(pulled.updatedAt ?? null);
        flash("Logged in ✅ Loaded your account data. Reloading…");
        window.location.reload();
      }
    } catch (e: any) {
      flash(e?.message ?? "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await wipeLocalDb();

      setMe(null);
      flash("Logged out. Local data cleared ✅ Reloading…");
      window.location.reload();
    } catch (e: any) {
      flash(e?.message ?? "Logout failed.");
    } finally {
      setBusy(false);
    }
  }

  async function exportJson() {
    setBusy(true);
    try {
      const bundle = await exportAllLocal();
      downloadJson(`healthfirst-backup-${new Date().toISOString().slice(0, 10)}.json`, bundle);
      flash("Exported ✅");
    } catch (e: any) {
      flash(e?.message ?? "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importJson(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      await importAllLocal(bundle);
      flash("Imported ✅ Reloading…");
      window.location.reload();
    } catch (e: any) {
      flash(e?.message ?? "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveToAccount() {
    if (!me) return flash("Log in first.");
    setBusy(true);
    try {
      const r = await pushAccountData();
      setLastCloud(r.updatedAt ?? new Date().toISOString());
      flash("Saved to account ✅");
    } catch (e: any) {
      flash(e?.message ?? "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFromAccount() {
    if (!me) return flash("Log in first.");
    setBusy(true);
    try {
      const r = await pullAccountData();
      if (!r.found) return flash("No account data saved yet.");
      setLastCloud(r.updatedAt ?? new Date().toISOString());
      flash("Loaded from account ✅ Reloading…");
      window.location.reload();
    } catch (e: any) {
      flash(e?.message ?? "Load failed.");
    } finally {
      setBusy(false);
    }
  }

  const cloudStatus = useMemo(() => {
    if (!me) return "Not logged in (local-only mode).";
    return lastCloud ? `Account data updated: ${lastCloud}` : "Logged in.";
  }, [me, lastCloud]);

  return (
    <div className="shell">
      {/* overlay for mobile */}
      <button
        className={`overlay ${navOpen ? "overlayOn" : ""}`}
        aria-label="Close sidebar"
        onClick={() => setNavOpen(false)}
        tabIndex={navOpen ? 0 : -1}
      />

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
          <div className="pageTop">
            <div>
              <div className="muted">Preferences</div>
              <div className="h1">Settings</div>
              <div className="sub">Make it comfy. Keep it yours.</div>
            </div>

            <div className="statusPill">{cloudStatus}</div>
          </div>

          {notice ? <div className="notice">{notice}</div> : null}

          <section className="grid2">
            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">Look & feel</div>
                  <div className="h2">Appearance</div>
                </div>
              </div>

              <div className="toggleRow">
                <Toggle
                  label="Dark mode"
                  desc="Easier on the eyes at night."
                  on={prefs.darkMode}
                  disabled={busy}
                  onToggle={() => updatePrefs({ ...prefs, darkMode: !prefs.darkMode })}
                />
                <Toggle
                  label="Large text"
                  desc="More breathable reading."
                  on={prefs.largeText}
                  disabled={busy}
                  onToggle={() => updatePrefs({ ...prefs, largeText: !prefs.largeText })}
                />
              </div>
            </div>

            <div className="card">
              <div className="cardTop">
                <div>
                  <div className="muted">Backup</div>
                  <div className="h2">Local data</div>
                </div>
              </div>

              <div className="btnRow">
                <button className="btn" disabled={busy} onClick={exportJson}>
                  Export JSON
                </button>

                <label className="fileBtn" aria-disabled={busy}>
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    disabled={busy}
                    onChange={(e) => importJson(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="hint">Export is a manual backup. Import will overwrite/merge your local database (then reload).</div>
            </div>
          </section>

          <section className="card">
            <div className="cardTop">
              <div>
                <div className="muted">Sync</div>
                <div className="h2">Account</div>
              </div>
            </div>

            {me ? (
              <>
                <div className="meRow">
                  <div className="meChip">
                    <div className="meDot" />
                    <div>
                      <div className="meTop">Logged in</div>
                      <div className="meSub">{me.email}</div>
                    </div>
                  </div>

                  <div className="btnRow">
                    <button className="btn" disabled={busy} onClick={saveToAccount}>
                      Save to account
                    </button>
                    <button className="btn" disabled={busy} onClick={loadFromAccount}>
                      Load from account
                    </button>
                    <button className="btnDanger" disabled={busy} onClick={logout}>
                      Log out (clears local)
                    </button>
                  </div>
                </div>

                <div className="hint">{cloudStatus}</div>
              </>
            ) : (
              <div className="authGrid">
                <div className="hint" style={{ marginBottom: 10 }}>
                  No account = local-only mode. Create an account to use your data on any device.
                </div>

                <label className="field">
                  <div className="fieldLabel">Email</div>
                  <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    autoComplete="email"
                  />
                </label>

                <label className="field">
                  <div className="fieldLabel">Password</div>
                  <div className="pwWrap">
                    <input
                      className="input pwInput"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8+ characters"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                    />
                    <button
                      className="eyeBtn"
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      title={showPw ? "Hide" : "Show"}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>

                <div className="btnRow">
                  <button className="btn" disabled={busy} onClick={register}>
                    Create account
                  </button>
                  <button className="btnDark" disabled={busy} onClick={login}>
                    Log in
                  </button>
                </div>

                <div className="hint">Tip: use a password you can remember (but still not obvious).</div>
              </div>
            )}
          </section>
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

function Toggle({
  label,
  desc,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button className={`toggle ${on ? "toggleOn" : ""}`} disabled={disabled} onClick={onToggle} type="button">
      <div className="toggleText">
        <div className="toggleLabel">{label}</div>
        <div className="toggleDesc">{desc}</div>
      </div>
      <div className={`switch ${on ? "switchOn" : ""}`} aria-hidden>
        <div className="knob" />
      </div>
    </button>
  );
}

const styles = `
/* ✅ DO NOT hard-force light background here. Let globals/theme control it. */

.shell{
  /* use global theme vars from globals.css */
  --violet-500:#7c3aed;
  --violet-400:#a78bfa;

  min-height: 100vh;
  display:grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 16px;

  /* background reacts to theme via --bg0/--bg1 */
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
    background: rgba(10, 6, 20, 0.45);
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
  box-shadow: 0 30px 80px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.18);
}

.brandBtn{
  border:0; background: transparent;
  padding: 10px 8px 8px;
  border-radius: 16px;
  display:flex; align-items:center; gap: 10px;
  cursor: pointer; text-align:left;
  color: var(--text);
}
.brandBtn:hover{ background: rgba(124,58,237,.08); }

.logoDot{
  width: 14px; height: 14px; border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #fff, var(--violet-400), var(--violet-500));
  box-shadow: 0 14px 34px rgba(124,58,237,.28);
  flex: 0 0 auto;
}

.brandText{ flex: 1 1 auto; min-width: 0; }
.brandTop{ font-weight: 1000; letter-spacing: -.2px; }
.brandSub{ font-size: 12px; opacity: .72; margin-top: 1px; color: var(--muted); }

.brandChevron{
  display:none;
  width: 36px; height: 36px;
  border-radius: 14px;
  place-items:center;
  background: rgba(124,58,237,.12);
  border: 1px solid rgba(124,58,237,.18);
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
.navItem:hover{ opacity: 1; border-color: var(--border); background: rgba(124,58,237,.08); }
.navItem.active{
  opacity: 1;
  background: linear-gradient(90deg, rgba(124,58,237,.20), rgba(255,255,255,.06));
  border-color: rgba(124,58,237,.26);
}

.navIcon{
  width: 28px; height: 28px; display:grid; place-items:center;
  border-radius: 12px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.20);
  font-size: 12px;
  color: var(--text);
}

.cta{
  margin-top: 6px;
  border: 1px solid rgba(124,58,237,.22);
  background: linear-gradient(90deg, rgba(124,58,237,.22), rgba(167,139,250,.18));
  color: var(--text);
  padding: 12px 14px; border-radius: 18px;
  font-weight: 1000; cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap: 10px;
  box-shadow: 0 18px 40px rgba(0,0,0,.10);
}
.ctaRight{
  font-weight: 1000; opacity: .92;
  padding: 6px 10px; border-radius: 999px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(124,58,237,.18);
}
.sideHint{
  margin-top:auto;
  opacity:.78; font-size: 12px;
  padding: 10px 12px; border-radius: 16px;
  border: 1px dashed rgba(124,58,237,.26);
  background: rgba(255,255,255,.08);
  color: var(--muted);
}

/* main */
.main{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: 24px;
  backdrop-filter: blur(14px);
  overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow: 0 30px 90px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.18);
}

/* mobile top bar opener */
.mobileTopbar{ display:none; padding: 12px 12px 0; }
.mobileMenuBtn{
  display:inline-flex;
  align-items:center;
  gap:10px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.16);
  border-radius: 16px;
  padding: 10px 12px;
  font-weight: 1100;
  color: var(--text);
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(0,0,0,.08);
}
.mobileMenuIcon{
  width: 34px; height: 34px;
  display:grid; place-items:center;
  border-radius: 14px;
  background: rgba(124,58,237,.14);
  border: 1px solid rgba(124,58,237,.20);
  font-weight: 1200;
}
.mobileMenuText{ font-size: 14px; }

.content{ padding: 16px; }

.pageTop{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.h1{ font-size: 40px; font-weight: 1100; letter-spacing: -.5px; margin-top: 2px; }
.muted{ font-size: 12px; opacity: .78; font-weight: 950; letter-spacing: .2px; color: var(--muted); }
.sub{ opacity: .84; font-weight: 900; margin-top: 6px; color: var(--muted); }

.statusPill{
  align-self:flex-start;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.16);
  font-weight: 950;
  font-size: 12px;
  color: var(--text);
}

.notice{
  border: 1px solid var(--border);
  background: rgba(255,255,255,.16);
  border-radius: 16px;
  padding: 10px 12px;
  font-weight: 950;
  margin: 12px 0;
  box-shadow: 0 14px 30px rgba(0,0,0,.08);
}

.grid2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items:start;
  margin-bottom: 14px;
}

.card{
  background: rgba(255,255,255,.16);
  border-radius: 20px;
  border: 1px solid var(--border);
  box-shadow: 0 22px 60px rgba(0,0,0,.10);
  padding: 16px;
}
.cardTop{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
.h2{ font-size: 26px; font-weight: 1100; margin-top: 2px; letter-spacing: -.4px; }

.btnRow{ display:flex; gap: 10px; flex-wrap:wrap; align-items:center; }

.btn{
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.18);
  font-weight: 1000;
  cursor: pointer;
  color: var(--text);
}
.btn:disabled{ opacity: .55; cursor:not-allowed; }
.btn:hover{ filter: brightness(1.06); }

.btnDark{
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(17,24,39,.72);
  color: #fff;
  font-weight: 1100;
  cursor: pointer;
}
.btnDark:disabled{ opacity: .55; cursor:not-allowed; }

.btnDanger{
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.10);
  color: #ef4444;
  font-weight: 1100;
  cursor: pointer;
}
.btnDanger:disabled{ opacity: .55; cursor:not-allowed; }

.fileBtn{
  position: relative;
  overflow:hidden;
  display:inline-flex;
  align-items:center;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(124,58,237,.30);
  background: rgba(124,58,237,.10);
  font-weight: 1100;
  cursor: pointer;
  color: var(--text);
}
.fileBtn input{ position:absolute; inset:0; opacity:0; cursor:pointer; }
.fileBtn[aria-disabled="true"]{ opacity:.55; cursor:not-allowed; }
.fileBtn[aria-disabled="true"] input{ cursor:not-allowed; }

.hint{ margin-top: 10px; font-size: 12px; opacity: .85; font-weight: 900; color: var(--muted); }

.toggleRow{ display:grid; gap: 10px; }

.toggle{
  width:100%;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255,255,255,.18);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  cursor: pointer;
  text-align:left;
  color: var(--text);
}
.toggle:hover{ background: rgba(124,58,237,.10); }
.toggle:disabled{ opacity:.55; cursor:not-allowed; }

.toggleLabel{ font-weight: 1100; }
.toggleDesc{ font-size: 12px; opacity:.85; font-weight: 900; margin-top: 4px; color: var(--muted); }

.switch{
  width: 54px; height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(124,58,237,.22);
  background: rgba(148,163,184,.22);
  padding: 3px;
  flex: 0 0 auto;
  display:flex; align-items:center;
  transition: background 160ms ease, border-color 160ms ease;
}
.switchOn{
  background: rgba(34,197,94,.24);
  border-color: rgba(34,197,94,.28);
}
.knob{
  width: 26px; height: 26px;
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  box-shadow: 0 10px 18px rgba(0,0,0,.12);
  transform: translateX(0);
  transition: transform 160ms ease;
}
.switchOn .knob{ transform: translateX(22px); }

.authGrid{
  display:grid;
  gap: 10px;
  max-width: 560px;
}

.field{ display:grid; gap: 6px; }
.fieldLabel{ font-size: 12px; opacity:.85; font-weight: 1000; color: var(--muted); }

.input{
  width: 100%;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.18);
  color: var(--text);
  font-weight: 950;
  outline:none;
}
.input:focus{ box-shadow: 0 0 0 4px rgba(124,58,237,.18); }

.pwWrap{ display:flex; align-items:center; gap: 8px; }
.pwInput{ flex:1; }

.eyeBtn{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.18);
  color: var(--text);
  cursor:pointer;
  font-size: 18px;
}
.eyeBtn:hover{ filter: brightness(1.06); }

.meRow{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; flex-wrap:wrap; }
.meChip{
  display:flex; gap: 10px; align-items:center;
  padding: 12px 12px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.10);
}
.meDot{
  width: 12px; height: 12px; border-radius: 999px;
  background: rgba(34,197,94,.9);
  box-shadow: 0 10px 22px rgba(34,197,94,.22);
}
.meTop{ font-weight: 1100; color: var(--text); }
.meSub{ font-size: 12px; opacity:.85; font-weight: 900; margin-top: 2px; color: var(--muted); }

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
  .pageTop{ flex-direction:column; }
  .statusPill{ width: fit-content; }
  .grid2{ grid-template-columns: 1fr; }
}
`;
