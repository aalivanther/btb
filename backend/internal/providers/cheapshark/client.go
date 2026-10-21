package cheapshark

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

const BaseURL = "https://www.cheapshark.com/api/1.0"

const redirectURL = "https://www.cheapshark.com/redirect?dealID=%s"

const imageBaseURL = "https://www.cheapshark.com"

const defaultHTTPTimeout = 15 * time.Second

const requestInterval = 200 * time.Millisecond

const defaultBestDealsLimit = 24

const maxBestDealsLimit = 60

const maxResponseBytes = 5 << 20

const userAgent = "BTB/1.0 (+https://github.com/btb) Be-The-Boss game release calendar"

const retryAfterCap = 3 * time.Second

const (
	endpointDeals  = "/deals"
	endpointStores = "/stores"
	endpointGames  = "/games"
)

type Deal struct {
	DealID          string `json:"dealID"`
	Title           string `json:"title"`
	StoreID         string `json:"storeID"`
	SalePrice       string `json:"salePrice"`
	NormalPrice     string `json:"normalPrice"`
	Savings         string `json:"savings"`
	Thumb           string `json:"thumb"`
	IsOnSale        string `json:"isOnSale"`
	SteamRatingText string `json:"steamRatingText"`
}

type Store struct {
	StoreID   string `json:"storeID"`
	StoreName string `json:"storeName"`
	IsActive  int    `json:"isActive"`
	Images    struct {
		Icon string `json:"icon"`
	} `json:"images"`
}

type gameSearchResult struct {
	GameID         string `json:"gameID"`
	External       string `json:"external"`
	Cheapest       string `json:"cheapest"`
	CheapestDealID string `json:"cheapestDealID"`
	Thumb          string `json:"thumb"`
}

type Client struct {
	httpClient *http.Client
	baseURL string

	mu sync.Mutex
	lastRequestAt time.Time
}

type Option func(*Client)

func WithHTTPClient(httpClient *http.Client) Option {
	return func(client *Client) {
		client.httpClient = httpClient
	}
}

func WithBaseURL(baseURL string) Option {
	return func(client *Client) {
		client.baseURL = strings.TrimRight(baseURL, "/")
	}
}

func NewClient(options ...Option) *Client {
	client := &Client{
		httpClient: &http.Client{Timeout: defaultHTTPTimeout},
		baseURL:    BaseURL,
	}
	for _, applyOption := range options {
		applyOption(client)
	}
	return client
}

func (c *Client) throttle(ctx context.Context) error {
	if !c.lastRequestAt.IsZero() {
		wait := requestInterval - time.Since(c.lastRequestAt)
		if wait > 0 {
			timer := time.NewTimer(wait)
			select {
			case <-ctx.Done():
				timer.Stop()
				return fmt.Errorf("cheapshark: context cancelled while throttling: %w", ctx.Err())
			case <-timer.C:
			}
		}
	}
	c.lastRequestAt = time.Now()
	return nil
}

func (c *Client) doGet(ctx context.Context, endpoint string, query url.Values) ([]byte, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	bodyBytes, retryAfter, err := c.executeLocked(ctx, endpoint, query)
	if err == nil {
		return bodyBytes, nil
	}
	if retryAfter < 0 {
		return nil, err
	}
	if waitErr := c.waitRetryLocked(ctx, retryAfter); waitErr != nil {
		return nil, fmt.Errorf("%w (retry aborted: %w)", err, waitErr)
	}
	bodyBytes, _, retryErr := c.executeLocked(ctx, endpoint, query)
	if retryErr != nil {
		return nil, fmt.Errorf("cheapshark: retry failed: %w", retryErr)
	}
	return bodyBytes, nil
}

