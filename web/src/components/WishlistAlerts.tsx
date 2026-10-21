"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { useQuery } from "@connectrpc/connect-query";

import { ui } from "@/lib/i18n";
import { useProfile } from "@/lib/profile-context";
import { LANE_META, type LaneKey, type TodayMarker } from "@/lib/timeline";
import {
  alertKey,
  buildWishAlerts,
  type AlertStage,
  type WishAlert,
} from "@/lib/wishlist-alerts";
import { DealsService } from "@/gen/btb/games/v1/deals_pb";
import type { Deal } from "@/gen/btb/games/v1/deals_pb";
import { titlesMatch } from "@/lib/deal-match";

const DEALS_STALE_MS = 10 * 60 * 1000;

type OfferAlert = {
  deal: Deal;
  gameId: string;
  platform: LaneKey | "";
};

function offerKey(deal: Deal): string {
  return `offer:${deal.dealId}@${deal.salePrice}`;
}

const SEEN_STORAGE_KEY = "btb:alerts-seen:v1";

const STAGE_LABELS: Record<AlertStage, string> = {
  today: ui.alerts.groupToday,
  soon: ui.alerts.groupSoon,
  out: ui.alerts.groupOut,
};

const STAGE_ORDER: AlertStage[] = ["today", "soon", "out"];

function loadSeenKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (raw === null) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveSeenKeys(keys: Set<string>): void {
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(keys)));
  } catch {}
}

function alertText(alert: WishAlert): string {
  if (alert.stage === "today") {
    return ui.alerts.itemToday;
  }
  if (alert.stage === "soon") {
    return ui.alerts.itemSoon(alert.daysUntil);
  }
  return ui.alerts.itemOut(Math.abs(alert.daysUntil));
}

type WishlistAlertsProps = {
  today: TodayMarker;
};

