package steam

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const defaultBaseURL = "https://store.steampowered.com"

const appDetailsPath = "/api/appdetails?appids=%d&cc=us&l=english"

const requestTimeout = 15 * time.Second

const minInterval = 320 * time.Millisecond

const maxResponseBytes = 5 << 20

const userAgent = "BTB/1.0 (+https://github.com/btb) Be-The-Boss game release calendar"

const retryAfterCap = 10 * time.Second

type PcSpec struct {
	OS        string
	Processor string
	Memory    string
	Graphics  string
	Storage   string
}

func (s PcSpec) empty() bool {
	return s.OS == "" && s.Processor == "" && s.Memory == "" && s.Graphics == "" && s.Storage == ""
}

const circuitBreakerThreshold = 8

type Client struct {
	httpClient *http.Client
	baseURL string
	mu      sync.Mutex
	last    time.Time
	consecutiveFailures int
	circuitOpen bool
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: requestTimeout},
		baseURL:    defaultBaseURL,
	}
}

func (c *Client) circuitIsOpen() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.circuitOpen
}

func (c *Client) recordSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.consecutiveFailures = 0
	c.circuitOpen = false
}

func (c *Client) recordFailure() (justOpened bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.consecutiveFailures++
	if !c.circuitOpen && c.consecutiveFailures >= circuitBreakerThreshold {
		c.circuitOpen = true
		return true
	}
	return false
}

func (c *Client) throttle(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	wait := minInterval - time.Since(c.last)
	if wait > 0 {
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return fmt.Errorf("steam: context cancelled while throttling: %w", ctx.Err())
		case <-timer.C:
		}
	}
	c.last = time.Now()
	return nil
}

type appDetailsResponse map[string]struct {
	Success bool `json:"success"`
	Data    struct {
		PcRequirements json.RawMessage `json:"pc_requirements"`
	} `json:"data"`
}

func (c *Client) FetchSpecs(ctx context.Context, appID int) (PcSpec, PcSpec, bool, error) {
	if c.circuitIsOpen() {
		return PcSpec{}, PcSpec{}, false, nil
	}

	body, err := c.fetchAppDetailsBody(ctx, appID, true)
	if err != nil {
		if ctx.Err() == nil {
			if justOpened := c.recordFailure(); justOpened {
				return PcSpec{}, PcSpec{}, false, fmt.Errorf("steam: circuit opened after %d consecutive failures, skipping remaining lookups: %w", circuitBreakerThreshold, err)
			}
		}
		return PcSpec{}, PcSpec{}, false, err
	}
	c.recordSuccess()

	var parsed appDetailsResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return PcSpec{}, PcSpec{}, false, nil
	}
	entry, present := parsed[strconv.Itoa(appID)]
	if !present || !entry.Success || len(entry.Data.PcRequirements) == 0 {
		return PcSpec{}, PcSpec{}, false, nil
	}

	var requirements struct {
		Minimum     string `json:"minimum"`
		Recommended string `json:"recommended"`
	}
	if err := json.Unmarshal(entry.Data.PcRequirements, &requirements); err != nil {
		return PcSpec{}, PcSpec{}, false, nil
	}

	minimum := parseSpec(requirements.Minimum)
	recommended := parseSpec(requirements.Recommended)
	return minimum, recommended, !minimum.empty() || !recommended.empty(), nil
}

func (c *Client) fetchAppDetailsBody(ctx context.Context, appID int, allowRetry bool) ([]byte, error) {
	if err := c.throttle(ctx); err != nil {
		return nil, err
	}

	url := fmt.Sprintf(c.baseURL+appDetailsPath, appID)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("steam: build request for appid %d: %w", appID, err)
	}
	request.Header.Set("User-Agent", userAgent)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("steam: request appid %d: %w", appID, err)
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode == http.StatusTooManyRequests || response.StatusCode == http.StatusServiceUnavailable {
		if allowRetry {
			if waitErr := waitRetryAfter(ctx, response.Header.Get("Retry-After")); waitErr == nil {
				return c.fetchAppDetailsBody(ctx, appID, false)
			}
		}
		return nil, fmt.Errorf("steam: rate limited (status %d) for appid %d", response.StatusCode, appID)
	}
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("steam: unexpected status %d for appid %d", response.StatusCode, appID)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	if err != nil {
		return nil, fmt.Errorf("steam: read appid %d: %w", appID, err)
	}
	return body, nil
}

func waitRetryAfter(ctx context.Context, header string) error {
	wait := time.Second
	if header != "" {
		if seconds, err := strconv.Atoi(strings.TrimSpace(header)); err == nil {
			wait = time.Duration(seconds) * time.Second
		}
	}
	if wait > retryAfterCap {
		return fmt.Errorf("steam: retry-after %s exceeds cap %s", wait, retryAfterCap)
	}
	timer := time.NewTimer(wait)
	select {
	case <-ctx.Done():
		timer.Stop()
		return fmt.Errorf("steam: context cancelled while honouring retry-after: %w", ctx.Err())
	case <-timer.C:
		return nil
	}
}

var strongPair = regexp.MustCompile(`(?is)<strong>\s*([^<:]+):\s*</strong>\s*([^<]*)`)

var tagStripper = regexp.MustCompile(`<[^>]+>`)

func parseSpec(html string) PcSpec {
	var spec PcSpec
	for _, match := range strongPair.FindAllStringSubmatch(html, -1) {
		key := strings.ToLower(strings.TrimSpace(match[1]))
		value := strings.TrimSpace(tagStripper.ReplaceAllString(match[2], " "))
		value = strings.Join(strings.Fields(value), " ")
		if value == "" {
			continue
		}
		switch {
		case strings.Contains(key, "os"):
			spec.OS = value
		case strings.Contains(key, "processor"):
			spec.Processor = value
		case strings.Contains(key, "memory"):
			spec.Memory = value
		case strings.Contains(key, "graphics") || strings.Contains(key, "video"):
			spec.Graphics = value
		case strings.Contains(key, "storage") || strings.Contains(key, "hard"):
			spec.Storage = value
		}
	}
	return spec
}