func (c *Client) executeLocked(ctx context.Context, endpoint string, query url.Values) ([]byte, time.Duration, error) {
	if err := c.throttle(ctx); err != nil {
		return nil, -1, err
	}

	fullURL := c.baseURL + endpoint
	if encoded := query.Encode(); encoded != "" {
		fullURL += "?" + encoded
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, -1, fmt.Errorf("cheapshark: failed to build request for %s: %w", endpoint, err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", userAgent)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, -1, fmt.Errorf("cheapshark: request to %s failed: %w", endpoint, err)
	}
	bodyBytes, readErr := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	_ = response.Body.Close()
	if readErr != nil {
		return nil, -1, fmt.Errorf("cheapshark: failed to read response body from %s: %w", endpoint, readErr)
	}
	status := response.StatusCode
	if status == http.StatusTooManyRequests || (status >= http.StatusInternalServerError && status < 600) {
		retryAfter := parseRetryAfter(response.Header.Get("Retry-After"))
		return nil, retryAfter, fmt.Errorf("cheapshark: transient status %d from %s", status, endpoint)
	}
	if status < http.StatusOK || status >= http.StatusMultipleChoices {
		return nil, -1, fmt.Errorf("cheapshark: unexpected status %d from %s", status, endpoint)
	}
	return bodyBytes, -1, nil
}

func (c *Client) waitRetryLocked(ctx context.Context, suggested time.Duration) error {
	wait := suggested
	if wait <= 0 {
		wait = 500 * time.Millisecond
	}
	if wait > retryAfterCap {
		return fmt.Errorf("cheapshark: retry-after %s exceeds cap %s", wait, retryAfterCap)
	}
	timer := time.NewTimer(wait)
	select {
	case <-ctx.Done():
		timer.Stop()
		return fmt.Errorf("cheapshark: context cancelled while waiting to retry: %w", ctx.Err())
	case <-timer.C:
		return nil
	}
}

func parseRetryAfter(header string) time.Duration {
	if header == "" {
		return 0
	}
	seconds, err := strconv.Atoi(strings.TrimSpace(header))
	if err != nil || seconds < 0 {
		return 0
	}
	return time.Duration(seconds) * time.Second
}

func (c *Client) BestDeals(ctx context.Context, limit int) ([]Deal, error) {
	if limit <= 0 {
		limit = defaultBestDealsLimit
	}
	if limit > maxBestDealsLimit {
		limit = maxBestDealsLimit
	}

	query := url.Values{}
	query.Set("sortBy", "Deal Rating")
	query.Set("onSale", "1")
	query.Set("pageSize", strconv.Itoa(limit))
	query.Set("pageNumber", "0")

	bodyBytes, err := c.doGet(ctx, endpointDeals, query)
	if err != nil {
		return nil, fmt.Errorf("cheapshark: failed to fetch best deals: %w", err)
	}
	var deals []Deal
	if err := json.Unmarshal(bodyBytes, &deals); err != nil {
		return nil, fmt.Errorf("cheapshark: failed to parse best deals: %w", err)
	}
	return deals, nil
}

func (c *Client) Stores(ctx context.Context) ([]Store, error) {
	bodyBytes, err := c.doGet(ctx, endpointStores, url.Values{})
	if err != nil {
		return nil, fmt.Errorf("cheapshark: failed to fetch stores: %w", err)
	}
	var stores []Store
	if err := json.Unmarshal(bodyBytes, &stores); err != nil {
		return nil, fmt.Errorf("cheapshark: failed to parse stores: %w", err)
	}
	active := make([]Store, 0, len(stores))
	for _, store := range stores {
		if store.IsActive == 1 {
			active = append(active, store)
		}
	}
	return active, nil
}

func (c *Client) FindCheapestDeal(ctx context.Context, title string) (*Deal, error) {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return nil, nil
	}

	searchQuery := url.Values{}
	searchQuery.Set("title", trimmed)
	searchQuery.Set("limit", "1")
	searchQuery.Set("exact", "0")
	searchBytes, err := c.doGet(ctx, endpointGames, searchQuery)
	if err != nil {
		return nil, fmt.Errorf("cheapshark: failed to search game %q: %w", trimmed, err)
	}
	var results []gameSearchResult
	if err := json.Unmarshal(searchBytes, &results); err != nil {
		return nil, fmt.Errorf("cheapshark: failed to parse game search for %q: %w", trimmed, err)
	}
	if len(results) == 0 || results[0].CheapestDealID == "" {
		return nil, nil
	}

	rawDealID := results[0].CheapestDealID
	if strings.Contains(rawDealID, "%") {
		if decoded, decodeErr := url.QueryUnescape(rawDealID); decodeErr == nil {
			rawDealID = decoded
		}
	}
	dealQuery := url.Values{}
	dealQuery.Set("id", rawDealID)
	dealBytes, err := c.doGet(ctx, endpointDeals, dealQuery)
	if err != nil {
		return nil, fmt.Errorf("cheapshark: failed to fetch deal for %q: %w", trimmed, err)
	}

	var dealDetail struct {
		GameInfo struct {
			Name        string `json:"name"`
			SalePrice   string `json:"salePrice"`
			RetailPrice string `json:"retailPrice"`
			StoreID     string `json:"storeID"`
			Thumb       string `json:"thumb"`
			SteamRating string `json:"steamRatingText"`
		} `json:"gameInfo"`
	}
	if err := json.Unmarshal(dealBytes, &dealDetail); err != nil {
		return nil, fmt.Errorf("cheapshark: failed to parse deal for %q: %w", trimmed, err)
	}

	salePrice := parsePrice(dealDetail.GameInfo.SalePrice)
	normalPrice := parsePrice(dealDetail.GameInfo.RetailPrice)
	if !(salePrice > 0 && normalPrice > 0 && salePrice < normalPrice) {
		return nil, nil
	}

	savings := (normalPrice - salePrice) / normalPrice * 100
	return &Deal{
		DealID:          results[0].CheapestDealID,
		Title:           dealDetail.GameInfo.Name,
		StoreID:         dealDetail.GameInfo.StoreID,
		SalePrice:       dealDetail.GameInfo.SalePrice,
		NormalPrice:     dealDetail.GameInfo.RetailPrice,
		Savings:         strconv.FormatFloat(savings, 'f', 2, 64),
		Thumb:           dealDetail.GameInfo.Thumb,
		IsOnSale:        "1",
		SteamRatingText: dealDetail.GameInfo.SteamRating,
	}, nil
}

func BuildBuyURL(dealID string) string {
	if dealID == "" {
		return ""
	}
	return fmt.Sprintf(redirectURL, dealID)
}

func BuildIconURL(iconPath string) string {
	if iconPath == "" {
		return ""
	}
	if strings.HasPrefix(iconPath, "http://") || strings.HasPrefix(iconPath, "https://") {
		return iconPath
	}
	return imageBaseURL + iconPath
}

func SavingsPercent(savings string) int32 {
	value, err := strconv.ParseFloat(strings.TrimSpace(savings), 64)
	if err != nil || value < 0 {
		return 0
	}
	return int32(math.Round(value))
}

func parsePrice(text string) float64 {
	value, err := strconv.ParseFloat(strings.TrimSpace(text), 64)
	if err != nil {
		return 0
	}
	return value
}
