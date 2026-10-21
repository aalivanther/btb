package igdb

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

const BaseURL = "https://api.igdb.com/v4"

const TokenURL = "https://id.twitch.tv/oauth2/token"

const ImageBaseURL = "https://images.igdb.com/igdb/image/upload/"

const (
	ImageSizeCoverBig = "cover_big"
	ImageSizeHero = "1080p"
)

const maxResponseBytes = 20 << 20

const defaultHTTPTimeout = 15 * time.Second

const tokenExpiryMargin = 60 * time.Second

const requestInterval = 250 * time.Millisecond

const discoverLimit = 500

const getGamesBatchSize = 100

const (
	endpointGames = "/games"
)

const gameFields = "fields id,name,summary,first_release_date," +
	"cover.image_id,screenshots.image_id,artworks.image_id," +
	"genres.name," +
	"platforms.id,platforms.name,platforms.abbreviation," +
	"involved_companies.company.name,involved_companies.developer,involved_companies.publisher," +
	"age_ratings.rating,age_ratings.category," +
	"videos.video_id,videos.name," +
	"aggregated_rating,aggregated_rating_count,total_rating,total_rating_count,hypes," +
	"external_games.url,external_games.uid," +
	"collections.id,collections.name,game_type,url;"

var defaultPlatformIDs = []int{167, 169, 130, 508, 6}

type Client struct {
	httpClient *http.Client
	baseURL string
	tokenURL string
	clientID string
	clientSecret string
	platformIDs []int

	mu sync.Mutex
	accessToken string
	tokenExpiry time.Time
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

func WithTokenURL(tokenURL string) Option {
	return func(client *Client) {
		client.tokenURL = tokenURL
	}
}

func WithPlatforms(platformIDs []int) Option {
	return func(client *Client) {
		copied := make([]int, len(platformIDs))
		copy(copied, platformIDs)
		client.platformIDs = copied
	}
}

func NewClient(clientID, clientSecret string, options ...Option) *Client {
	defaults := make([]int, len(defaultPlatformIDs))
	copy(defaults, defaultPlatformIDs)

	client := &Client{
		httpClient:   &http.Client{Timeout: defaultHTTPTimeout},
		baseURL:      BaseURL,
		tokenURL:     TokenURL,
		clientID:     clientID,
		clientSecret: clientSecret,
		platformIDs:  defaults,
	}

	for _, applyOption := range options {
		applyOption(client)
	}

	return client
}

type twitchTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn int64 `json:"expires_in"`
	TokenType string `json:"token_type"`
}

func (c *Client) ensureToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.accessToken, nil
	}

	token, expiry, err := c.fetchToken(ctx)
	if err != nil {
		return "", err
	}

	c.accessToken = token
	c.tokenExpiry = expiry
	return token, nil
}

func (c *Client) fetchToken(ctx context.Context) (token string, expiry time.Time, err error) {
	query := url.Values{}
	query.Set("client_id", c.clientID)
	query.Set("client_secret", c.clientSecret)
	query.Set("grant_type", "client_credentials")
	fullURL := c.tokenURL + "?" + query.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, nil)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("igdb: failed to build token request: %w", redactURLError(err))
	}
	request.Header.Set("Accept", "application/json")

	response, err := c.httpClient.Do(request)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("igdb: token request failed: %w", redactURLError(err))
	}

	bodyBytes, readErr := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	_ = response.Body.Close()
	if readErr != nil {
		return "", time.Time{}, fmt.Errorf("igdb: failed to read token response body: %w", readErr)
	}

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return "", time.Time{}, fmt.Errorf("igdb: unexpected status %d while fetching token", response.StatusCode)
	}

	parsed := &twitchTokenResponse{}
	if err := json.Unmarshal(bodyBytes, parsed); err != nil {
		return "", time.Time{}, fmt.Errorf("igdb: failed to parse token response: %w", err)
	}

	if parsed.AccessToken == "" {
		return "", time.Time{}, fmt.Errorf("igdb: token response did not include an access_token")
	}
	if parsed.ExpiresIn <= 0 {
		return "", time.Time{}, fmt.Errorf("igdb: token response had a non-positive expires_in (%d)", parsed.ExpiresIn)
	}

	effectiveExpiry := time.Now().Add(time.Duration(parsed.ExpiresIn) * time.Second).Add(-tokenExpiryMargin)
	return parsed.AccessToken, effectiveExpiry, nil
}

func (c *Client) throttle(ctx context.Context) error {
	if !c.lastRequestAt.IsZero() {
		elapsed := time.Since(c.lastRequestAt)
		if elapsed < requestInterval {
			waitDuration := requestInterval - elapsed
			timer := time.NewTimer(waitDuration)
			select {
			case <-ctx.Done():
				timer.Stop()
				return fmt.Errorf("igdb: context cancelled while throttling: %w", ctx.Err())
			case <-timer.C:
			}
		}
	}
	c.lastRequestAt = time.Now()
	return nil
}

func (c *Client) doQuery(ctx context.Context, endpoint, apicalypseBody string) ([]byte, error) {
	bodyBytes, unauthorized, err := c.doQueryOnce(ctx, endpoint, apicalypseBody)
	if err == nil || !unauthorized {
		return bodyBytes, err
	}

	c.mu.Lock()
	c.accessToken = ""
	c.tokenExpiry = time.Time{}
	c.mu.Unlock()

	bodyBytes, _, retryErr := c.doQueryOnce(ctx, endpoint, apicalypseBody)
	if retryErr != nil {
		return nil, fmt.Errorf("igdb: retry after 401 failed: %w", retryErr)
	}
	return bodyBytes, nil
}

