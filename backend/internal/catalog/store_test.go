package catalog

import (
	"testing"

	gamesv1 "btb/gen/btb/games/v1"
)

func newFilterGames() []*gamesv1.Game {
	return []*gamesv1.Game{
		{
			Id:          "game-a",
			Kind:        gamesv1.GameKind_GAME_KIND_GAME,
			Platform:    gamesv1.Platform_PLATFORM_PLAYSTATION,
			Title:       "Alfa",
			ReleaseDate: "2026-06-05",
		},
		{
			Id:          "game-b",
			Kind:        gamesv1.GameKind_GAME_KIND_DLC,
			Platform:    gamesv1.Platform_PLATFORM_XBOX,
			Title:       "Bravo",
			ReleaseDate: "2026-06-12",
		},
		{
			Id:          "game-c",
			Kind:        gamesv1.GameKind_GAME_KIND_EXPANSION,
			Platform:    gamesv1.Platform_PLATFORM_PC,
			Title:       "Charlie",
			ReleaseDate: "2026-06-20",
		},
		{
			Id:          "game-d",
			Kind:        gamesv1.GameKind_GAME_KIND_GAME,
			Platform:    gamesv1.Platform_PLATFORM_PLAYSTATION,
			Title:       "Delta",
			ReleaseDate: "2026-06-28",
		},
		{
			Id:          "game-e",
			Kind:        gamesv1.GameKind_GAME_KIND_GAME,
			Platform:    gamesv1.Platform_PLATFORM_NINTENDO,
			Title:       "Echo",
			ReleaseDate: "2026-07-03",
		},
	}
}

func idsOf(games []*gamesv1.Game) []string {
	ids := make([]string, 0, len(games))
	for _, game := range games {
		ids = append(ids, game.GetId())
	}
	return ids
}

func equalStrings(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for index := range got {
		if got[index] != want[index] {
			return false
		}
	}
	return true
}

func TestStoreListFiltersByPeriodAndOptionalCriteria(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name      string
		year      int32
		month     int32
		kinds     []gamesv1.GameKind
		platforms []gamesv1.Platform
		wantIDs   []string
	}

	cases := []testCase{
		{
			name:    "june 2026 without filters returns all four sorted by date",
			year:    2026,
			month:   6,
			wantIDs: []string{"game-a", "game-b", "game-c", "game-d"},
		},
		{
			name:    "june 2026 filtered by kind GAME returns only full games",
			year:    2026,
			month:   6,
			kinds:   []gamesv1.GameKind{gamesv1.GameKind_GAME_KIND_GAME},
			wantIDs: []string{"game-a", "game-d"},
		},
		{
			name:  "june 2026 filtered by DLC and EXPANSION returns both add-ons",
			year:  2026,
			month: 6,
			kinds: []gamesv1.GameKind{
				gamesv1.GameKind_GAME_KIND_DLC,
				gamesv1.GameKind_GAME_KIND_EXPANSION,
			},
			wantIDs: []string{"game-b", "game-c"},
		},
		{
			name:      "june 2026 filtered by platform PLAYSTATION returns only those titles",
			year:      2026,
			month:     6,
			platforms: []gamesv1.Platform{gamesv1.Platform_PLATFORM_PLAYSTATION},
			wantIDs:   []string{"game-a", "game-d"},
		},
		{
			name:  "june 2026 filtered by XBOX and PC returns both platforms",
			year:  2026,
			month: 6,
			platforms: []gamesv1.Platform{
				gamesv1.Platform_PLATFORM_XBOX,
				gamesv1.Platform_PLATFORM_PC,
			},
			wantIDs: []string{"game-b", "game-c"},
		},
		{
			name:      "june 2026 filtered by kind GAME and platform PLAYSTATION returns the intersection",
			year:      2026,
			month:     6,
			kinds:     []gamesv1.GameKind{gamesv1.GameKind_GAME_KIND_GAME},
			platforms: []gamesv1.Platform{gamesv1.Platform_PLATFORM_PLAYSTATION},
			wantIDs:   []string{"game-a", "game-d"},
		},
		{
			name:      "june 2026 with empty filter slices behaves like no filter",
			year:      2026,
			month:     6,
			kinds:     []gamesv1.GameKind{},
			platforms: []gamesv1.Platform{},
			wantIDs:   []string{"game-a", "game-b", "game-c", "game-d"},
		},
		{
			name:    "july 2026 returns only the july release and excludes june",
			year:    2026,
			month:   7,
			wantIDs: []string{"game-e"},
		},
		{
			name:    "month without releases returns an empty list",
			year:    2026,
			month:   3,
			wantIDs: []string{},
		},
	}

	store := NewStore(newFilterGames())

	for _, testCaseEntry := range cases {
		t.Run(testCaseEntry.name, func(t *testing.T) {
			t.Parallel()

			got := idsOf(store.List(
				testCaseEntry.year,
				testCaseEntry.month,
				testCaseEntry.kinds,
				testCaseEntry.platforms,
			))

			if !equalStrings(got, testCaseEntry.wantIDs) {
				t.Errorf("List(%d, %d) ids = %v, want %v",
					testCaseEntry.year, testCaseEntry.month, got, testCaseEntry.wantIDs)
			}
		})
	}
}

