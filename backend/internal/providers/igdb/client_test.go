package igdb

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const (
	testClientID     = "test-client-id-123"
	testClientSecret = "test-client-secret-456"
	testAccessToken  = "test-access-token-789"
)

func tokenResponse(t *testing.T, accessToken string, expiresInSeconds int) string {
	t.Helper()
	payload := struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		TokenType   string `json:"token_type"`
	}{
		AccessToken: accessToken,
		ExpiresIn:   expiresInSeconds,
		TokenType:   "bearer",
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to encode the fake token response: %v", err)
	}
	return string(encoded)
}

func newTwitchServer(t *testing.T, expiresInSeconds int, tokenRequests *atomic.Int32) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		if tokenRequests != nil {
			tokenRequests.Add(1)
		}

		query := request.URL.Query()
		if gotClientID := query.Get("client_id"); gotClientID != testClientID {
			t.Errorf("token request client_id = %q, want %q", gotClientID, testClientID)
		}
		if gotClientSecret := query.Get("client_secret"); gotClientSecret != testClientSecret {
			t.Errorf("token request client_secret = %q, want %q", gotClientSecret, testClientSecret)
		}
		if gotGrantType := query.Get("grant_type"); gotGrantType != "client_credentials" {
			t.Errorf("token request grant_type = %q, want %q", gotGrantType, "client_credentials")
		}

		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, tokenResponse(t, testAccessToken, expiresInSeconds))
	}))
}

func newTestClient(igdbServer, twitchServer *httptest.Server) *Client {
	return NewClient(
		testClientID,
		testClientSecret,
		WithBaseURL(igdbServer.URL),
		WithTokenURL(twitchServer.URL),
		WithHTTPClient(igdbServer.Client()),
	)
}

func writeBody(t *testing.T, responseWriter http.ResponseWriter, body string) {
	t.Helper()
	if _, err := responseWriter.Write([]byte(body)); err != nil {
		t.Fatalf("failed to write test response body: %v", err)
	}
}

func TestEnsureTokenExchangesCredentialsForBearer(t *testing.T) {
	t.Parallel()

	twitchServer := newTwitchServer(t, 3600, nil)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		gotAuthorization := request.Header.Get("Authorization")
		wantAuthorization := "Bearer " + testAccessToken
		if gotAuthorization != wantAuthorization {
			t.Errorf("Authorization header = %q, want %q", gotAuthorization, wantAuthorization)
		}
		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, "[]")
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	if _, err := client.DiscoverGames(context.Background(), 2026, 6, nil); err != nil {
		t.Fatalf("DiscoverGames returned an unexpected error: %v", err)
	}
}

func TestDoQuerySendsRequiredHeadersAndKeepsSecretsOutOfURL(t *testing.T) {
	t.Parallel()

	twitchServer := newTwitchServer(t, 3600, nil)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost {
			t.Errorf("request method = %q, want %q", request.Method, http.MethodPost)
		}

		if gotClientID := request.Header.Get("Client-ID"); gotClientID != testClientID {
			t.Errorf("Client-ID header = %q, want %q", gotClientID, testClientID)
		}
		if gotAuthorization := request.Header.Get("Authorization"); gotAuthorization != "Bearer "+testAccessToken {
			t.Errorf("Authorization header = %q, want %q", gotAuthorization, "Bearer "+testAccessToken)
		}
		if gotAccept := request.Header.Get("Accept"); gotAccept != "application/json" {
			t.Errorf("Accept header = %q, want %q", gotAccept, "application/json")
		}

		fullURL := request.URL.String()
		if strings.Contains(fullURL, testAccessToken) {
			t.Errorf("request URL %q must not contain the access token", fullURL)
		}
		if strings.Contains(fullURL, testClientSecret) {
			t.Errorf("request URL %q must not contain the client secret", fullURL)
		}

		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, "[]")
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	if _, err := client.DiscoverGames(context.Background(), 2026, 6, nil); err != nil {
		t.Fatalf("DiscoverGames returned an unexpected error: %v", err)
	}
}

