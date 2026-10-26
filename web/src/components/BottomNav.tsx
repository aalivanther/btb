"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX } from "react";

import { ui } from "@/lib/i18n";
import { useViewport } from "@/lib/viewport-context";
import { useFilter } from "@/lib/timeline-context";

function focusSearch(): void {
  const input = document.querySelector<HTMLInputElement>(".tlx-search-input");
  if (input !== null) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    input.focus();
  }
}

export function BottomNav(): JSX.Element | null {
  const { isMobile, ready } = useViewport();
  const { goToToday } = useFilter();
  const pathname = usePathname();

  if (!ready || !isMobile) {
    return null;
  }

  const onHome = pathname === "/";
  const onProfile = pathname === "/perfil";

  return (
    <nav className="bn-root" aria-label={ui.bottomNav.label}>
      <Link href="/" prefetch={false} className={`bn-item${onHome ? " is-active" : ""}`} aria-current={onHome ? "page" : undefined}>
        <svg className="bn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 9h17M8 3.5v3M16 3.5v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="bn-label font-label">{ui.bottomNav.home}</span>
      </Link>

      <button type="button" className="bn-item" onClick={goToToday}>
        <svg className="bn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="bn-label font-label">{ui.bottomNav.today}</span>
      </button>

      <button type="button" className="bn-item" onClick={focusSearch}>
        <svg className="bn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="bn-label font-label">{ui.bottomNav.search}</span>
      </button>

      <Link
        href="/perfil"
        prefetch={false}
        className={`bn-item${onProfile ? " is-active" : ""}`}
        aria-current={onProfile ? "page" : undefined}
      >
        <svg className="bn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8.4" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 19.2c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="bn-label font-label">{ui.bottomNav.profile}</span>
      </Link>
    </nav>
  );
}