func TestStoreListSkipsMalformedDates(t *testing.T) {
	t.Parallel()

	games := []*gamesv1.Game{
		{Id: "valid-june", Title: "Válido", ReleaseDate: "2026-06-15"},
		{Id: "empty-date", Title: "Sin fecha", ReleaseDate: ""},
		{Id: "bad-day", Title: "Día absurdo", ReleaseDate: "2026-06-99"},
		{Id: "bad-month", Title: "Mes absurdo", ReleaseDate: "2026-13-01"},
		{Id: "signed-year", Title: "Año con signo", ReleaseDate: "+026-06-15"},
		{Id: "bad-format", Title: "Formato raro", ReleaseDate: "15/06/2026"},
	}

	store := NewStore(games)

	got := store.List(2026, 6, nil, nil)

	if len(got) != 1 {
		t.Fatalf("List(2026, 6) returned %d games, want exactly 1 (only the valid date)", len(got))
	}
	if got[0].GetId() != "valid-june" {
		t.Errorf("List(2026, 6) returned id %q, want %q", got[0].GetId(), "valid-june")
	}
}

func TestStoreListSortsByDateThenTitle(t *testing.T) {
	t.Parallel()

	games := []*gamesv1.Game{
		{Id: "z-same-day", Title: "Zorro", ReleaseDate: "2026-06-10"},
		{Id: "b-same-day", Title: "Bravo", ReleaseDate: "2026-06-10"},
		{Id: "early", Title: "Alfa", ReleaseDate: "2026-06-01"},
	}

	store := NewStore(games)
	got := idsOf(store.List(2026, 6, nil, nil))

	wantOrder := []string{"early", "b-same-day", "z-same-day"}
	if !equalStrings(got, wantOrder) {
		t.Fatalf("List ids = %v, want %v", got, wantOrder)
	}
}

func TestStoreGet(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name      string
		id        string
		wantFound bool
		wantID    string
	}

	cases := []testCase{
		{
			name:      "existing id is found",
			id:        "game-a",
			wantFound: true,
			wantID:    "game-a",
		},
		{
			name:      "another existing id is found",
			id:        "game-c",
			wantFound: true,
			wantID:    "game-c",
		},
		{
			name:      "missing id is not found",
			id:        "does-not-exist",
			wantFound: false,
		},
		{
			name:      "empty id is not found",
			id:        "",
			wantFound: false,
		},
	}

	store := NewStore(newFilterGames())

	for _, testCaseEntry := range cases {
		t.Run(testCaseEntry.name, func(t *testing.T) {
			t.Parallel()

			game, found := store.Get(testCaseEntry.id)

			if found != testCaseEntry.wantFound {
				t.Fatalf("Get(%q) found = %t, want %t", testCaseEntry.id, found, testCaseEntry.wantFound)
			}

			if !testCaseEntry.wantFound {
				if game != nil {
					t.Errorf("Get(%q) returned a non-nil game on a not-found lookup", testCaseEntry.id)
				}
				return
			}

			if game == nil {
				t.Fatalf("Get(%q) returned a nil game on a found lookup", testCaseEntry.id)
			}
			if got := game.GetId(); got != testCaseEntry.wantID {
				t.Errorf("Get(%q) returned id %q, want %q", testCaseEntry.id, got, testCaseEntry.wantID)
			}
		})
	}
}