func TestDiscoverGamesParsesIDsAndBuildsBody(t *testing.T) {
	t.Parallel()

	const discoverFixture = `[
		{"id": 101, "name": "Uno"},
		{"id": 202, "name": "Dos"},
		{"id": 303, "name": "Tres"}
	]`

	requestedPlatforms := []int{167, 130}

	twitchServer := newTwitchServer(t, 3600, nil)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		body := readBody(t, request)

		if !strings.Contains(body, "first_release_date >=") || !strings.Contains(body, "first_release_date <") {
			t.Errorf("APICalypse body %q must filter by the first_release_date window", body)
		}
		if !strings.Contains(body, "platforms = (167,130)") {
			t.Errorf("APICalypse body %q must filter by the requested platforms (167,130)", body)
		}
		if !strings.Contains(body, "version_parent = null") {
			t.Errorf("APICalypse body %q must discard ports with version_parent = null", body)
		}
		if !strings.Contains(body, "sort first_release_date asc") {
			t.Errorf("APICalypse body %q must sort ascending by release date", body)
		}

		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, discoverFixture)
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	gameIDs, err := client.DiscoverGames(context.Background(), 2026, 6, requestedPlatforms)
	if err != nil {
		t.Fatalf("DiscoverGames returned an unexpected error: %v", err)
	}

	wantIDs := []int{101, 202, 303}
	if len(gameIDs) != len(wantIDs) {
		t.Fatalf("DiscoverGames returned %d ids %v, want %d %v", len(gameIDs), gameIDs, len(wantIDs), wantIDs)
	}
	for index, wantID := range wantIDs {
		if gameIDs[index] != wantID {
			t.Errorf("gameIDs[%d] = %d, want %d", index, gameIDs[index], wantID)
		}
	}
}

func TestDiscoverGamesUsesDefaultPlatformsWhenNoneGiven(t *testing.T) {
	t.Parallel()

	twitchServer := newTwitchServer(t, 3600, nil)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		body := readBody(t, request)
		if !strings.Contains(body, "platforms = (6,167)") {
			t.Errorf("APICalypse body %q must use the client default platforms (6,167)", body)
		}
		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, "[]")
	}))
	defer igdbServer.Close()

	client := NewClient(
		testClientID,
		testClientSecret,
		WithBaseURL(igdbServer.URL),
		WithTokenURL(twitchServer.URL),
		WithHTTPClient(igdbServer.Client()),
		WithPlatforms([]int{6, 167}),
	)

	if _, err := client.DiscoverGames(context.Background(), 2026, 6, nil); err != nil {
		t.Fatalf("DiscoverGames returned an unexpected error: %v", err)
	}
}

const gameDetailsFixture = `[
	{
		"id": 7346,
		"name": "The Legend of Zelda: Tears of the Kingdom",
		"summary": "Una aventura épica por Hyrule y los cielos.",
		"first_release_date": 1683849600,
		"cover": {"id": 1, "image_id": "co5vmg"},
		"screenshots": [
			{"id": 11, "image_id": "sc1aaa"},
			{"id": 12, "image_id": "sc1bbb"}
		],
		"genres": [{"id": 31, "name": "Adventure"}, {"id": 12, "name": "Role-playing (RPG)"}],
		"platforms": [
			{"id": 130, "name": "Nintendo Switch", "abbreviation": "Switch"}
		],
		"involved_companies": [
			{"company": {"name": "Nintendo"}, "developer": true, "publisher": false},
			{"company": {"name": "Nintendo of America"}, "developer": false, "publisher": true}
		],
		"age_ratings": [{"category": 1, "rating": 9}],
		"videos": [
			{"name": "Official Trailer", "video_id": "uHGShqcAHlQ"},
			{"name": "Gameplay", "video_id": "kP3UUmsjcms"}
		],
		"aggregated_rating": 96.0,
		"aggregated_rating_count": 120,
		"total_rating": 95.5,
		"collections": [{"id": 106, "name": "The Legend of Zelda"}],
		"game_type": 0,
		"url": "https://www.igdb.com/games/the-legend-of-zelda-tears-of-the-kingdom"
	}
]`

