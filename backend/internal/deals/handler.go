package deals

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"sync"
	"time"

	"connectrpc.com/connect"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/gen/btb/games/v1/gamesv1connect"
	"btb/internal/providers/cheapshark"
)

const bestDealsTTL = 10 * time.Minute

const storesTTL = 24 * time.Hour

const gameDealTTL = 10 * time.Minute

const failedGameDealTTL = 1 * time.Minute

const maxTitlesPerRequest = 50

const maxTitleLength = 200

const maxGameDealCacheEntries = 1000

const bestDealsFetchLimit = 60

const defaultBestDealsLimit = 24

const (
	flightKeyBestDeals = "best-deals"
	flightKeyStores    = "stores"
)

type dealProvider interface {
	BestDeals(ctx context.Context, limit int) ([]cheapshark.Deal, error)
	Stores(ctx context.Context) ([]cheapshark.Store, error)
	FindCheapestDeal(ctx context.Context, title string) (*cheapshark.Deal, error)
}

type clock func() time.Time

type bestDealsCacheEntry struct {
	deals     []*gamesv1.Deal
	stores    []*gamesv1.StoreInfo
	expiresAt time.Time
}

type gameDealCacheEntry struct {
	deal      *gamesv1.Deal
	expiresAt time.Time
}

type inflightCall struct {
	done chan struct{}
	err  error
}

type Handler struct {
	provider dealProvider
	now      clock

	mu sync.Mutex
	bestDeals *bestDealsCacheEntry
	storeNameByID map[string]string
	storeIconByID map[string]string
	storesExpire  time.Time
	gameDeals map[string]gameDealCacheEntry
	inflight map[string]*inflightCall
}

var _ gamesv1connect.DealsServiceHandler = (*Handler)(nil)

func NewHandler(provider dealProvider) *Handler {
	return &Handler{
		provider:      provider,
		now:           time.Now,
		gameDeals:     make(map[string]gameDealCacheEntry),
		storeNameByID: make(map[string]string),
		storeIconByID: make(map[string]string),
		inflight:      make(map[string]*inflightCall),
	}
}

func (h *Handler) singleFlight(ctx context.Context, key string, fetch func() error) error {
	h.mu.Lock()
	if call, exists := h.inflight[key]; exists {
		h.mu.Unlock()
		select {
		case <-call.done:
			return call.err
		case <-ctx.Done():
			return fmt.Errorf("deals: context cancelled waiting for in-flight %s refresh: %w", key, ctx.Err())
		}
	}
	call := &inflightCall{done: make(chan struct{})}
	h.inflight[key] = call
	h.mu.Unlock()

	call.err = fetch()

	h.mu.Lock()
	delete(h.inflight, key)
	h.mu.Unlock()
	close(call.done)
	return call.err
}

func (h *Handler) ListBestDeals(
	ctx context.Context,
	request *connect.Request[gamesv1.ListBestDealsRequest],
) (*connect.Response[gamesv1.ListBestDealsResponse], error) {
	limit := int(request.Msg.GetLimit())
	if limit <= 0 {
		limit = defaultBestDealsLimit
	}
	if limit > bestDealsFetchLimit {
		limit = bestDealsFetchLimit
	}

	if err := h.ensureStores(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnavailable, err)
	}

	h.mu.Lock()
	if entry := h.bestDeals; entry != nil && h.now().Before(entry.expiresAt) {
		response := buildBestDealsResponse(entry, limit)
		h.mu.Unlock()
		return response, nil
	}
	h.mu.Unlock()

	if err := h.singleFlight(ctx, flightKeyBestDeals, func() error {
		return h.refreshBestDeals(ctx)
	}); err != nil {
		return nil, connect.NewError(connect.CodeUnavailable, err)
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	if h.bestDeals == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("deals: best deals cache empty after refresh"))
	}
	return buildBestDealsResponse(h.bestDeals, limit), nil
}

func buildBestDealsResponse(entry *bestDealsCacheEntry, limit int) *connect.Response[gamesv1.ListBestDealsResponse] {
	deals := entry.deals
	if len(deals) > limit {
		deals = deals[:limit]
	}
	return connect.NewResponse(&gamesv1.ListBestDealsResponse{Deals: deals, Stores: entry.stores})
}

