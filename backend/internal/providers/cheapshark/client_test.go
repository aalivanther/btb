package cheapshark

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestClient(server *httptest.Server) *Client {
	return NewClient(WithBaseURL(server.URL), WithHTTPClient(server.Client()))
}

func TestBestDealsParses(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/deals") {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[
			{"dealID":"a","title":"Gothic","storeID":"1","salePrice":"4.99","normalPrice":"9.99","savings":"50.04","thumb":"t.jpg","isOnSale":"1","steamRatingText":"Very Positive"}
		]`))
	}))
	defer server.Close()

	deals, err := newTestClient(server).BestDeals(context.Background(), 10)
	if err != nil {
		t.Fatalf("BestDeals error: %v", err)
	}
	if len(deals) != 1 || deals[0].Title != "Gothic" || deals[0].StoreID != "1" {
		t.Fatalf("unexpected deals: %+v", deals)
	}
}

func TestStoresFiltersInactive(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[
			{"storeID":"1","storeName":"Steam","isActive":1,"images":{"icon":"/img/stores/icons/0.png"}},
			{"storeID":"9","storeName":"Old Store","isActive":0,"images":{"icon":"/x.png"}}
		]`))
	}))
	defer server.Close()

	stores, err := newTestClient(server).Stores(context.Background())
	if err != nil {
		t.Fatalf("Stores error: %v", err)
	}
	if len(stores) != 1 || stores[0].StoreName != "Steam" {
		t.Fatalf("expected only active Steam, got %+v", stores)
	}
}

func TestFindCheapestDealTwoStepsAndDiscountOnly(t *testing.T) {
	t.Parallel()
	const encodedDealID = "%2BBTrEsQ%3D"
	const decodedDealID = "+BTrEsQ="
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/games"):
			_, _ = w.Write([]byte(`[{"gameID":"1","external":"Gothic","cheapest":"4.99","cheapestDealID":"` + encodedDealID + `","thumb":"t.jpg"}]`))
		case strings.HasPrefix(r.URL.Path, "/deals"):
			if got := r.URL.Query().Get("id"); got != decodedDealID {
				t.Errorf("deal id query = %q, want %q (no double-encoding)", got, decodedDealID)
			}
			_, _ = w.Write([]byte(`{"gameInfo":{"name":"Gothic","salePrice":"4.99","retailPrice":"9.99","storeID":"1","thumb":"t.jpg","steamRatingText":"Very Positive"}}`))
		default:
			t.Errorf("unexpected path %q", r.URL.Path)
		}
	}))
	defer server.Close()

	deal, err := newTestClient(server).FindCheapestDeal(context.Background(), "Gothic")
	if err != nil {
		t.Fatalf("FindCheapestDeal error: %v", err)
	}
	if deal == nil {
		t.Fatalf("expected a deal, got nil")
	}
	if deal.DealID != encodedDealID || deal.SalePrice != "4.99" || deal.NormalPrice != "9.99" {
		t.Fatalf("unexpected deal: %+v", deal)
	}
}

func TestFindCheapestDealNoDiscountReturnsNil(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/games"):
			_, _ = w.Write([]byte(`[{"gameID":"1","external":"Gothic","cheapest":"9.99","cheapestDealID":"DEAL123","thumb":"t.jpg"}]`))
		case strings.HasPrefix(r.URL.Path, "/deals"):
			_, _ = w.Write([]byte(`{"gameInfo":{"name":"Gothic","salePrice":"9.99","retailPrice":"9.99","storeID":"1"}}`))
		}
	}))
	defer server.Close()

	deal, err := newTestClient(server).FindCheapestDeal(context.Background(), "Gothic")
	if err != nil {
		t.Fatalf("FindCheapestDeal error: %v", err)
	}
	if deal != nil {
		t.Fatalf("expected nil (no discount), got %+v", deal)
	}
}

func TestFindCheapestDealNoMatchReturnsNil(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()

	deal, err := newTestClient(server).FindCheapestDeal(context.Background(), "Nonexistent Game")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if deal != nil {
		t.Fatalf("expected nil for no match, got %+v", deal)
	}
}

func TestHelpers(t *testing.T) {
	t.Parallel()
	if got := SavingsPercent("55.034396"); got != 55 {
		t.Errorf("SavingsPercent = %d, want 55", got)
	}
	if got := SavingsPercent("bad"); got != 0 {
		t.Errorf("SavingsPercent(bad) = %d, want 0", got)
	}
	if got := BuildIconURL("/img/x.png"); got != "https://www.cheapshark.com/img/x.png" {
		t.Errorf("BuildIconURL relative = %q", got)
	}
	if got := BuildIconURL("https://cdn/x.png"); got != "https://cdn/x.png" {
		t.Errorf("BuildIconURL absolute = %q", got)
	}
	if got := BuildBuyURL(""); got != "" {
		t.Errorf("BuildBuyURL empty = %q, want empty", got)
	}
	if got := BuildBuyURL("abc%2Bdef%3D"); got != "https://www.cheapshark.com/redirect?dealID=abc%2Bdef%3D" {
		t.Errorf("BuildBuyURL should embed dealID verbatim, got %q", got)
	}
}
