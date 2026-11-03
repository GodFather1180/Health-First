"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/goals/daily", label: "Daily" },
  { href: "/goals/weekly", label: "Weekly" },
  { href: "/goals/monthly", label: "Monthly" },
  { href: "/goals/yearly", label: "Yearly" },
  { href: "/progress", label: "Progress" },
  { href: "/mood", label: "Mood" },
  { href: "/win", label: "Win" },
  { href: "/self-care", label: "Self-Care" },
  { href: "/affirmations", label: "Affirmations" },
  { href: "/letters", label: "Letters" },
  { href: "/settings", label: "Settings" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

export function Nav() {
  const path = usePathname();

  return (
    <header className="navWrap">
      <div className="navInner">
        <div className="brandPill">Health First</div>

        <nav className="scroller" aria-label="Primary">
          {links.map((l) => {
            const active = isActive(path, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`pill ${active ? "pillActive" : "pillIdle"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <style jsx>{`
        .navWrap {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 10px 12px;
          background: linear-gradient(
            180deg,
            rgba(11, 6, 20, 0.85),
            rgba(11, 6, 20, 0.55)
          );
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .navInner {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brandPill {
          flex: 0 0 auto;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 950;
          letter-spacing: 0.2px;
          color: #f5f0ff;
          border: 1px solid rgba(167, 139, 250, 0.28);
          background: linear-gradient(
            90deg,
            rgba(124, 58, 237, 0.35),
            rgba(124, 58, 237, 0.14)
          );
          box-shadow: 0 14px 30px rgba(124, 58, 237, 0.18);
        }

        .scroller {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 2px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex: 1 1 auto;
        }

        .scroller::-webkit-scrollbar {
          display: none;
        }

        .pill {
          flex: 0 0 auto;
          scroll-snap-align: start;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: transform 120ms ease, filter 120ms ease,
            background 120ms ease, border-color 120ms ease;
        }

        .pillIdle {
          color: rgba(255, 255, 255, 0.86);
          background: rgba(255, 255, 255, 0.06);
        }

        .pillIdle:hover {
          filter: brightness(1.08);
          border-color: rgba(255, 255, 255, 0.18);
          transform: translateY(-1px);
        }

        .pillActive {
          color: #120724;
          border-color: rgba(167, 139, 250, 0.55);
          background: linear-gradient(90deg, #a78bfa, #7c3aed);
          box-shadow: 0 14px 30px rgba(124, 58, 237, 0.25);
        }

        .pillActive:hover {
          filter: brightness(1.02);
        }
      `}</style>
    </header>
  );
}
