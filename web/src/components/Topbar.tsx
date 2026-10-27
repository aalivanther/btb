"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";

import { ui } from "@/lib/i18n";
import { useFilter } from "@/lib/timeline-context";
import { useProfile } from "@/lib/profile-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useViewport } from "@/lib/viewport-context";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { ProfilePanel } from "@/components/ProfilePanel";
import { AuthPanel } from "@/components/AuthPanel";
import { WishlistAlerts } from "@/components/WishlistAlerts";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { FILTER_LANES, type FilterLane, type TodayMarker } from "@/lib/timeline";

const LANE_OPTION_LABEL: Record<FilterLane, string> = {
  playstation: ui.filters.playstation,
  xbox: ui.filters.xbox,
  nintendo: ui.filters.nintendo,
  pc: ui.filters.pc,
};

type MultiOption = { value: string; label: string };

function MultiSelect({
  cap,
  allLabel,
  countLabel,
  options,
  selected,
  onChange,
}: {
  cap: string;
  allLabel: string;
  countLabel: (count: number) => string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange(
        options
          .map((option) => option.value)
          .filter((item) => item === value || selected.includes(item)),
      );
    }
  };

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((option) => option.value === selected[0])?.label ?? selected[0])
        : countLabel(selected.length);

  return (
    <div className="tlx-multi" ref={rootRef}>
      <button
        type="button"
        className="tlx-multi-btn font-mono"
        aria-expanded={open}
        aria-label={cap}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="tlx-multi-cap">{cap}</span>
        <span className="tlx-multi-val">{summary}</span>
        <span className="tlx-multi-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="tlx-multi-panel" role="group" aria-label={cap}>
          {options.map((option) => {
            const isOn = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isOn}
                className={`tlx-multi-opt font-mono${isOn ? " is-on" : ""}`}
                onClick={() => toggle(option.value)}
              >
                <span className="tlx-multi-check" aria-hidden="true">
                  {isOn ? "✓" : ""}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type TopbarProps = {
  genres: string[];
  today: TodayMarker;
};

export function Topbar({ genres, today }: TopbarProps) {
  const { profile } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isMobile, ready } = useViewport();

  const openProfile = () => setProfileOpen(true);
  const openAuth = () => setAuthOpen(true);

  const showMobile = ready && isMobile;

  return (
    <>
      {showMobile ? (
        <MobileBar
          genres={genres}
          today={today}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          onCloseDrawer={() => setDrawerOpen(false)}
          user={user}
          wishlistCount={profile.wishlist.length}
          onOpenProfile={openProfile}
          onOpenAuth={openAuth}
        />
      ) : (
        <DesktopBar
          genres={genres}
          today={today}
          user={user}
          wishlistCount={profile.wishlist.length}
          onOpenProfile={openProfile}
          onOpenAuth={openAuth}
        />
      )}

      <ProfilePanel genres={genres} open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AuthPanel open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

type SharedBarProps = {
  genres: string[];
  today: TodayMarker;
  user: ReturnType<typeof useAuth>["user"];
  wishlistCount: number;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
};

function DesktopBar({ genres, today, user, wishlistCount, onOpenProfile, onOpenAuth }: SharedBarProps) {
  const { filter, setFilter, goToToday } = useFilter();
  const { theme, toggle } = useTheme();

  return (
    <header className="tlx-topbar font-ui">
      <Link href="/" prefetch={false} className="tlx-brand" aria-label={`${ui.brand.full} — ${ui.brand.tagline}`}>
        <span className="tlx-brand-name font-display">
          {ui.brand.prefix}
          <span className="text-gold"> {ui.brand.highlight}</span>
        </span>
        <span className="tlx-brand-tag font-display">{ui.brand.tagline}</span>
      </Link>

      <div aria-label={ui.filters.groupLabel} role="group" className="tlx-filters">
        <MultiSelect
          cap={ui.filters.platformLabel}
          allLabel={ui.filters.platformAll}
          countLabel={ui.filters.platformCount}
          options={FILTER_LANES.map((value) => ({ value, label: LANE_OPTION_LABEL[value] }))}
          selected={filter.lanes}
          onChange={(next) => setFilter({ lanes: next as FilterLane[] })}
        />

        <MultiSelect
          cap={ui.filters.genreLabel}
          allLabel={ui.filters.genreAll}
          countLabel={ui.filters.genreCount}
          options={genres.map((genre) => ({ value: genre, label: genre }))}
          selected={filter.genres}
          onChange={(next) => setFilter({ genres: next })}
        />
      </div>

      <div className="tlx-search">
        <svg className="tlx-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={filter.query}
          onChange={(event) => setFilter({ query: event.target.value })}
          placeholder={ui.topbar.searchPlaceholder}
          aria-label={ui.topbar.searchAria}
          className="tlx-search-input font-ui"
        />
      </div>

      <div className="tlx-actions">
        <button type="button" onClick={goToToday} className="tlx-hoy font-mono">
          {ui.actions.goToToday}
        </button>

        <WishlistAlerts today={today} />

        <button
          type="button"
          className="tlx-theme"
          aria-label={theme === "vivo" ? ui.topbar.themeToNoirAria : ui.topbar.themeToVivoAria}
          title={theme === "vivo" ? ui.topbar.themeNoirTitle : ui.topbar.themeVivoTitle}
          onClick={toggle}
        >
          <span aria-hidden="true">{theme === "vivo" ? "◑" : "◐"}</span>
        </button>

        {user === null ? (
          <button type="button" className="tlx-enter font-label" onClick={onOpenAuth}>
            {ui.topbar.login}
          </button>
        ) : null}

        <button
          type="button"
          className="tlx-profile"
          aria-label={user !== null ? ui.topbar.profileOfAria(user.name) : ui.actions.profile}
          onClick={onOpenProfile}
        >
          <svg className="tlx-profile-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8.4" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M5.5 19.2c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {user !== null ? (
            <span className="tlx-profile-name font-label">{user.name.split(" ")[0]}</span>
          ) : null}
          {wishlistCount > 0 ? (
            <span className="tlx-profile-count font-display" aria-hidden="true">
              {wishlistCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

type MobileBarProps = SharedBarProps & {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
};

function MobileBar({
  genres,
  today,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  user,
  wishlistCount,
  onOpenProfile,
  onOpenAuth,
}: MobileBarProps) {
  const { filter, setFilter } = useFilter();

  return (
    <header className="tlx-topbar tlx-topbar-mobile font-ui">
      <Link href="/" prefetch={false} className="tlx-brand tlx-brand-compact" aria-label={ui.brand.full}>
        <span className="tlx-brand-name font-display">{ui.brand.full}</span>
      </Link>

      <div className="tlx-search tlx-search-mobile">
        <svg className="tlx-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={filter.query}
          onChange={(event) => setFilter({ query: event.target.value })}
          placeholder={ui.topbar.searchPlaceholderMobile}
          aria-label={ui.topbar.searchAria}
          className="tlx-search-input font-ui"
        />
      </div>

      <WishlistAlerts today={today} />
      <button
        type="button"
        className="tlx-menu"
        aria-label={ui.topbar.menuOpen}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={onOpenDrawer}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <MobileDrawer
        genres={genres}
        open={drawerOpen}
        onClose={onCloseDrawer}
        user={user}
        wishlistCount={wishlistCount}
        onOpenProfile={onOpenProfile}
        onOpenAuth={onOpenAuth}
      />
    </header>
  );
}

type MobileDrawerProps = {
  genres: string[];
  open: boolean;
  onClose: () => void;
  user: ReturnType<typeof useAuth>["user"];
  wishlistCount: number;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
};

function MobileDrawer({ open, ...dialogProps }: MobileDrawerProps): JSX.Element | null {
  if (!open) {
    return null;
  }
  return <MobileDrawerDialog {...dialogProps} />;
}

type MobileDrawerDialogProps = Omit<MobileDrawerProps, "open">;

function MobileDrawerDialog({
  genres,
  onClose,
  user,
  wishlistCount,
  onOpenProfile,
  onOpenAuth,
}: MobileDrawerDialogProps): JSX.Element {
  const { filter, setFilter, goToToday } = useFilter();
  const { theme, toggle } = useTheme();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose, { lockScroll: true });

  return (
    <div className="tlx-drawer-scrim" onClick={onClose}>
      <div
        ref={cardRef}
        className="tlx-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={ui.topbar.menuTitle}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <div className="tlx-drawer-head">
          <span className="tlx-drawer-title font-display">{ui.topbar.menuTitle}</span>
          <button type="button" className="tlx-drawer-close" aria-label={ui.topbar.menuClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tlx-drawer-body">
          <section className="tlx-drawer-sect">
            <h3 className="tlx-drawer-sect-title font-label">{ui.topbar.drawerFilters}</h3>
            <div className="tlx-drawer-filters">
              <MultiSelect
                cap={ui.filters.platformLabel}
                allLabel={ui.filters.platformAll}
                countLabel={ui.filters.platformCount}
                options={FILTER_LANES.map((value) => ({ value, label: LANE_OPTION_LABEL[value] }))}
                selected={filter.lanes}
                onChange={(next) => setFilter({ lanes: next as FilterLane[] })}
              />
              <MultiSelect
                cap={ui.filters.genreLabel}
                allLabel={ui.filters.genreAll}
                countLabel={ui.filters.genreCount}
                options={genres.map((genre) => ({ value: genre, label: genre }))}
                selected={filter.genres}
                onChange={(next) => setFilter({ genres: next })}
              />
            </div>
            <button
              type="button"
              className="tlx-drawer-action font-label"
              onClick={() => {
                goToToday();
                onClose();
              }}
            >
              {ui.actions.goToToday}
            </button>
          </section>

          <section className="tlx-drawer-sect">
            <h3 className="tlx-drawer-sect-title font-label">{ui.topbar.drawerAccount}</h3>
            <button
              type="button"
              className="tlx-drawer-action font-label"
              onClick={() => {
                onOpenProfile();
                onClose();
              }}
            >
              {ui.actions.profile}
              {wishlistCount > 0 ? <span className="tlx-drawer-badge">{wishlistCount}</span> : null}
            </button>
            <Link
              href="/perfil"
              prefetch={false}
              className="tlx-drawer-action font-label"
              onClick={onClose}
            >
              {ui.perfil.openFullProfile}
            </Link>
            <Link href="/configuracion" className="tlx-drawer-action font-label" onClick={onClose}>
              {ui.config.drawerLink}
            </Link>
            {user === null ? (
              <button
                type="button"
                className="tlx-drawer-action font-label"
                onClick={() => {
                  onOpenAuth();
                  onClose();
                }}
              >
                {ui.topbar.login}
              </button>
            ) : (
              <p className="tlx-drawer-user font-ui">
                {ui.topbar.sessionPrefix} <b>{user.name}</b>
              </p>
            )}
          </section>

          <section className="tlx-drawer-sect">
            <h3 className="tlx-drawer-sect-title font-label">{ui.topbar.drawerAppearance}</h3>
            <button type="button" className="tlx-drawer-action font-label" onClick={toggle}>
              {theme === "vivo" ? ui.topbar.themeNoirAction : ui.topbar.themeVivoAction}
            </button>
            <div className="tlx-drawer-viewmode">
              <span className="tlx-drawer-label font-label">{ui.topbar.viewModeLabel}</span>
              <ViewModeToggle />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