func (c *Client) doQueryOnce(ctx context.Context, endpoint, apicalypseBody string) ([]byte, bool, error) {
	token, err := c.ensureToken(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("igdb: failed to ensure access token for %s: %w", endpoint, err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if err := c.throttle(ctx); err != nil {
		return nil, false, fmt.Errorf("igdb: throttling failed for %s: %w", endpoint, err)
	}

	fullURL := c.baseURL + endpoint
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, strings.NewReader(apicalypseBody))
	if err != nil {
		return nil, false, fmt.Errorf("igdb: failed to build request for %s: %w", endpoint, err)
	}

	request.Header.Set("Client-ID", c.clientID)
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "text/plain")

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, false, fmt.Errorf("igdb: request to %s failed: %w", endpoint, redactURLError(err))
	}

	bodyBytes, readErr := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes))
	_ = response.Body.Close()
	if readErr != nil {
		return nil, false, fmt.Errorf("igdb: failed to read response body from %s: %w", endpoint, readErr)
	}

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		unauthorized := response.StatusCode == http.StatusUnauthorized
		return nil, unauthorized, fmt.Errorf("igdb: unexpected status %d from %s: %s", response.StatusCode, endpoint, snippet(bodyBytes))
	}

	return bodyBytes, false, nil
}

func (c *Client) DiscoverGames(ctx context.Context, year, month int, platformIDs []int) ([]int, error) {
	effectivePlatforms := platformIDs
	if len(effectivePlatforms) == 0 {
		effectivePlatforms = c.platformIDs
	}
	if len(effectivePlatforms) == 0 {
		return nil, fmt.Errorf("igdb: cannot discover games for %04d-%02d without any platform ids", year, month)
	}

	unixStart, unixEndExclusive := monthUnixRange(year, month)

	body := gameFields +
		fmt.Sprintf("where first_release_date >= %d & first_release_date < %d & platforms = (%s) & version_parent = null;",
			unixStart, unixEndExclusive, joinInts(effectivePlatforms)) +
		fmt.Sprintf("sort first_release_date asc; limit %d;", discoverLimit)

	bodyBytes, err := c.doQuery(ctx, endpointGames, body)
	if err != nil {
		return nil, fmt.Errorf("igdb: failed to discover games for %04d-%02d: %w", year, month, err)
	}

	var discovered []RawGame
	if err := json.Unmarshal(bodyBytes, &discovered); err != nil {
		return nil, fmt.Errorf("igdb: failed to parse discover response for %04d-%02d: %w", year, month, err)
	}

	gameIDs := make([]int, 0, len(discovered))
	for _, game := range discovered {
		gameIDs = append(gameIDs, game.ID)
	}
	return gameIDs, nil
}

func (c *Client) GetGames(ctx context.Context, ids []int) ([]RawGame, error) {
	if len(ids) == 0 {
		return []RawGame{}, nil
	}

	games := make([]RawGame, 0, len(ids))

	for start := 0; start < len(ids); start += getGamesBatchSize {
		end := start + getGamesBatchSize
		if end > len(ids) {
			end = len(ids)
		}
		batch := ids[start:end]

		body := gameFields +
			fmt.Sprintf("where id = (%s);", joinInts(batch)) +
			fmt.Sprintf("limit %d;", len(batch))

		bodyBytes, err := c.doQuery(ctx, endpointGames, body)
		if err != nil {
			return nil, fmt.Errorf("igdb: failed to fetch game details for batch starting at %d: %w", start, err)
		}

		var batchGames []RawGame
		if err := json.Unmarshal(bodyBytes, &batchGames); err != nil {
			return nil, fmt.Errorf("igdb: failed to parse game details for batch starting at %d: %w", start, err)
		}
		games = append(games, batchGames...)
	}

	return games, nil
}

func (c *Client) BuildImageURL(imageID, size string) string {
	if imageID == "" {
		return ""
	}
	return ImageBaseURL + "t_" + size + "/" + imageID + ".jpg"
}

func monthUnixRange(year, month int) (unixStart, unixEndExclusive int64) {
	startOfMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	startOfNextMonth := startOfMonth.AddDate(0, 1, 0)
	return startOfMonth.Unix(), startOfNextMonth.Unix()
}

func joinInts(values []int) string {
	parts := make([]string, len(values))
	for index, value := range values {
		parts[index] = strconv.Itoa(value)
	}
	return strings.Join(parts, ",")
}

func snippet(body []byte) string {
	const maxSnippetLength = 256
	text := strings.TrimSpace(string(body))
	if text == "" {
		return "<empty body>"
	}
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.ReplaceAll(text, "\r", " ")
	if len(text) > maxSnippetLength {
		return text[:maxSnippetLength] + "..."
	}
	return text
}

func redactURLError(err error) error {
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		return urlErr.Err
	}
	return err
}

var (
	_ func(context.Context, int, int, []int) ([]int, error) = (*Client)(nil).DiscoverGames
	_ func(context.Context, []int) ([]RawGame, error)       = (*Client)(nil).GetGames
	_ func(context.Context, string, string) ([]byte, error) = (*Client)(nil).doQuery
	_ func(context.Context) (string, error)                 = (*Client)(nil).ensureToken
	_ func(string, string) string                           = (*Client)(nil).BuildImageURL
)