func TestGetGamesParsesSample(t *testing.T) {
	t.Parallel()

	twitchServer := newTwitchServer(t, 3600, nil)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		body := readBody(t, request)
		if !strings.Contains(body, "where id = (7346)") {
			t.Errorf("APICalypse body %q must filter by the requested ids (7346)", body)
		}
		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, gameDetailsFixture)
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	games, err := client.GetGames(context.Background(), []int{7346})
	if err != nil {
		t.Fatalf("GetGames returned an unexpected error: %v", err)
	}
	if len(games) != 1 {
		t.Fatalf("GetGames returned %d games, want 1", len(games))
	}
	game := games[0]

	if game.Name != "The Legend of Zelda: Tears of the Kingdom" {
		t.Errorf("Name = %q, want %q", game.Name, "The Legend of Zelda: Tears of the Kingdom")
	}
	if game.Summary != "Una aventura épica por Hyrule y los cielos." {
		t.Errorf("Summary = %q, want the fixture summary", game.Summary)
	}
	if game.FirstReleaseDate != 1683849600 {
		t.Errorf("FirstReleaseDate = %d, want %d", game.FirstReleaseDate, 1683849600)
	}

	if game.Cover.ImageID != "co5vmg" {
		t.Errorf("Cover.ImageID = %q, want %q", game.Cover.ImageID, "co5vmg")
	}
	if len(game.Screenshots) != 2 || game.Screenshots[0].ImageID != "sc1aaa" {
		t.Errorf("Screenshots = %+v, want first image_id %q", game.Screenshots, "sc1aaa")
	}

	if len(game.Genres) != 2 || game.Genres[0].Name != "Adventure" {
		t.Errorf("Genres = %+v, want first genre %q", game.Genres, "Adventure")
	}

	if len(game.Platforms) != 1 {
		t.Fatalf("Platforms has %d entries, want 1", len(game.Platforms))
	}
	if game.Platforms[0].ID != 130 || game.Platforms[0].Name != "Nintendo Switch" || game.Platforms[0].Abbreviation != "Switch" {
		t.Errorf("Platforms[0] = %+v, want {130, Nintendo Switch, Switch}", game.Platforms[0])
	}

	if len(game.InvolvedCompanies) != 2 {
		t.Fatalf("InvolvedCompanies has %d entries, want 2", len(game.InvolvedCompanies))
	}
	developer := game.InvolvedCompanies[0]
	if developer.Company.Name != "Nintendo" || !developer.Developer || developer.Publisher {
		t.Errorf("InvolvedCompanies[0] = %+v, want Nintendo as developer-only", developer)
	}
	publisher := game.InvolvedCompanies[1]
	if publisher.Company.Name != "Nintendo of America" || publisher.Developer || !publisher.Publisher {
		t.Errorf("InvolvedCompanies[1] = %+v, want Nintendo of America as publisher-only", publisher)
	}

	if len(game.AgeRatings) != 1 || game.AgeRatings[0].Category != 1 || game.AgeRatings[0].Rating != 9 {
		t.Errorf("AgeRatings = %+v, want single {category:1, rating:9}", game.AgeRatings)
	}

	if len(game.Videos) != 2 || game.Videos[0].VideoID != "uHGShqcAHlQ" || game.Videos[0].Name != "Official Trailer" {
		t.Errorf("Videos = %+v, want first {Official Trailer, uHGShqcAHlQ}", game.Videos)
	}

	if game.AggregatedRating != 96.0 {
		t.Errorf("AggregatedRating = %v, want %v", game.AggregatedRating, 96.0)
	}
	if game.AggregatedRatingCount != 120 {
		t.Errorf("AggregatedRatingCount = %d, want %d", game.AggregatedRatingCount, 120)
	}

	if len(game.Collections) != 1 || game.Collections[0].Name != "The Legend of Zelda" {
		t.Errorf("Collections = %+v, want one entry named %q", game.Collections, "The Legend of Zelda")
	}

	if game.GameType != 0 {
		t.Errorf("GameType = %d, want %d", game.GameType, 0)
	}
}

func TestGetGamesEmptyIDsDoesNotHitNetwork(t *testing.T) {
	t.Parallel()

	twitchServer := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		t.Error("token endpoint was called for an empty id list; want no network calls")
	}))
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		t.Error("IGDB endpoint was called for an empty id list; want no network calls")
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	games, err := client.GetGames(context.Background(), nil)
	if err != nil {
		t.Fatalf("GetGames returned an unexpected error: %v", err)
	}
	if games == nil {
		t.Fatal("GetGames returned nil, want a non-nil empty slice")
	}
	if len(games) != 0 {
		t.Errorf("GetGames returned %d games, want 0", len(games))
	}
}

