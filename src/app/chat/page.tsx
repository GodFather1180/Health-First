"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: number;
};

const LS_KEY = "healthfirst_chat_history_v2";
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

function fmtTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatPage() {
  const path = usePathname();

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [badDay, setBadDay] = useState(false);

  // mobile sidebar open/close
  const [navOpen, setNavOpen] = useState(false);

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! How are you feeling today?", ts: Date.now() },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !busy,
    [input, busy]
  );

  // close sidebar on route change (mobile UX)
  useEffect(() => {
    setNavOpen(false);
  }, [path]);

  // load bad day
  useEffect(() => {
    setBadDay(localStorage.getItem(BAD_DAY_KEY) === "1");
  }, []);

  // persist bad day
  useEffect(() => {
    localStorage.setItem(BAD_DAY_KEY, badDay ? "1" : "0");
    window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
  }, [badDay]);

  // load chat
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setMsgs(parsed);
      }
    } catch {}
  }, []);

  // persist + scroll
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(msgs));
    } catch {}
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // focus input on mount + when done sending
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);

    const next: Msg[] = [...msgs, { role: "user", content: text, ts: Date.now() }];
    setMsgs(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: next.slice(-14).map(({ role, content }) => ({ role, content })),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Request failed");

      setMsgs((prev) => [
        ...prev,
        { role: "assistant", content: json.reply || "…", ts: Date.now() },
      ]);
    } catch (e: any) {
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `error: ${e?.message ?? "something broke"}`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    localStorage.removeItem(LS_KEY);
    setMsgs([{ role: "assistant", content: "Fresh start. How are you doing?", ts: Date.now() }]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="shell">
      {/* overlay for mobile */}
      <button
        className={`overlay ${navOpen ? "overlayOn" : ""}`}
        aria-label="Close sidebar"
        onClick={() => setNavOpen(false)}
      />

      <aside className={`sidebar ${navOpen ? "sidebarOpen" : ""}`}>
        {/* click brand to toggle sidebar (mobile) */}
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
              <Link key={n.href} href={n.href} className={`navItem ${active ? "active" : ""}`}>
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
            Bad Day Mode
            <span className="ctaRight">Turn on</span>
          </button>
        )}

        <div className="sideHint">{badDay ? "Go gentle today" : "One step at a time"}</div>
      </aside>

      <main className="main">
        <div className="content">
          <section className="oneCol">
            <div className="card">
              {/* Header */}
              <div className="cardTop">
                <div>
                  <div className="muted">send texts</div>
                  <div className="h2">Wellness Chat</div>
                  <div className="sub">{busy ? "thinking…" : "ready"} • local history saved</div>
                </div>

                <div className="headerBtns">
                  <button className="softBtn" onClick={clearChat} disabled={busy} title="Clear chat">
                    Clear
                  </button>

                  <button
                    className="softBtn"
                    onClick={() => {
                      const note =
                        "Hey — just a reminder: you matter, and it’s okay to take things one step at a time.";
                      setMsgs((prev) => [...prev, { role: "assistant", content: note, ts: Date.now() }]);
                    }}
                    disabled={busy}
                    title="Drop an encouraging note"
                  >
                    Send a reminder
                  </button>
                </div>
              </div>

              {/* Chat panel */}
              <div className="chatPanel">
                <div className="chatScroll">
                  {msgs.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <div key={i} className={`row ${isUser ? "rowUser" : "rowBot"}`}>
                        <div className={`bubble ${isUser ? "bubbleUser" : "bubbleBot"}`}>
                          <div className="bubbleText">{m.content}</div>
                          <div className={`time ${isUser ? "timeRight" : "timeLeft"}`}>
                            {fmtTime(m.ts)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                <div className="composer">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                    placeholder="type…"
                    disabled={busy}
                    className="input"
                  />

                  <button
                    onClick={send}
                    disabled={!canSend}
                    className={`sendBtn ${canSend ? "sendOn" : "sendOff"}`}
                  >
                    {busy ? "…" : "Send"}
                  </button>
                </div>
              </div>

              <div className="tinyFooter">Tip: press Enter to send • “Clear” wipes local chat history</div>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
/* ✅ do NOT hard-force light background; respect global theme vars */
:global(html, body){
  background: var(--bg0);
  color: var(--text);
}

.shell{
  --violet-500:#7c3aed;
  --violet-400:#a78bfa;

  min-height: 100vh;
  display:grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 16px;

  background:
    radial-gradient(1200px 700px at 18% 0%, rgba(124,58,237,.18), transparent 58%),
    radial-gradient(900px 650px at 90% 10%, rgba(167,139,250,.14), transparent 60%),
    radial-gradient(900px 650px at 60% 90%, rgba(91,33,182,.10), transparent 62%),
    linear-gradient(180deg, var(--bg0), var(--bg1));

  color: var(--text);
  position: relative;
}

.overlay{ display:none; border:0; padding:0; background: transparent; }
/* ✅ no display override here; mobile MQ controls visibility */
.overlayOn{ }

.sidebar{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: 22px;
  padding: 12px 16px 16px;
  backdrop-filter: blur(12px);
  display:flex;
  flex-direction:column;
  gap: 14px;
  box-shadow: 0 28px 60px rgba(0, 0, 0, .12);
}

.brandBtn{
  border:0;
  background: transparent;
  padding: 10px 4px 6px;
  border-radius: 16px;
  display:flex;
  align-items:center;
  gap: 10px;
  cursor: pointer;
  text-align:left;
  color: var(--text);
}
.brandBtn:hover{ background: rgba(124,58,237,.06); }

.logoDot{
  width: 14px; height: 14px; border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #fff, var(--violet-400), var(--violet-500));
  box-shadow: 0 12px 28px rgba(124,58,237,.22);
  flex: 0 0 auto;
}

.brandText{ flex: 1 1 auto; min-width: 0; }
.brandTop{ font-weight: 950; }
.brandSub{ font-size: 12px; opacity: .72; margin-top: 1px; }

.brandChevron{
  display:none;
  width: 34px; height: 34px;
  border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(124,58,237,.10);
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 1000;
}

.nav{ display:flex; flex-direction:column; gap: 6px; padding: 4px; }

.navItem{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 12px; border-radius: 14px;
  color: var(--text); opacity:.92;
  border: 1px solid transparent;
}
.navItem:hover{ opacity: 1; border-color: var(--border); background: rgba(124,58,237,.06); }
.navItem.active{
  opacity: 1;
  background: linear-gradient(90deg, rgba(124,58,237,.18), rgba(255,255,255,.0));
  border-color: var(--border);
}

.navIcon{
  width: 26px; height: 26px; display:grid; place-items:center;
  border-radius: 12px;
  background: rgba(124,58,237,.10);
  border: 1px solid var(--border);
  font-size: 12px; color: var(--text);
}

.cta{
  margin-top: 6px;
  border: 1px solid var(--border);
  background: linear-gradient(90deg, rgba(124,58,237,.18), rgba(167,139,250,.16));
  color: var(--text);
  padding: 12px 14px; border-radius: 16px;
  font-weight: 950; cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap: 10px;
  box-shadow: 0 18px 40px rgba(124,58,237,.12);
}
.ctaRight{
  font-weight: 950; opacity: .9;
  padding: 6px 10px; border-radius: 999px;
  background: rgba(255,255,255,.10);
  border: 1px solid var(--border);
}

.sideHint{
  margin-top:auto;
  opacity:.78; font-size: 12px;
  padding: 10px 12px; border-radius: 14px;
  border: 1px dashed var(--border);
  background: rgba(255,255,255,.06);
  color: var(--text);
}

.main{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--card2), rgba(0,0,0,0));
  border-radius: 22px;
  backdrop-filter: blur(14px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  box-shadow: 0 28px 70px rgba(0, 0, 0, .16);
}

.content{ padding: 16px; }

.oneCol{ display:flex; justify-content:center; }

.card{
  width: min(980px, 100%);
  background: var(--card);
  color: var(--text);
  border-radius: 18px;
  border: 1px solid var(--border);
  box-shadow: 0 22px 50px rgba(0,0,0,.14);
  padding: 14px;
  overflow: hidden;
}

.cardTop{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.muted{ font-size: 12px; opacity: .66; font-weight: 900; color: var(--text); }
.h2{ font-size: 26px; font-weight: 1000; margin-top: 2px; letter-spacing: -.2px; }
.sub{ font-size: 12px; opacity: .7; font-weight: 900; margin-top: 6px; }

.headerBtns{ display:flex; gap: 10px; flex-wrap:wrap; justify-content:flex-end; }

.softBtn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(124,58,237,.10);
  color: var(--text);
  font-weight: 950;
  cursor: pointer;
}
.softBtn:disabled{ opacity: .6; cursor: not-allowed; }

.chatPanel{
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card2);
  overflow:hidden;
}

