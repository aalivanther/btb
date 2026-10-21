"use client";

import { useRef, useState, type JSX } from "react";
import Link from "next/link";

import { ui } from "@/lib/i18n";
import { formatMxnApprox } from "@/lib/currency";
import { useModalA11y } from "@/lib/use-modal-a11y";
import type { Deal, StoreInfo } from "@/gen/btb/games/v1/deals_pb";

type DealsShowcaseProps = {
  deals: Deal[];
  stores: StoreInfo[];
  error: string | null;
  gameIdByDealId?: Record<string, string>;
};

export function DealsShowcase({
  deals,
  stores,
  error,
  gameIdByDealId = {},
}: DealsShowcaseProps): JSX.Element {
  const [openDeal, setOpenDeal] = useState<Deal | null>(null);

  const iconByStoreId = new Map<string, string>();
  for (const store of stores) {
    if (store.iconUrl !== "") {
      iconByStoreId.set(store.storeId, store.iconUrl);
    }
  }

  return (
    <section className="ds-section" aria-labelledby="ofertas-heading">
      <div className="ds-inner">
        <div className="ds-head">
          <h2 id="ofertas-heading" className="ds-title font-display">
            {ui.deals.sectionTitle}
          </h2>
          <p className="ds-subtitle font-comic">{ui.deals.sectionSubtitle}</p>
        </div>

        {deals.length === 0 ? (
          <p className="ds-empty font-comic" role="status">
            {error ?? ui.deals.empty}
          </p>
        ) : (
          <>
            <div className="ds-grid">
              {deals.map((deal) => (
                <DealCard
                  key={deal.dealId}
                  deal={deal}
                  iconUrl={iconByStoreId.get(deal.storeId) ?? ""}
                  onOpen={() => setOpenDeal(deal)}
                />
              ))}
            </div>
            <p className="ds-attribution font-label">{ui.deals.attribution}</p>
          </>
        )}
      </div>

      {openDeal !== null ? (
        <DealModal
          deal={openDeal}
          iconUrl={iconByStoreId.get(openDeal.storeId) ?? ""}
          gameId={gameIdByDealId[openDeal.dealId] ?? ""}
          onClose={() => setOpenDeal(null)}
        />
      ) : null}
    </section>
  );
}

type DealCardProps = {
  deal: Deal;
  iconUrl: string;
  onOpen: () => void;
};

function DealCard({ deal, iconUrl, onOpen }: DealCardProps): JSX.Element {
  return (
    <button
      type="button"
      className="ds-card"
      onClick={onOpen}
      aria-label={ui.deals.openCardAria(deal.title)}
    >
      <span className="ds-card-cover">
        {deal.thumbUrl !== "" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ds-card-img" src={deal.thumbUrl} alt={deal.title} loading="lazy" />
        ) : (
          <span className="ds-card-img ds-card-img-fallback" aria-hidden="true" />
        )}
        {deal.savingsPercent > 0 ? (
          <span className="ds-savings font-display" aria-hidden="true">
            -{deal.savingsPercent}%
          </span>
        ) : null}
      </span>

      <span className="ds-card-body">
        <span className="ds-card-store font-label">
          {iconUrl !== "" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ds-store-icon" src={iconUrl} alt="" aria-hidden="true" loading="lazy" />
          ) : null}
          {deal.storeName}
        </span>
        <span className="ds-card-title">{deal.title}</span>
        <span className="ds-card-prices">
          {deal.normalPrice !== "" ? (
            <span className="ds-price-normal">{ui.deals.price(deal.normalPrice)}</span>
          ) : null}
          <span className="ds-price-sale font-display">{ui.deals.price(deal.salePrice)}</span>
        </span>
        {formatMxnApprox(deal.salePrice) !== "" ? (
          <span className="ds-price-mxn font-mono">{formatMxnApprox(deal.salePrice)}</span>
        ) : null}
      </span>
    </button>
  );
}

type DealModalProps = {
  deal: Deal;
  iconUrl: string;
  gameId: string;
  onClose: () => void;
};

function DealModal({ deal, iconUrl, gameId, onClose }: DealModalProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose, { lockScroll: true });

  return (
    <div
      className="dm-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={deal.title}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="dm-card c-panel c-panel-violet c-panel-ht"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <button type="button" className="dm-close" aria-label={ui.detail.lightboxClose} onClick={onClose}>
          ✕
        </button>

        <div className="dm-hero">
          {deal.thumbUrl !== "" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dm-hero-img" src={deal.thumbUrl} alt={deal.title} />
          ) : (
            <span className="dm-hero-img ds-card-img-fallback" aria-hidden="true" />
          )}
          {deal.savingsPercent > 0 ? (
            <span className="dm-savings font-display" aria-hidden="true">
              -{deal.savingsPercent}%
            </span>
          ) : null}
        </div>

        <div className="dm-body">
          <span className="dm-kicker font-label">{ui.deals.modalKicker}</span>
          <h3 className="dm-title font-display">{deal.title}</h3>

          <div className="dm-store font-label">
            {iconUrl !== "" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ds-store-icon" src={iconUrl} alt="" aria-hidden="true" />
            ) : null}
            {deal.storeName}
          </div>
          <div className="dm-prices">
            <span className="dm-sale font-display">{ui.deals.price(deal.salePrice)}</span>
            {deal.normalPrice !== "" && deal.normalPrice !== deal.salePrice ? (
              <span className="dm-normal">{ui.deals.price(deal.normalPrice)}</span>
            ) : null}
            {formatMxnApprox(deal.salePrice) !== "" ? (
              <span className="dm-mxn font-mono">{formatMxnApprox(deal.salePrice)}</span>
            ) : null}
          </div>

          {deal.steamRatingText !== "" ? (
            <p className="dm-meta font-label">
              {ui.deals.steamRatingLabel}: {deal.steamRatingText}
            </p>
          ) : null}

          <p className="dm-avail font-label">
            {ui.deals.availabilityLabel}: {ui.deals.availabilityNoEnd}
          </p>

          <p className="dm-hint font-comic">{ui.deals.analyzeHint}</p>

          <div className="dm-actions">
            {gameId !== "" ? (
              <Link href={`/juego/${gameId}`} className="dm-btn dm-btn-ghost font-label" onClick={onClose}>
                {ui.deals.viewInBtb}
              </Link>
            ) : null}
            <a
              href={deal.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dm-btn dm-btn-buy font-label"
              aria-label={ui.deals.buyAria(deal.title, deal.storeName, deal.salePrice)}
            >
              {ui.deals.buyAt(deal.storeName)}
              <span aria-hidden="true"> →</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
