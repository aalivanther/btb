package catalog

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	gamesv1 "btb/gen/btb/games/v1"
)

const minSeedGames = 3

const validSeedJSON = `{
  "games": [
    {
      "id": "god-of-war-ragnarok-igdb-119171",
      "kind": "GAME_KIND_GAME",
      "platform": "PLATFORM_PLAYSTATION",
      "title": "God of War Ragnarök",
      "overview": "Kratos y Atreus emprenden un viaje mítico a través de los Nueve Reinos.",
      "releaseDate": "2026-05-08",
      "coverUrl": "https://picsum.photos/seed/gowr-cover/600/900",
      "heroImageUrl": "https://picsum.photos/seed/gowr-hero/1280/720",
      "genres": ["Acción", "Aventura"],
      "primaryLanguage": "Inglés",
      "audioLanguages": ["Inglés", "Español (Latinoamérica)"],
      "trailerYoutubeKey": "abc123",
      "complementaryYoutubeKey": "def456",
      "images": [
        { "url": "https://picsum.photos/seed/gowr-shot1/1280/720", "label": "Gameplay 01" }
      ],
      "ratings": { "critic": 9.4, "metacritic": "94", "opencritic": "93", "steam": "" },
      "availability": {
        "platforms": ["PS5", "PS4", "PC"],
        "storefronts": ["PS Store", "Steam"],
        "subscriptionServices": ["PS Plus"],
        "dubLanguages": ["Español (Latinoamérica)", "Inglés"],
        "subLanguages": ["Español (Latinoamérica)", "Inglés", "Portugués"]
      },
      "franchise": {
        "name": "God of War",
        "items": [
          { "title": "God of War (2018)", "year": "2018", "posterUrl": "https://picsum.photos/seed/gow-2018/600/900", "overview": "El reinicio nórdico de la saga.", "backdropUrl": "https://picsum.photos/seed/gow-2018-b/1280/720", "rating": 9.4, "extra": "" }
        ]
      },
      "developers": [{ "name": "Santa Monica Studio", "role": "Desarrollo", "photoUrl": "" }],
      "publishers": [{ "name": "Sony Interactive Entertainment", "role": "Distribuidora", "photoUrl": "" }],
      "voiceCast": [{ "name": "Christopher Judge", "role": "Kratos", "photoUrl": "" }],
      "ageRating": "ESRB M / PEGI 18",
      "playtimeEstimate": "~26 h",
      "freeToPlay": false,
      "earlyAccess": false,
      "multiplayer": false
    },
    {
      "id": "halo-infinite-igdb-9847",
      "kind": "GAME_KIND_GAME",
      "platform": "PLATFORM_XBOX",
      "title": "Halo Infinite",
      "overview": "El Jefe Maestro regresa para enfrentar al Desterrado en el anillo Zeta Halo.",
      "releaseDate": "2026-05-15",
      "coverUrl": "https://picsum.photos/seed/halo-cover/600/900",
      "heroImageUrl": "https://picsum.photos/seed/halo-hero/1280/720",
      "genres": ["Shooter", "Acción"],
      "primaryLanguage": "Inglés",
      "audioLanguages": ["Inglés", "Español (Latinoamérica)"],
      "ratings": { "critic": 8.3, "metacritic": "83", "opencritic": "84", "steam": "Mayormente positivas (78%)" },
      "availability": {
        "platforms": ["Xbox Series X|S", "Xbox One", "PC"],
        "storefronts": ["Microsoft Store", "Steam"],
        "subscriptionServices": ["Game Pass"],
        "dubLanguages": ["Inglés"],
        "subLanguages": ["Español (Latinoamérica)", "Inglés"]
      },
      "developers": [{ "name": "343 Industries", "role": "Desarrollo", "photoUrl": "" }],
      "publishers": [{ "name": "Xbox Game Studios", "role": "Distribuidora", "photoUrl": "" }],
      "ageRating": "ESRB M / PEGI 16",
      "playtimeEstimate": "~12 h",
      "freeToPlay": false,
      "earlyAccess": false,
      "multiplayer": true
    },
    {
      "id": "hades-ii-igdb-200000",
      "kind": "GAME_KIND_GAME",
      "platform": "PLATFORM_PC",
      "title": "Hades II",
      "overview": "La princesa Melinoë desafía al Titán del Tiempo en una nueva odisea del inframundo.",
      "releaseDate": "2026-05-20",
      "coverUrl": "https://picsum.photos/seed/hades2-cover/600/900",
      "heroImageUrl": "https://picsum.photos/seed/hades2-hero/1280/720",
      "genres": ["Acción", "Roguelike"],
      "primaryLanguage": "Inglés",
      "audioLanguages": ["Inglés"],
      "ratings": { "critic": 9.0, "metacritic": "", "opencritic": "90", "steam": "Extremadamente positivas (96%)" },
      "availability": {
        "platforms": ["PC"],
        "storefronts": ["Steam", "Epic Games Store"],
        "subscriptionServices": [],
        "dubLanguages": ["Inglés"],
        "subLanguages": ["Español (Latinoamérica)", "Inglés"]
      },
      "developers": [{ "name": "Supergiant Games", "role": "Desarrollo", "photoUrl": "" }],
      "publishers": [{ "name": "Supergiant Games", "role": "Distribuidora", "photoUrl": "" }],
      "ageRating": "ESRB T / PEGI 12",
      "playtimeEstimate": "~30 h",
      "freeToPlay": false,
      "earlyAccess": true,
      "multiplayer": false
    }
  ]
}`