.chatScroll{
  padding: 14px;
  height: 62vh;
  overflow-y: auto;
}

.row{ display:flex; margin: 10px 0; }
.rowUser{ justify-content:flex-end; }
.rowBot{ justify-content:flex-start; }

.bubble{ max-width: 78%; }
.bubbleUser .bubbleText{
  background: rgba(124,58,237,.18);
  border: 1px solid var(--border);
}
.bubbleBot .bubbleText{
  background: var(--card);
  border: 1px solid var(--border);
}

.bubbleText{
  padding: 10px 12px;
  border-radius: 16px;
  color: var(--text);
  white-space: pre-wrap;
  line-height: 1.35;
  font-size: 15px;
  font-weight: 900;
}

.time{
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.6;
  color: var(--text);
}
.timeRight{ text-align:right; }
.timeLeft{ text-align:left; }

.composer{
  padding: 12px;
  border-top: 1px solid var(--border);
  background: var(--card2);
  display:flex;
  gap: 10px;
}

.input{
  flex: 1;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  outline: none;
  font-size: 15px;
  font-weight: 900;
}
.input:focus{
  box-shadow: 0 0 0 6px rgba(124,58,237,.14);
  border-color: rgba(124,58,237,.40);
}

.sendBtn{
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid rgba(17,24,39,.92);
  background: #111827;
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 950;
  min-width: 84px;
}
.sendOff{
  opacity: .55;
  border-color: var(--border);
  background: rgba(124,58,237,.10);
  color: var(--text);
  cursor: not-allowed;
}

.tinyFooter{
  opacity: 0.75;
  font-size: 12px;
  margin-top: 10px;
  font-weight: 900;
  color: var(--text);
}

/* MOBILE: sidebar becomes a slide-over drawer */
@media (max-width: 980px){
  .shell{ grid-template-columns: 1fr; padding: 12px; gap: 12px; }

  .overlay{
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(10, 6, 20, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms ease;
    z-index: 40;
  }
  .overlayOn{ opacity: 1; pointer-events: auto; }

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

  .headerBtns{ justify-content:flex-start; }
  .chatScroll{ height: 60vh; }
}
`;
