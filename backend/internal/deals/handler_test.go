package deals

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/internal/providers/cheapshark"
)

type fakeProvider struct {
	bestDeals     []cheapshark.Deal
	stores        []cheapshark.Store
	dealByTitle   map[string]*cheapshark.Deal
	findErr       error
	bestCalls     int
	storesCalls   int
	findCallCount map[string]int
}

func (f *fakeProvider) BestDeals(_ context.Context, _ int) ([]cheapshark.Deal, error) {
	f.bestCalls++
	return f.bestDeals, nil
}

func (f *fakeProvider) Stores(_ context.Context) ([]cheapshark.Store, error) {
	f.storesCalls++
	return f.stores, nil
}

func (f *fakeProvider) FindCheapestDeal(_ context.Context, title string) (*cheapshark.Deal, error) {
	if f.findCallCount == nil {
		f.findCallCount = make(map[string]int)
	}
	f.findCallCount[title]++
	if f.findErr != nil {
		return nil, f.findErr
	}
	return f.dealByTitle[title], nil
}

func newTestHandler(provider dealProvider, now *time.Time) *Handler {
	handler := NewHandler(provider)
	handler.now = func() time.Time { return *now }
	return handler
}

func sampleStores() []cheapshark.Store {
	steam := cheapshark.Store{StoreID: "1", StoreName: "Steam", IsActive: 1}
	steam.Images.Icon = "/img/stores/icons/0.png"
	gog := cheapshark.Store{StoreID: "7", StoreName: "GOG", IsActive: 1}
	gog.Images.Icon = "/img/stores/icons/6.png"
	return []cheapshark.Store{steam, gog}
}

func TestListBestDealsTranslatesAndResolvesStore(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{
		bestDeals: []cheapshark.Deal{
			{
				DealID: "abc", Title: "Gothic", StoreID: "1",
				SalePrice: "4.99", NormalPrice: "9.99", Savings: "50.04", Thumb: "t.jpg", IsOnSale: "1",
			},
		},
		stores: sampleStores(),
	}
	handler := newTestHandler(provider, &now)

	response, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{Limit: 10}))
	if err != nil {
		t.Fatalf("ListBestDeals returned error: %v", err)
	}
	deals := response.Msg.GetDeals()
	if len(deals) != 1 {
		t.Fatalf("expected 1 deal, got %d", len(deals))
	}
	deal := deals[0]
	if deal.GetStoreName() != "Steam" {
		t.Errorf("store name = %q, want %q", deal.GetStoreName(), "Steam")
	}
	if deal.GetSavingsPercent() != 50 {
		t.Errorf("savings = %d, want 50", deal.GetSavingsPercent())
	}
	if deal.GetBuyUrl() == "" {
		t.Errorf("buy url should not be empty")
	}
	if len(response.Msg.GetStores()) != 2 {
		t.Errorf("expected 2 stores, got %d", len(response.Msg.GetStores()))
	}
}

func TestListBestDealsCachesWithinTTL(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{bestDeals: []cheapshark.Deal{{DealID: "x", Title: "A", StoreID: "1", IsOnSale: "1"}}, stores: sampleStores()}
	handler := newTestHandler(provider, &now)

	if _, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{})); err != nil {
		t.Fatalf("first call error: %v", err)
	}
	now = now.Add(bestDealsTTL - time.Minute)
	if _, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{})); err != nil {
		t.Fatalf("second call error: %v", err)
	}
	if provider.bestCalls != 1 {
		t.Errorf("expected 1 provider call within TTL, got %d", provider.bestCalls)
	}

	now = now.Add(bestDealsTTL + time.Minute)
	if _, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{})); err != nil {
		t.Fatalf("third call error: %v", err)
	}
	if provider.bestCalls != 2 {
		t.Errorf("expected 2 provider calls after TTL expiry, got %d", provider.bestCalls)
	}
}

