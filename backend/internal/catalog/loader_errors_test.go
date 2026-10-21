package catalog

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	gamesv1 "btb/gen/btb/games/v1"
)

func writeTempSeed(t *testing.T, content string) string {
	t.Helper()

	seedPath := filepath.Join(t.TempDir(), "seed.json")
	if err := os.WriteFile(seedPath, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write temporary seed file: %v", err)
	}
	return seedPath
}

func TestLoadSeedErrors(t *testing.T) {
	t.Parallel()

	type errorCase struct {
		name              string
		seedContent       string
		useNonexistent    bool
		wantErrorContains string
	}

	cases := []errorCase{
		{
			name:           "nonexistent file is rejected",
			useNonexistent: true,
		},
		{
			name:        "malformed json is rejected",
			seedContent: `{"games": [ {"id": "x"`,
		},
		{
			name:              "empty games list is rejected",
			seedContent:       `{"games": []}`,
			wantErrorContains: "no games",
		},
		{
			name:              "game with empty id is rejected",
			seedContent:       `{"games": [ {"id": "", "title": "T", "releaseDate": "2026-06-01"} ]}`,
			wantErrorContains: "empty id",
		},
		{
			name:              "game with empty title is rejected",
			seedContent:       `{"games": [ {"id": "a", "title": "", "releaseDate": "2026-06-01"} ]}`,
			wantErrorContains: "empty title",
		},
		{
			name:              "game with empty release_date is rejected",
			seedContent:       `{"games": [ {"id": "a", "title": "T", "releaseDate": ""} ]}`,
			wantErrorContains: "empty release_date",
		},
		{
			name:              "malformed release_date is rejected mentioning the game id",
			seedContent:       `{"games": [ {"id": "game-bad-date", "title": "T", "releaseDate": "2026-6-15"} ]}`,
			wantErrorContains: "game-bad-date",
		},
		{
			name: "duplicate game id is rejected",
			seedContent: `{"games": [
				{"id": "dup", "title": "Primero", "releaseDate": "2026-06-01"},
				{"id": "dup", "title": "Segundo", "releaseDate": "2026-06-02"}
			]}`,
			wantErrorContains: "duplicate",
		},
		{
			name:              "unknown field is rejected (DiscardUnknown is false)",
			seedContent:       `{"games": [ {"id": "a", "title": "T", "releaseDate": "2026-06-01", "featured": true} ]}`,
			wantErrorContains: "featured",
		},
	}

	for _, errorCaseEntry := range cases {
		t.Run(errorCaseEntry.name, func(t *testing.T) {
			t.Parallel()

			path := filepath.Join(t.TempDir(), "does-not-exist.json")
			if !errorCaseEntry.useNonexistent {
				path = writeTempSeed(t, errorCaseEntry.seedContent)
			}

			_, err := LoadSeed(path)
			if err == nil {
				t.Fatalf("LoadSeed expected an error for %q, got nil", errorCaseEntry.name)
			}

			if errorCaseEntry.wantErrorContains != "" &&
				!strings.Contains(err.Error(), errorCaseEntry.wantErrorContains) {
				t.Errorf(
					"LoadSeed error = %q, want it to contain %q",
					err.Error(), errorCaseEntry.wantErrorContains,
				)
			}
		})
	}
}

func TestValidateGames(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		games []*gamesv1.Game
		wantErrorContains string
		wantError         bool
	}{
		{
			name:              "empty list is rejected",
			games:             []*gamesv1.Game{},
			wantError:         true,
			wantErrorContains: "no games",
		},
		{
			name: "duplicate id is rejected mentioning both positions",
			games: []*gamesv1.Game{
				{Id: "dup", Title: "Primero", ReleaseDate: "2026-06-01"},
				{Id: "dup", Title: "Segundo", ReleaseDate: "2026-06-02"},
			},
			wantError:         true,
			wantErrorContains: "duplicate",
		},
		{
			name: "malformed release_date is rejected mentioning the game id",
			games: []*gamesv1.Game{
				{Id: "ok-game", Title: "Sano", ReleaseDate: "2026-06-01"},
				{Id: "bad-date-game", Title: "Roto", ReleaseDate: "2026-6-15"},
			},
			wantError:         true,
			wantErrorContains: "bad-date-game",
		},
		{
			name: "fully valid list is accepted",
			games: []*gamesv1.Game{
				{Id: "game-a", Title: "Alfa", ReleaseDate: "2026-06-05"},
				{Id: "game-b", Title: "Bravo", ReleaseDate: "2026-07-12"},
			},
			wantError: false,
		},
	}

	for _, validateCase := range cases {
		t.Run(validateCase.name, func(t *testing.T) {
			t.Parallel()

			err := ValidateGames(validateCase.games)
			if validateCase.wantError {
				if err == nil {
					t.Fatalf("ValidateGames expected an error for %q, got nil", validateCase.name)
				}
				if validateCase.wantErrorContains != "" &&
					!strings.Contains(err.Error(), validateCase.wantErrorContains) {
					t.Errorf(
						"ValidateGames error = %q, want it to contain %q",
						err.Error(), validateCase.wantErrorContains,
					)
				}
				return
			}
			if err != nil {
				t.Fatalf("ValidateGames expected no error, got %v", err)
			}
		})
	}
}
