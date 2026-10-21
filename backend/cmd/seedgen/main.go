package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/encoding/protojson"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/internal/catalog"
	"btb/internal/providers/igdb"
	"btb/internal/providers/steam"
)

func enrichPcSpecs(
	ctx context.Context,
	steamClient *steam.Client,
	raw *igdb.RawGame,
	game *gamesv1.Game,
	logger *slog.Logger,
) {
	appID, ok := raw.SteamAppID()
	if !ok {
		return
	}
	minimum, recommended, has, err := steamClient.FetchSpecs(ctx, appID)
	if err != nil {
		logger.Warn("steam: pc specs lookup failed", slog.Int("appid", appID), slog.String("error", err.Error()))
		return
	}
	if !has {
		return
	}
	game.PcMinimum = toPcSpec(minimum)
	game.PcRecommended = toPcSpec(recommended)
}

func toPcSpec(spec steam.PcSpec) *gamesv1.PcSpec {
	if spec.OS == "" && spec.Processor == "" && spec.Memory == "" && spec.Graphics == "" && spec.Storage == "" {
		return nil
	}
	return &gamesv1.PcSpec{
		Os:        spec.OS,
		Processor: spec.Processor,
		Memory:    spec.Memory,
		Graphics:  spec.Graphics,
		Storage:   spec.Storage,
	}
}

const defaultOutputPath = "seed/seed.generated.json"

const curatedSeedPath = "seed/seed.json"

const defaultYear = 2026

const defaultMonths = "10,11,12"

const defaultPlatforms = "167,169,130,508,6"

const jsonIndent = "  "

const outputFilePermissions = 0o644