func TestFindGameDealsFiltersAndCaches(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{
		stores: sampleStores(),
		dealByTitle: map[string]*cheapshark.Deal{
			"Gothic": {DealID: "g", Title: "Gothic", StoreID: "7", SalePrice: "2.99", NormalPrice: "9.99", Savings: "70", IsOnSale: "1"},
			"Halo": nil,
		},
	}
	handler := newTestHandler(provider, &now)

	response, err := handler.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{
		Titles: []string{"Gothic", "Halo", ""},
	}))
	if err != nil {
		t.Fatalf("FindGameDeals error: %v", err)
	}
	deals := response.Msg.GetDeals()
	if len(deals) != 1 || deals[0].GetTitle() != "Gothic" {
		t.Fatalf("expected only Gothic, got %+v", deals)
	}
	if deals[0].GetStoreName() != "GOG" {
		t.Errorf("store name = %q, want GOG", deals[0].GetStoreName())
	}

	if _, err := handler.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{
		Titles: []string{"Gothic", "Halo"},
	})); err != nil {
		t.Fatalf("second FindGameDeals error: %v", err)
	}
	if provider.findCallCount["Gothic"] != 1 {
		t.Errorf("expected Gothic searched once (cached), got %d", provider.findCallCount["Gothic"])
	}
	if provider.findCallCount["Halo"] != 1 {
		t.Errorf("expected Halo searched once (cached as no-deal), got %d", provider.findCallCount["Halo"])
	}
}

type syncProvider struct {
	stores      []cheapshark.Store
	deals       []cheapshark.Deal
	dealByTitle map[string]*cheapshark.Deal

	bestStarted chan struct{}
	bestRelease chan struct{}
	findStarted chan struct{}
	findRelease chan struct{}

	mu        sync.Mutex
	bestCalls int
	findCalls int
}

func (p *syncProvider) BestDeals(_ context.Context, _ int) ([]cheapshark.Deal, error) {
	p.mu.Lock()
	p.bestCalls++
	p.mu.Unlock()
	if p.bestStarted != nil {
		p.bestStarted <- struct{}{}
	}
	if p.bestRelease != nil {
		<-p.bestRelease
	}
	return p.deals, nil
}

func (p *syncProvider) Stores(_ context.Context) ([]cheapshark.Store, error) {
	return p.stores, nil
}

func (p *syncProvider) FindCheapestDeal(_ context.Context, title string) (*cheapshark.Deal, error) {
	p.mu.Lock()
	p.findCalls++
	p.mu.Unlock()
	if p.findStarted != nil {
		p.findStarted <- struct{}{}
	}
	if p.findRelease != nil {
		<-p.findRelease
	}
	return p.dealByTitle[title], nil
}

func (p *syncProvider) bestCallsCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.bestCalls
}

type signalContext struct {
	context.Context
	once   sync.Once
	joined chan<- struct{}
}

func (c *signalContext) Done() <-chan struct{} {
	c.once.Do(func() { c.joined <- struct{}{} })
	return c.Context.Done()
}

func waitSignal(t *testing.T, signal <-chan struct{}, reason string) {
	t.Helper()
	select {
	case <-signal:
	case <-time.After(10 * time.Second):
		t.Fatalf("timed out waiting: %s", reason)
	}
}

func makeDeals(n int) []cheapshark.Deal {
	deals := make([]cheapshark.Deal, 0, n)
	for index := range n {
		deals = append(deals, cheapshark.Deal{
			DealID:      fmt.Sprintf("deal-%02d", index),
			Title:       fmt.Sprintf("Game %02d", index),
			StoreID:     "1",
			SalePrice:   "4.99",
			NormalPrice: "9.99",
			Savings:     "50",
			IsOnSale:    "1",
		})
	}
	return deals
}

