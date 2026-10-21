"use client";

import { useRef, type JSX } from "react";
import Link from "next/link";

import { useProfile } from "@/lib/profile-context";
import { useAuth } from "@/lib/auth-context";
import { ComicButton } from "@/components/comic/kit";
import { LANE_META, LANE_ORDER } from "@/lib/timeline";
import { ui } from "@/lib/i18n";
import { useModalA11y } from "@/lib/use-modal-a11y";

type ProfilePanelProps = {
  genres: string[];
  open: boolean;
  onClose: () => void;
};

export function ProfilePanel({ genres, open, onClose }: ProfilePanelProps): JSX.Element | null {
  if (!open) {
    return null;
  }
  return <ProfilePanelDialog genres={genres} onClose={onClose} />;
}

type ProfilePanelDialogProps = {
  genres: string[];
  onClose: () => void;
};

function ProfilePanelDialog({ genres, onClose }: ProfilePanelDialogProps): JSX.Element {
  const { profile, toggleGenre, togglePlatform, removeWishlist, clearWishlist } = useProfile();
  const { user, logout } = useAuth();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose, { lockScroll: false });

  const sortedWishlist = [...profile.wishlist].sort((left, right) =>
    (left.releaseDate || "9999-99-99").localeCompare(right.releaseDate || "9999-99-99"),
  );

  return (
    <div
      className="pf-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={ui.actions.profile}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="pf-panel c-panel c-panel-violet c-panel-ht"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <div className="pf-head">
          <h2 className="pf-title font-display">{ui.perfil.panelTitle}</h2>
          <Link href="/perfil" className="pf-fulllink font-label" onClick={onClose}>
            {ui.perfil.openFullProfile}
            <span aria-hidden="true"> →</span>
          </Link>
          <ComicButton variant="danger" ariaLabel={ui.perfil.close} onClick={onClose} className="pf-close">
            ✕
          </ComicButton>
        </div>

        <div className="pf-body">
          {user !== null ? (
            <div className="pf-account">
              <span className="pf-account-hi font-ui">
                {ui.perfil.helloPrefix} <b>{user.name}</b>
              </span>
              <ComicButton variant="ghost" onClick={logout} className="pf-logout">
                {ui.perfil.logout}
              </ComicButton>
            </div>
          ) : null}

          <section className="pf-sect">
            <h3 className="pf-sect-title font-label">{ui.perfil.prefsPlatforms}</h3>
            <p className="pf-hint">{ui.perfil.platformsHint}</p>
            <div className="pf-chips">
              {LANE_ORDER.map((laneKey) => {
                const on = profile.platforms.includes(laneKey);
                return (
                  <button
                    key={laneKey}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlatform(laneKey)}
                    className={`pf-chip ct-lane-${laneKey}${on ? " is-on" : ""}`}
                  >
                    <span className="pf-chip-dot" aria-hidden="true" />
                    {LANE_META[laneKey].label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pf-sect">
            <h3 className="pf-sect-title font-label">{ui.perfil.prefsGenres}</h3>
            <div className="pf-chips">
              {genres.length === 0 ? (
                <p className="pf-hint">{ui.perfil.prefsNoGenres}</p>
              ) : (
                genres.map((genre) => {
                  const on = profile.genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleGenre(genre)}
                      className={`pf-chip pf-chip-genre${on ? " is-on" : ""}`}
                    >
                      {genre}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="pf-sect">
            <h3 className="pf-sect-title font-label">
              {ui.perfil.wishlistSection}
              {profile.wishlist.length > 0 ? (
                <span className="pf-count">{profile.wishlist.length}</span>
              ) : null}
              {profile.wishlist.length > 0 ? (
                <button type="button" className="pf-clear font-label" onClick={clearWishlist}>
                  {ui.perfil.wishlistClear}
                </button>
              ) : null}
            </h3>
            {profile.wishlist.length === 0 ? (
              <p className="pf-hint">{ui.perfil.panelWishlistEmpty}</p>
            ) : (
              <ul className="pf-wishlist">
                {sortedWishlist.map((item) => (
                  <li key={item.id} className={`pf-wish ${item.platform ? `ct-lane-${item.platform}` : ""}`}>
                    <span className="pf-wish-bar" aria-hidden="true" />
                    <span className="pf-wish-info">
                      <span className="pf-wish-title">{item.title}</span>
                      {item.releaseDate ? (
                        <span className="pf-wish-date font-mono">{item.releaseDate}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="pf-wish-x"
                      aria-label={ui.perfil.removeAria(item.title)}
                      onClick={() => removeWishlist(item.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