const generationTimeout = 20 * time.Minute

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "seedgen: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	outputPath := flag.String("out", defaultOutputPath, "ruta del archivo de salida del seed (JSON)")
	year := flag.Int("year", defaultYear, "año de los lanzamientos a generar")
	monthsRaw := flag.String("months", defaultMonths, "meses a generar, separados por comas (ej. \"10,11,12\")")
	platformsRaw := flag.String("platforms", defaultPlatforms, "IDs de plataforma de IGDB a descubrir, separados por comas (ej. \"167,169\")")
	force := flag.Bool("force", false, "permite escribir sobre el seed curado de producción (seed/seed.json)")
	curatedPath := flag.String("curated", "", "ruta de un archivo JSON de curaduría (juegos extra verificados contra IGDB)")
	flag.Parse()

	if err := guardCuratedSeedPath(*outputPath, *force); err != nil {
		return err
	}

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	clientID := strings.TrimSpace(os.Getenv("TWITCH_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("TWITCH_CLIENT_SECRET"))
	if clientID == "" || clientSecret == "" {
		return fmt.Errorf("set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to generate the real games seed")
	}

	months, err := parseMonths(*monthsRaw)
	if err != nil {
		return fmt.Errorf("invalid -months value %q: %w", *monthsRaw, err)
	}

	platformIDs, err := parsePlatforms(*platformsRaw)
	if err != nil {
		return fmt.Errorf("invalid -platforms value %q: %w", *platformsRaw, err)
	}

	client := igdb.NewClient(clientID, clientSecret)
	steamClient := steam.NewClient()

	ctx, cancel := context.WithTimeout(context.Background(), generationTimeout)
	defer cancel()

	logger.Info("igdb client ready", slog.Int("platforms", len(platformIDs)))

	games, err := generateGames(ctx, client, steamClient, logger, *year, months, platformIDs)
	if err != nil {
		return fmt.Errorf("failed to generate games: %w", err)
	}

	if *curatedPath != "" {
		entries, curErr := loadCurated(*curatedPath)
		if curErr != nil {
			return fmt.Errorf("failed to load curated file: %w", curErr)
		}
		logger.Info("curating extra games from IGDB", slog.Int("entries", len(entries)))
		seen := make(map[string]bool, len(games))
		for _, game := range games {
			seen[game.GetId()] = true
		}
		curated := processCurated(ctx, client, steamClient, logger, entries, seen)
		games = append(games, curated...)
		logger.Info("curated games added", slog.Int("count", len(curated)))
	}

	if len(games) == 0 {
		return fmt.Errorf(
			"generated 0 games for %d months %v on platforms %v: refusing to write an empty seed",
			*year, months, platformIDs,
		)
	}

	if err := writeSeedFile(*outputPath, games); err != nil {
		return fmt.Errorf("failed to write seed file %q: %w", *outputPath, err)
	}

	logger.Info("seed generated", slog.String("out", *outputPath), slog.Int("games", len(games)))
	return nil
}

func guardCuratedSeedPath(outputPath string, force bool) error {
	if force {
		return nil
	}

	cleanedOutput := filepath.Clean(outputPath)
	cleanedCurated := filepath.Clean(curatedSeedPath)

	if cleanedOutput == cleanedCurated {
		return fmt.Errorf(
			"refusing to overwrite the curated seed %q: write to the scratch path %q instead, or pass -force to override",
			curatedSeedPath, defaultOutputPath,
		)
	}
	return nil
}

func generateGames(
	ctx context.Context,
	client *igdb.Client,
	steamClient *steam.Client,
	logger *slog.Logger,
	year int,
	months []int,
	platformIDs []int,
) ([]*gamesv1.Game, error) {
	allGames := make([]*gamesv1.Game, 0)
	seenGameIDs := make(map[string]bool)

	for _, month := range months {
		logger.Info("discovering games", slog.Int("year", year), slog.Int("month", month))
		gameIDs, err := client.DiscoverGames(ctx, year, month, platformIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to discover games for %04d-%02d: %w", year, month, err)
		}
		logger.Info("games discovered", slog.Int("month", month), slog.Int("count", len(gameIDs)))

		details, err := client.GetGames(ctx, gameIDs)
		if err != nil {
			logger.Warn("skipping month due to detail fetch error",
				slog.Int("month", month), slog.String("error", err.Error()))
			continue
		}

		for i := range details {
			game := igdb.MapGameToGame(&details[i], gamesv1.Platform_PLATFORM_UNSPECIFIED)
			if seenGameIDs[game.GetId()] {
				continue
			}
			if !isQualityGame(game) {
				continue
			}
			enrichPcSpecs(ctx, steamClient, &details[i], game, logger)
			seenGameIDs[game.GetId()] = true
			allGames = append(allGames, game)
		}
	}

	return allGames, nil
}

func isQualityGame(game *gamesv1.Game) bool {
	if game.GetCoverUrl() == "" {
		return false
	}
	return game.GetHypes() > 0 || game.GetTrailerYoutubeKey() != ""
}

func writeSeedFile(outputPath string, games []*gamesv1.Game) error {
	if err := catalog.ValidateGames(games); err != nil {
		return fmt.Errorf("refusing to write invalid seed: %w", err)
	}

	response := &gamesv1.ListGamesResponse{Games: games}

	marshalOptions := protojson.MarshalOptions{
		UseProtoNames: false,
		Indent:        jsonIndent,
	}

	jsonBytes, err := marshalOptions.Marshal(response)
	if err != nil {
		return fmt.Errorf("failed to marshal games to JSON: %w", err)
	}

	if err := os.WriteFile(outputPath, jsonBytes, outputFilePermissions); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}
	return nil
}

func parseMonths(raw string) ([]int, error) {
	parts := strings.Split(raw, ",")
	months := make([]int, 0, len(parts))
	seenMonths := make(map[int]bool, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			return nil, fmt.Errorf("found an empty month entry")
		}
		month, err := strconv.Atoi(trimmed)
		if err != nil {
			return nil, fmt.Errorf("month %q is not a number: %w", trimmed, err)
		}
		const firstMonth, lastMonth = 1, 12
		if month < firstMonth || month > lastMonth {
			return nil, fmt.Errorf("month %d is out of range (must be %d-%d)", month, firstMonth, lastMonth)
		}
		if seenMonths[month] {
			continue
		}
		seenMonths[month] = true
		months = append(months, month)
	}

	return months, nil
}

func parsePlatforms(raw string) ([]int, error) {
	parts := strings.Split(raw, ",")
	platforms := make([]int, 0, len(parts))
	seenPlatforms := make(map[int]bool, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			return nil, fmt.Errorf("found an empty platform entry")
		}
		platformID, err := strconv.Atoi(trimmed)
		if err != nil {
			return nil, fmt.Errorf("platform id %q is not a number: %w", trimmed, err)
		}
		if platformID <= 0 {
			return nil, fmt.Errorf("platform id %d is invalid (must be a positive IGDB platform id)", platformID)
		}
		if seenPlatforms[platformID] {
			continue
		}
		seenPlatforms[platformID] = true
		platforms = append(platforms, platformID)
	}

	if len(platforms) == 0 {
		return nil, fmt.Errorf("no platform ids provided")
	}

	return platforms, nil
}