func TestListBestDealsSingleFlightUnderConcurrency(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	const passengers = 8
	provider := &syncProvider{
		stores:      sampleStores(),
		deals:       makeDeals(3),
		bestStarted: make(chan struct{}, passengers+1),
		bestRelease: make(chan struct{}),
	}
	handler := newTestHandler(provider, &now)
	request := func() *connect.Request[gamesv1.ListBestDealsRequest] {
		return connect.NewRequest(&gamesv1.ListBestDealsRequest{Limit: 3})
	}

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		response, err := handler.ListBestDeals(context.Background(), request())
		if err != nil {
			t.Errorf("leader ListBestDeals error: %v", err)
			return
		}
		if len(response.Msg.GetDeals()) != 3 {
			t.Errorf("leader got %d deals, want 3", len(response.Msg.GetDeals()))
		}
	}()
	waitSignal(t, provider.bestStarted, "leader never reached the provider")

	joined := make(chan struct{}, passengers)
	for range passengers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctx := &signalContext{Context: context.Background(), joined: joined}
			response, err := handler.ListBestDeals(ctx, request())
			if err != nil {
				t.Errorf("passenger ListBestDeals error: %v", err)
				return
			}
			if len(response.Msg.GetDeals()) != 3 {
				t.Errorf("passenger got %d deals, want 3", len(response.Msg.GetDeals()))
			}
		}()
	}
	for range passengers {
		waitSignal(t, joined, "a passenger never joined the in-flight refresh")
	}

	close(provider.bestRelease)
	wg.Wait()

	if got := provider.bestCallsCount(); got != 1 {
		t.Errorf("expected exactly 1 provider call (single flight), got %d", got)
	}
}

func TestFindGameDealsDoesNotHoldLockDuringNetwork(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &syncProvider{
		stores: sampleStores(),
		deals:  makeDeals(2),
		dealByTitle: map[string]*cheapshark.Deal{
			"Gothic": {DealID: "g", Title: "Gothic", StoreID: "1", SalePrice: "2.99", NormalPrice: "9.99", Savings: "70", IsOnSale: "1"},
		},
		findStarted: make(chan struct{}, 1),
		findRelease: make(chan struct{}),
	}
	handler := newTestHandler(provider, &now)

	if _, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{})); err != nil {
		t.Fatalf("warm-up ListBestDeals error: %v", err)
	}

	findDone := make(chan struct{})
	go func() {
		defer close(findDone)
		response, err := handler.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{
			Titles: []string{"Gothic"},
		}))
		if err != nil {
			t.Errorf("FindGameDeals error: %v", err)
			return
		}
		if len(response.Msg.GetDeals()) != 1 {
			t.Errorf("FindGameDeals got %d deals, want 1", len(response.Msg.GetDeals()))
		}
	}()
	waitSignal(t, provider.findStarted, "FindGameDeals never reached the provider")

	listDone := make(chan struct{})
	go func() {
		defer close(listDone)
		response, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{}))
		if err != nil {
			t.Errorf("ListBestDeals with fresh cache error: %v", err)
			return
		}
		if len(response.Msg.GetDeals()) != 2 {
			t.Errorf("fresh-cache ListBestDeals got %d deals, want 2", len(response.Msg.GetDeals()))
		}
	}()
	waitSignal(t, listDone, "ListBestDeals blocked while FindGameDeals was on the network (lock held during a network call)")

	close(provider.findRelease)
	waitSignal(t, findDone, "FindGameDeals never finished after being released")
	if got := provider.bestCallsCount(); got != 1 {
		t.Errorf("fresh cache should not trigger another BestDeals call, got %d", got)
	}
}