func (h *Handler) refreshBestDeals(ctx context.Context) error {
	rawDeals, err := h.provider.BestDeals(ctx, bestDealsFetchLimit)
	if err != nil {
		return err
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	deals := make([]*gamesv1.Deal, 0, len(rawDeals))
	for index := range rawDeals {
		deals = append(deals, h.toContractDealLocked(&rawDeals[index]))
	}
	h.bestDeals = &bestDealsCacheEntry{
		deals:     deals,
		stores:    h.storesSnapshotLocked(),
		expiresAt: h.now().Add(bestDealsTTL),
	}
	return nil
}

func (h *Handler) FindGameDeals(
	ctx context.Context,
	request *connect.Request[gamesv1.FindGameDealsRequest],
) (*connect.Response[gamesv1.FindGameDealsResponse], error) {
	titles := request.Msg.GetTitles()
	if len(titles) > maxTitlesPerRequest {
		titles = titles[:maxTitlesPerRequest]
	}

	if err := h.ensureStores(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnavailable, err)
	}

	seen := make(map[string]bool, len(titles))
	deals := make([]*gamesv1.Deal, 0, len(titles))
	missing := make([]string, 0, len(titles))

	h.mu.Lock()
	now := h.now()
	for _, title := range titles {
		if title == "" || len(title) > maxTitleLength || seen[title] {
			continue
		}
		seen[title] = true
		if entry, ok := h.gameDeals[title]; ok && now.Before(entry.expiresAt) {
			if entry.deal != nil {
				deals = append(deals, entry.deal)
			}
			continue
		}
		missing = append(missing, title)
	}
	h.mu.Unlock()

	attempted := 0
	failed := 0
	for _, title := range missing {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return nil, connect.NewError(connect.CodeCanceled,
				fmt.Errorf("deals: request cancelled after %d/%d title lookups: %w", attempted, len(missing), ctxErr))
		}

		attempted++
		rawDeal, err := h.provider.FindCheapestDeal(ctx, title)
		if err != nil {
			failed++
			h.mu.Lock()
			h.storeGameDealLocked(title, gameDealCacheEntry{deal: nil, expiresAt: h.now().Add(failedGameDealTTL)})
			h.mu.Unlock()
			continue
		}

		var contractDeal *gamesv1.Deal
		h.mu.Lock()
		if rawDeal != nil {
			contractDeal = h.toContractDealLocked(rawDeal)
			deals = append(deals, contractDeal)
		}
		h.storeGameDealLocked(title, gameDealCacheEntry{deal: contractDeal, expiresAt: h.now().Add(gameDealTTL)})
		h.mu.Unlock()
	}

	if attempted > 0 && failed == attempted {
		return nil, connect.NewError(connect.CodeUnavailable,
			fmt.Errorf("deals: all %d title lookups failed (provider down?)", attempted))
	}

	return connect.NewResponse(&gamesv1.FindGameDealsResponse{Deals: deals}), nil
}

func (h *Handler) storeGameDealLocked(title string, entry gameDealCacheEntry) {
	if _, exists := h.gameDeals[title]; !exists && len(h.gameDeals) >= maxGameDealCacheEntries {
		now := h.now()
		for key, cached := range h.gameDeals {
			if !now.Before(cached.expiresAt) {
				delete(h.gameDeals, key)
			}
		}
		if len(h.gameDeals) >= maxGameDealCacheEntries {
			evictKey := ""
			var evictAt time.Time
			for key, cached := range h.gameDeals {
				if evictKey == "" || cached.expiresAt.Before(evictAt) {
					evictKey = key
					evictAt = cached.expiresAt
				}
			}
			delete(h.gameDeals, evictKey)
		}
	}
	h.gameDeals[title] = entry
}

func (h *Handler) ensureStores(ctx context.Context) error {
	h.mu.Lock()
	fresh := len(h.storeNameByID) > 0 && h.now().Before(h.storesExpire)
	h.mu.Unlock()
	if fresh {
		return nil
	}

	return h.singleFlight(ctx, flightKeyStores, func() error {
		h.mu.Lock()
		if len(h.storeNameByID) > 0 && h.now().Before(h.storesExpire) {
			h.mu.Unlock()
			return nil
		}
		h.mu.Unlock()

		stores, err := h.provider.Stores(ctx)

		h.mu.Lock()
		defer h.mu.Unlock()
		if err != nil {
			if len(h.storeNameByID) > 0 {
				return nil
			}
			return err
		}
		nameByID := make(map[string]string, len(stores))
		iconByID := make(map[string]string, len(stores))
		for _, store := range stores {
			nameByID[store.StoreID] = store.StoreName
			iconByID[store.StoreID] = cheapshark.BuildIconURL(store.Images.Icon)
		}
		h.storeNameByID = nameByID
		h.storeIconByID = iconByID
		h.storesExpire = h.now().Add(storesTTL)
		return nil
	})
}

func (h *Handler) storesSnapshotLocked() []*gamesv1.StoreInfo {
	stores := make([]*gamesv1.StoreInfo, 0, len(h.storeNameByID))
	for storeID, name := range h.storeNameByID {
		stores = append(stores, &gamesv1.StoreInfo{
			StoreId:   storeID,
			StoreName: name,
			IconUrl:   h.storeIconByID[storeID],
		})
	}
	sort.Slice(stores, func(left, right int) bool {
		leftID, leftErr := strconv.Atoi(stores[left].GetStoreId())
		rightID, rightErr := strconv.Atoi(stores[right].GetStoreId())
		if leftErr != nil || rightErr != nil {
			return stores[left].GetStoreId() < stores[right].GetStoreId()
		}
		return leftID < rightID
	})
	return stores
}

func (h *Handler) toContractDealLocked(raw *cheapshark.Deal) *gamesv1.Deal {
	return &gamesv1.Deal{
		DealId:          raw.DealID,
		Title:           raw.Title,
		StoreId:         raw.StoreID,
		StoreName:       h.storeNameByID[raw.StoreID],
		SalePrice:       raw.SalePrice,
		NormalPrice:     raw.NormalPrice,
		SavingsPercent:  cheapshark.SavingsPercent(raw.Savings),
		ThumbUrl:        raw.Thumb,
		BuyUrl:          cheapshark.BuildBuyURL(raw.DealID),
		SteamRatingText: raw.SteamRatingText,
	}
}
