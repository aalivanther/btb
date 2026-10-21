package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/internal/providers/igdb"
	"btb/internal/providers/steam"
)

type CuratedFile struct {
	Curated []CuratedEntry `json:"curated"`
}

type CuratedEntry struct {
	IgdbID int `json:"igdbId"`
	Platform string `json:"platform"`
	Kind string `json:"kind"`
	ReleaseDate string `json:"releaseDate"`
	Platforms []string `json:"platforms"`
	Genres []string `json:"genres"`
	Title string `json:"title"`
}

func loadCurated(path string) ([]CuratedEntry, error) {
	bytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read curated file %q: %w", path, err)
	}
	file := &CuratedFile{}
	if err := json.Unmarshal(bytes, file); err != nil {
		return nil, fmt.Errorf("failed to parse curated file %q: %w", path, err)
	}
	return file.Curated, nil
}

func parseCuratedPlatform(raw string) gamesv1.Platform {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "PLAYSTATION", "PS", "SONY":
		return gamesv1.Platform_PLATFORM_PLAYSTATION
	case "XBOX", "MICROSOFT":
		return gamesv1.Platform_PLATFORM_XBOX
	case "NINTENDO", "SWITCH":
		return gamesv1.Platform_PLATFORM_NINTENDO
	case "PC", "STEAM":
		return gamesv1.Platform_PLATFORM_PC
	default:
		return gamesv1.Platform_PLATFORM_UNSPECIFIED
	}
}

func parseCuratedKind(raw string) gamesv1.GameKind {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "GAME", "JUEGO", "BASE":
		return gamesv1.GameKind_GAME_KIND_GAME
	case "DLC", "ADDON", "ADD-ON":
		return gamesv1.GameKind_GAME_KIND_DLC
	case "EXPANSION", "EXPANSIÓN":
		return gamesv1.GameKind_GAME_KIND_EXPANSION
	default:
		return gamesv1.GameKind_GAME_KIND_UNSPECIFIED
	}
}

func resolveCuratedGame(
	ctx context.Context,
	client *igdb.Client,
	steamClient *steam.Client,
	logger *slog.Logger,
	entry CuratedEntry,
) (*gamesv1.Game, bool) {
	if entry.IgdbID <= 0 {
		logger.Warn("curated: invalid igdbId, skipping", slog.Int("igdb_id", entry.IgdbID))
		return nil, false
	}

	games, err := client.GetGames(ctx, []int{entry.IgdbID})
	if err != nil {
		logger.Warn("curated: igdb lookup failed, skipping",
			slog.Int("igdb_id", entry.IgdbID), slog.String("error", err.Error()))
		return nil, false
	}

	if len(games) == 0 {
		logger.Warn("curated: no IGDB match for igdbId, skipping (not found upstream)",
			slog.Int("igdb_id", entry.IgdbID))
		return nil, false
	}

	upstream := games[0]
	game := igdb.MapGameToGame(&upstream, parseCuratedPlatform(entry.Platform))
	enrichPcSpecs(ctx, steamClient, &upstream, game, logger)
	return game, true
}

func applyCuratedOverrides(game *gamesv1.Game, entry CuratedEntry) {
	if entry.Title != "" {
		game.Title = entry.Title
	}
	if platform := parseCuratedPlatform(entry.Platform); platform != gamesv1.Platform_PLATFORM_UNSPECIFIED {
		game.Platform = platform
	}
	if kind := parseCuratedKind(entry.Kind); kind != gamesv1.GameKind_GAME_KIND_UNSPECIFIED {
		game.Kind = kind
	}
	if entry.ReleaseDate != "" {
		game.ReleaseDate = entry.ReleaseDate
	}
	if len(entry.Genres) > 0 {
		game.Genres = entry.Genres
	}
	if len(entry.Platforms) > 0 {
		if game.Availability == nil {
			game.Availability = &gamesv1.GameAvailability{}
		}
		game.Availability.Platforms = entry.Platforms
	}
}

func processCurated(
	ctx context.Context,
	client *igdb.Client,
	steamClient *steam.Client,
	logger *slog.Logger,
	entries []CuratedEntry,
	seenGameIDs map[string]bool,
) []*gamesv1.Game {
	curatedGames := make([]*gamesv1.Game, 0, len(entries))

	for _, entry := range entries {
		game, ok := resolveCuratedGame(ctx, client, steamClient, logger, entry)
		if !ok {
			continue
		}

		applyCuratedOverrides(game, entry)

		if seenGameIDs[game.GetId()] {
			logger.Info("curated: already present from discover, skipping", slog.String("game_id", game.GetId()))
			continue
		}
		seenGameIDs[game.GetId()] = true

		logger.Info("curated: added",
			slog.String("title", game.GetTitle()),
			slog.String("platform", game.GetPlatform().String()),
			slog.String("kind", game.GetKind().String()),
			slog.String("date", game.GetReleaseDate()))
		curatedGames = append(curatedGames, game)
	}

	return curatedGames
}