func TestTokenIsRenewedWhenExpired(t *testing.T) {
	t.Parallel()

	var tokenRequests atomic.Int32

	twitchServer := newTwitchServer(t, 1, &tokenRequests)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, _ *http.Request) {
		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, "[]")
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := client.DiscoverGames(ctx, 2026, 6, nil); err != nil {
		t.Fatalf("first DiscoverGames returned an unexpected error: %v", err)
	}
	if _, err := client.DiscoverGames(ctx, 2026, 7, nil); err != nil {
		t.Fatalf("second DiscoverGames returned an unexpected error: %v", err)
	}

	if got := tokenRequests.Load(); got != 2 {
		t.Errorf("Twitch received %d token requests, want 2 (one per query due to expiry)", got)
	}
}

func TestTokenIsReusedWhenStillValid(t *testing.T) {
	t.Parallel()

	var tokenRequests atomic.Int32

	twitchServer := newTwitchServer(t, 3600, &tokenRequests)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, _ *http.Request) {
		responseWriter.WriteHeader(http.StatusOK)
		writeBody(t, responseWriter, "[]")
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	if _, err := client.DiscoverGames(context.Background(), 2026, 6, nil); err != nil {
		t.Fatalf("first DiscoverGames returned an unexpected error: %v", err)
	}
	if _, err := client.DiscoverGames(context.Background(), 2026, 7, nil); err != nil {
		t.Fatalf("second DiscoverGames returned an unexpected error: %v", err)
	}

	if got := tokenRequests.Load(); got != 1 {
		t.Errorf("Twitch received %d token requests, want 1 (the token is cached while valid)", got)
	}
}

func TestDoQueryReturnsErrorOnNon2xx(t *testing.T) {
	t.Parallel()

	twitchServer := newTwitchServer(t, 3600, nil)
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, _ *http.Request) {
		responseWriter.WriteHeader(http.StatusInternalServerError)
		writeBody(t, responseWriter, `{"title":"Internal Server Error"}`)
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	_, err := client.DiscoverGames(context.Background(), 2026, 6, nil)
	if err == nil {
		t.Fatal("DiscoverGames returned nil error, want an error for HTTP 500")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("error %q, want it to mention status 500", err.Error())
	}
	if strings.Contains(err.Error(), testAccessToken) {
		t.Errorf("error %q must not contain the access token", err.Error())
	}
	if strings.Contains(err.Error(), testClientSecret) {
		t.Errorf("error %q must not contain the client secret", err.Error())
	}
}

func TestEnsureTokenReturnsErrorOnTwitchFailure(t *testing.T) {
	t.Parallel()

	twitchServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, _ *http.Request) {
		responseWriter.WriteHeader(http.StatusUnauthorized)
		writeBody(t, responseWriter, `{"status":401,"message":"invalid client"}`)
	}))
	defer twitchServer.Close()

	igdbServer := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		t.Error("IGDB endpoint was called even though the token exchange failed; want no IGDB call")
	}))
	defer igdbServer.Close()

	client := newTestClient(igdbServer, twitchServer)

	_, err := client.DiscoverGames(context.Background(), 2026, 6, nil)
	if err == nil {
		t.Fatal("DiscoverGames returned nil error, want an error when the token exchange fails")
	}
	if !strings.Contains(err.Error(), "401") {
		t.Errorf("error %q, want it to mention status 401", err.Error())
	}
	if strings.Contains(err.Error(), testClientSecret) {
		t.Errorf("error %q must not contain the client secret", err.Error())
	}
}

func TestBuildImageURL(t *testing.T) {
	t.Parallel()

	client := NewClient(testClientID, testClientSecret)

	gotURL := client.BuildImageURL("co5vmg", ImageSizeCoverBig)
	wantURL := ImageBaseURL + "t_" + ImageSizeCoverBig + "/" + "co5vmg" + ".jpg"
	if gotURL != wantURL {
		t.Errorf("BuildImageURL(%q, %q) = %q, want %q", "co5vmg", ImageSizeCoverBig, gotURL, wantURL)
	}

	if emptyURL := client.BuildImageURL("", ImageSizeCoverBig); emptyURL != "" {
		t.Errorf("BuildImageURL(\"\", %q) = %q, want empty string", ImageSizeCoverBig, emptyURL)
	}
}

func readBody(t *testing.T, request *http.Request) string {
	t.Helper()
	bodyBytes, err := io.ReadAll(request.Body)
	_ = request.Body.Close()
	if err != nil {
		t.Fatalf("failed to read request body: %v", err)
	}
	return string(bodyBytes)
}
