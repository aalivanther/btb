package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/internal/catalog"
)

func TestParseMonthsRangeFormatAndDedup(t *testing.T) {
	t.Parallel()

	months, err := parseMonths("6,7")
	if err != nil {
		t.Fatalf("parseMonths(\"6,7\") returned an unexpected error: %v", err)
	}
	if len(months) != 2 || months[0] != 6 || months[1] != 7 {
		t.Errorf("parseMonths(\"6,7\") = %v, want [6 7]", months)
	}

	deduped, err := parseMonths("6,6,7,7")
	if err != nil {
		t.Fatalf("parseMonths(\"6,6,7,7\") returned an unexpected error: %v", err)
	}
	if len(deduped) != 2 || deduped[0] != 6 || deduped[1] != 7 {
		t.Errorf("parseMonths(\"6,6,7,7\") = %v, want [6 7] (deduplicated)", deduped)
	}

	spaced, err := parseMonths(" 6 , 7 ")
	if err != nil {
		t.Fatalf("parseMonths(\" 6 , 7 \") returned an unexpected error: %v", err)
	}
	if len(spaced) != 2 || spaced[0] != 6 || spaced[1] != 7 {
		t.Errorf("parseMonths(\" 6 , 7 \") = %v, want [6 7]", spaced)
	}

	errorCases := []string{
		"6,,7",
		"6,abc",
		"0",
		"13",
	}
	for _, raw := range errorCases {
		if _, err := parseMonths(raw); err == nil {
			t.Errorf("parseMonths(%q) returned nil error, want an error", raw)
		}
	}
}

func TestGuardCuratedSeedPath(t *testing.T) {
	t.Parallel()

	if err := guardCuratedSeedPath(curatedSeedPath, false); err == nil {
		t.Errorf("guardCuratedSeedPath(%q, false) = nil, want an error", curatedSeedPath)
	}

	for _, variant := range []string{"seed/./seed.json", "seed//seed.json"} {
		if err := guardCuratedSeedPath(variant, false); err == nil {
			t.Errorf("guardCuratedSeedPath(%q, false) = nil, want an error (normalized path)", variant)
		}
	}

	if err := guardCuratedSeedPath(curatedSeedPath, true); err != nil {
		t.Errorf("guardCuratedSeedPath(%q, true) = %v, want nil (force overrides)", curatedSeedPath, err)
	}

	if err := guardCuratedSeedPath(defaultOutputPath, false); err != nil {
		t.Errorf("guardCuratedSeedPath(%q, false) = %v, want nil (scratch path)", defaultOutputPath, err)
	}
}

func TestWriteSeedFile(t *testing.T) {
	t.Parallel()

	games := []*gamesv1.Game{
		{
			Id:          "hollow-knight-silksong-igdb-1",
			Kind:        gamesv1.GameKind_GAME_KIND_GAME,
			Platform:    gamesv1.Platform_PLATFORM_NINTENDO,
			Title:       "Hollow Knight: Silksong",
			ReleaseDate: "2026-06-15",
		},
		{
			Id:          "ghost-of-yotei-igdb-2",
			Kind:        gamesv1.GameKind_GAME_KIND_GAME,
			Platform:    gamesv1.Platform_PLATFORM_PLAYSTATION,
			Title:       "Ghost of Yōtei",
			ReleaseDate: "2026-07-03",
		},
	}

	outputPath := filepath.Join(t.TempDir(), "seed.generated.json")
	if err := writeSeedFile(outputPath, games); err != nil {
		t.Fatalf("writeSeedFile returned an unexpected error: %v", err)
	}

	rawBytes, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("failed to read back the seed file: %v", err)
	}

	var decoded map[string]json.RawMessage
	if err := json.Unmarshal(rawBytes, &decoded); err != nil {
		t.Fatalf("seed file is not valid JSON: %v", err)
	}

	gamesRaw, ok := decoded["games"]
	if !ok {
		t.Fatalf("seed JSON has no \"games\" key; got keys %v", keysOf(decoded))
	}

	var decodedGames []map[string]any
	if err := json.Unmarshal(gamesRaw, &decodedGames); err != nil {
		t.Fatalf("\"games\" is not a JSON array: %v", err)
	}
	if len(decodedGames) != 2 {
		t.Fatalf("seed has %d games, want 2", len(decodedGames))
	}
	if decodedGames[0]["title"] != "Hollow Knight: Silksong" {
		t.Errorf("games[0].title = %v, want %q", decodedGames[0]["title"], "Hollow Knight: Silksong")
	}
	if decodedGames[0]["releaseDate"] != "2026-06-15" {
		t.Errorf("games[0].releaseDate = %v, want %q", decodedGames[0]["releaseDate"], "2026-06-15")
	}
	if decodedGames[0]["kind"] != "GAME_KIND_GAME" {
		t.Errorf("games[0].kind = %v, want %q", decodedGames[0]["kind"], "GAME_KIND_GAME")
	}
	if decodedGames[1]["platform"] != "PLATFORM_PLAYSTATION" {
		t.Errorf("games[1].platform = %v, want %q", decodedGames[1]["platform"], "PLATFORM_PLAYSTATION")
	}

	reloaded, err := catalog.LoadSeed(outputPath)
	if err != nil {
		t.Fatalf("catalog.LoadSeed(%q) returned an unexpected error: %v", outputPath, err)
	}
	if len(reloaded) != len(games) {
		t.Fatalf("reloaded %d games, want %d", len(reloaded), len(games))
	}
	if reloaded[0].GetId() != games[0].GetId() {
		t.Errorf("reloaded[0].id = %q, want %q", reloaded[0].GetId(), games[0].GetId())
	}
	if reloaded[0].GetTitle() != games[0].GetTitle() {
		t.Errorf("reloaded[0].title = %q, want %q", reloaded[0].GetTitle(), games[0].GetTitle())
	}
	if reloaded[0].GetReleaseDate() != games[0].GetReleaseDate() {
		t.Errorf("reloaded[0].releaseDate = %q, want %q", reloaded[0].GetReleaseDate(), games[0].GetReleaseDate())
	}
	if reloaded[0].GetKind() != games[0].GetKind() {
		t.Errorf("reloaded[0].kind = %v, want %v", reloaded[0].GetKind(), games[0].GetKind())
	}
	if reloaded[1].GetPlatform() != games[1].GetPlatform() {
		t.Errorf("reloaded[1].platform = %v, want %v", reloaded[1].GetPlatform(), games[1].GetPlatform())
	}
}

func keysOf(m map[string]json.RawMessage) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	return keys
}