export function WishlistAlerts({ today }: WishlistAlertsProps): JSX.Element | null {
  const { profile, ready } = useProfile();
  const [open, setOpen] = useState(false);
  const [seenKeys, setSeenKeys] = useState<Set<string> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeenKeys(loadSeenKeys());
  }, []);

  const alerts = useMemo<WishAlert[]>(
    () => buildWishAlerts(profile.wishlist, today),
    [profile.wishlist, today],
  );

  const wishTitles = useMemo(
    () => profile.wishlist.map((item) => item.title).filter((title) => title !== ""),
    [profile.wishlist],
  );

  const dealsQuery = useQuery(
    DealsService.method.findGameDeals,
    { titles: wishTitles },
    {
      enabled: wishTitles.length > 0,
      staleTime: DEALS_STALE_MS,
      refetchOnWindowFocus: false,
    },
  );

  const offerAlerts = useMemo<OfferAlert[]>(() => {
    const deals = dealsQuery.data?.deals ?? [];
    if (deals.length === 0) {
      return [];
    }
    return deals.map((deal) => {
      const match = profile.wishlist.find((item) => titlesMatch(deal.title, item.title));
      return { deal, gameId: match?.id ?? "", platform: match?.platform ?? "" };
    });
  }, [dealsQuery.data, profile.wishlist]);

  const unseenCount = useMemo<number | null>(() => {
    if (seenKeys === null) {
      return null;
    }
    const releaseNew = alerts.filter((alert) => !seenKeys.has(alertKey(alert))).length;
    const offerNew = offerAlerts.filter((offer) => !seenKeys.has(offerKey(offer.deal))).length;
    return releaseNew + offerNew;
  }, [alerts, offerAlerts, seenKeys]);

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

  const toggleOpen = useCallback(() => {
    const next = !open;
    if (next && seenKeys !== null) {
      const merged = new Set(seenKeys);
      for (const alert of alerts) {
        merged.add(alertKey(alert));
      }
      for (const offer of offerAlerts) {
        merged.add(offerKey(offer.deal));
      }
      setSeenKeys(merged);
      saveSeenKeys(merged);
    }
    setOpen(next);
  }, [open, alerts, offerAlerts, seenKeys]);

  if (!ready) {
    return null;
  }

  const groups = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    items: alerts.filter((alert) => alert.stage === stage),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="tlx-bell-root" ref={rootRef}>
      <button
        type="button"
        className="tlx-bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ui.alerts.bellAria(unseenCount ?? 0)}
        onClick={toggleOpen}
      >
        <svg className="tlx-bell-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.2c-3.1 0-5.4 2.4-5.4 5.5v3.4c0 .8-.3 1.6-.9 2.2l-1 1.1c-.5.6-.1 1.6.7 1.6h13.2c.8 0 1.2-1 .7-1.6l-1-1.1c-.6-.6-.9-1.4-.9-2.2V8.7c0-3.1-2.3-5.5-5.4-5.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 19.6a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {unseenCount !== null && unseenCount > 0 ? (
          <span className="tlx-bell-count font-display" aria-hidden="true">
            {unseenCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="tlx-bell-panel" role="dialog" aria-label={ui.alerts.panelLabel}>
          <p className="al-title font-label">{ui.alerts.panelLabel}</p>
          {groups.length === 0 && offerAlerts.length === 0 ? (
            <p className="al-empty font-comic">{ui.alerts.empty}</p>
          ) : null}

          {offerAlerts.length > 0 ? (
            <div className="al-group al-group-offer">
              <p className="al-group-title font-label">{ui.deals.alertGroup}</p>
              <ul className="al-list">
                {offerAlerts.map((offer) => (
                  <li
                    key={offerKey(offer.deal)}
                    className={`al-item${offer.platform ? ` ct-lane-${offer.platform}` : ""}`}
                  >
                    {offer.gameId !== "" ? (
                      <Link
                        href={`/juego/${offer.gameId}`}
                        className="al-link"
                        onClick={() => setOpen(false)}
                        aria-label={ui.deals.openCardAria(offer.deal.title)}
                      >
                        <span className="al-bar" aria-hidden="true" />
                        <span className="al-info">
                          <span className="al-game">{offer.deal.title}</span>
                          <span className="al-when al-when-offer font-label">
                            {ui.deals.alertText(
                              offer.deal.savingsPercent,
                              offer.deal.storeName,
                              offer.deal.salePrice,
                            )}
                          </span>
                        </span>
                        <span className="al-plat font-label" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    ) : (
                      <a
                        href={offer.deal.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="al-link"
                        onClick={() => setOpen(false)}
                        aria-label={ui.deals.buyAria(
                          offer.deal.title,
                          offer.deal.storeName,
                          offer.deal.salePrice,
                        )}
                      >
                        <span className="al-bar" aria-hidden="true" />
                        <span className="al-info">
                          <span className="al-game">{offer.deal.title}</span>
                          <span className="al-when al-when-offer font-label">
                            {ui.deals.alertText(
                              offer.deal.savingsPercent,
                              offer.deal.storeName,
                              offer.deal.salePrice,
                            )}
                          </span>
                        </span>
                        <span className="al-plat font-label" aria-hidden="true">
                          →
                        </span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups.length === 0 ? null : (
            groups.map((group) => (
              <div key={group.stage} className={`al-group al-group-${group.stage}`}>
                <p className="al-group-title font-label">{group.label}</p>
                <ul className="al-list">
                  {group.items.map((alert) => (
                    <li
                      key={alertKey(alert)}
                      className={`al-item${alert.item.platform ? ` ct-lane-${alert.item.platform}` : ""}`}
                    >
                      <Link
                        href={`/juego/${alert.item.id}`}
                        className="al-link"
                        onClick={() => setOpen(false)}
                        aria-label={ui.alerts.itemAria(alert.item.title, alertText(alert))}
                      >
                        <span className="al-bar" aria-hidden="true" />
                        <span className="al-info">
                          <span className="al-game">{alert.item.title}</span>
                          <span className="al-when font-label">{alertText(alert)}</span>
                        </span>
                        {alert.item.platform ? (
                          <span className="al-plat font-label" aria-hidden="true">
                            {LANE_META[alert.item.platform].label}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