func serveSeedToTempFile(t *testing.T, content string) string {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, _ *http.Request) {
		responseWriter.WriteHeader(http.StatusOK)
		if _, err := responseWriter.Write([]byte(content)); err != nil {
			t.Errorf("test server failed to write seed body: %v", err)
		}
	}))
	t.Cleanup(server.Close)

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatalf("failed to fetch seed from the local test server: %v", err)
	}
	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			t.Errorf("failed to close the test server response body: %v", closeErr)
		}
	}()

	downloadedBytes, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("failed to read the seed body from the local test server: %v", err)
	}

	seedPath := filepath.Join(t.TempDir(), "seed.json")
	if err := os.WriteFile(seedPath, downloadedBytes, 0o600); err != nil {
		t.Fatalf("failed to write the temporary seed file: %v", err)
	}
	return seedPath
}

func loadTempSeed(t *testing.T, content string) []*gamesv1.Game {
	t.Helper()

	seedPath := serveSeedToTempFile(t, content)

	games, err := LoadSeed(seedPath)
	if err != nil {
		t.Fatalf("LoadSeed(%q) returned an unexpected error: %v", seedPath, err)
	}
	return games
}

func TestLoadSeedValid(t *testing.T) {
	t.Parallel()

	games := loadTempSeed(t, validSeedJSON)

	if len(games) < minSeedGames {
		t.Fatalf("loaded seed has %d games, want at least %d", len(games), minSeedGames)
	}

	for index, game := range games {
		if game.GetId() == "" {
			t.Errorf("game at index %d has an empty id", index)
		}
		if game.GetTitle() == "" {
			t.Errorf("game at index %d (id %q) has an empty title", index, game.GetId())
		}
		if game.GetReleaseDate() == "" {
			t.Errorf("game at index %d (id %q) has an empty release_date", index, game.GetId())
		}
	}

	firstGame := games[0]
	if got := firstGame.GetKind(); got != gamesv1.GameKind_GAME_KIND_GAME {
		t.Errorf("first game kind = %v, want %v", got, gamesv1.GameKind_GAME_KIND_GAME)
	}
	if got := firstGame.GetPlatform(); got != gamesv1.Platform_PLATFORM_PLAYSTATION {
		t.Errorf("first game platform = %v, want %v", got, gamesv1.Platform_PLATFORM_PLAYSTATION)
	}

	if got := firstGame.GetRatings().GetCritic(); got != 9.4 {
		t.Errorf("first game critic rating = %v, want %v", got, 9.4)
	}
	if got := firstGame.GetAvailability().GetPlatforms(); len(got) == 0 {
		t.Errorf("first game availability platforms are empty, want the nested list to be parsed")
	}
	if got := firstGame.GetFranchise().GetName(); got != "God of War" {
		t.Errorf("first game franchise name = %q, want %q", got, "God of War")
	}

	store := NewStore(games)
	for _, game := range games {
		gotGame, found := store.Get(game.GetId())
		if !found {
			t.Errorf("store could not find game with id %q after indexing", game.GetId())
			continue
		}
		if gotGame.GetId() != game.GetId() {
			t.Errorf("store returned id %q for lookup of %q", gotGame.GetId(), game.GetId())
		}
	}
}