func TestGameDealCacheIsBounded(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{stores: sampleStores()}
	handler := newTestHandler(provider, &now)

	const batches = maxGameDealCacheEntries/maxTitlesPerRequest + 5
	for batch := range batches {
		titles := make([]string, 0, maxTitlesPerRequest)
		for offset := range maxTitlesPerRequest {
			titles = append(titles, fmt.Sprintf("title-%04d", batch*maxTitlesPerRequest+offset))
		}
		if _, err := handler.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{
			Titles: titles,
		})); err != nil {
			t.Fatalf("FindGameDeals batch %d error: %v", batch, err)
		}
		if len(handler.gameDeals) > maxGameDealCacheEntries {
			t.Fatalf("cache exceeded its cap after batch %d: %d > %d",
				batch, len(handler.gameDeals), maxGameDealCacheEntries)
		}
	}
	if len(handler.gameDeals) != maxGameDealCacheEntries {
		t.Errorf("expected the cache to sit exactly at its cap %d, got %d",
			maxGameDealCacheEntries, len(handler.gameDeals))
	}
}

func TestListBestDealsCachesFullFetchAndTrimsPerRequest(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{bestDeals: makeDeals(30), stores: sampleStores()}
	handler := newTestHandler(provider, &now)

	first, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{Limit: 5}))
	if err != nil {
		t.Fatalf("first ListBestDeals error: %v", err)
	}
	if len(first.Msg.GetDeals()) != 5 {
		t.Fatalf("first call got %d deals, want 5", len(first.Msg.GetDeals()))
	}

	now = now.Add(time.Minute)
	second, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{Limit: 24}))
	if err != nil {
		t.Fatalf("second ListBestDeals error: %v", err)
	}
	if len(second.Msg.GetDeals()) != 24 {
		t.Errorf("second call got %d deals, want 24 (cache must hold the full fetch)", len(second.Msg.GetDeals()))
	}
	if provider.bestCalls != 1 {
		t.Errorf("expected 1 provider call (shared cache), got %d", provider.bestCalls)
	}
}

func TestFindGameDealsAllLookupsFailedIsUnavailable(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{stores: sampleStores(), findErr: errors.New("cheapshark down")}
	handler := newTestHandler(provider, &now)

	_, err := handler.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{
		Titles: []string{"Gothic", "Halo"},
	}))
	if err == nil {
		t.Fatalf("expected an error when every lookup fails, got nil")
	}
	if code := connect.CodeOf(err); code != connect.CodeUnavailable {
		t.Errorf("error code = %v, want %v", code, connect.CodeUnavailable)
	}
}

func TestFindGameDealsCancelledContextIsCanceled(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	provider := &fakeProvider{stores: sampleStores()}
	handler := newTestHandler(provider, &now)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := handler.FindGameDeals(ctx, connect.NewRequest(&gamesv1.FindGameDealsRequest{
		Titles: []string{"Gothic"},
	}))
	if err == nil {
		t.Fatalf("expected an error for a cancelled context, got nil")
	}
	if code := connect.CodeOf(err); code != connect.CodeCanceled {
		t.Errorf("error code = %v, want %v", code, connect.CodeCanceled)
	}
	if provider.findCallCount["Gothic"] != 0 {
		t.Errorf("no lookup should reach the provider after cancellation, got %d", provider.findCallCount["Gothic"])
	}
}

func TestListBestDealsStoresSortedNumerically(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 6, 13, 12, 0, 0, 0, time.UTC)
	stores := []cheapshark.Store{
		{StoreID: "10", StoreName: "Fanatical", IsActive: 1},
		{StoreID: "2", StoreName: "GamersGate", IsActive: 1},
		{StoreID: "1", StoreName: "Steam", IsActive: 1},
	}
	provider := &fakeProvider{bestDeals: makeDeals(1), stores: stores}
	handler := newTestHandler(provider, &now)

	response, err := handler.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{}))
	if err != nil {
		t.Fatalf("ListBestDeals error: %v", err)
	}
	got := response.Msg.GetStores()
	want := []string{"1", "2", "10"}
	if len(got) != len(want) {
		t.Fatalf("got %d stores, want %d", len(got), len(want))
	}
	for index, storeID := range want {
		if got[index].GetStoreId() != storeID {
			t.Errorf("store[%d] id = %q, want %q (numeric order)", index, got[index].GetStoreId(), storeID)
		}
	}
}
