package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"btb/internal/catalog"
	"btb/internal/providers/igdb"
)

const (
	defaultSeedPath  = "seed/seed.json"
	defaultOutPath   = "../web/src/data/seed-videos.json"
	enrichmentBudget = 10 * time.Minute
	filePerms        = 0o644
)

var igdbIDPattern = regexp.MustCompile(`-igdb-(\d+)$`)

type Video struct {
	Key      string `json:"key"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

var (
	trailerHints  = []string{"trailer", "teaser", "reveal", "announce", "launch"}
	gameplayHints = []string{"gameplay", "walkthrough", "demo", "playthrough", "hands-on", "hands on"}
	devHints      = []string{"dev diary", "developer", "behind the scenes", "making of", "dev log", "devlog", "diary", "commentary"}
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "videosgen: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	seedPath := flag.String("seed", defaultSeedPath, "ruta del seed a leer (no se modifica)")
	outPath := flag.String("out", defaultOutPath, "ruta del JSON compañero de videos a escribir")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	clientID := strings.TrimSpace(os.Getenv("TWITCH_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("TWITCH_CLIENT_SECRET"))
	if clientID == "" || clientSecret == "" {
		return fmt.Errorf("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in the environment")
	}

	games, err := catalog.LoadSeed(*seedPath)
	if err != nil {
		return fmt.Errorf("failed to load seed: %w", err)
	}
	logger.Info("seed loaded", slog.String("path", *seedPath), slog.Int("games", len(games)))

	seedIDByIgdbID := make(map[int]string, len(games))
	igdbIDs := make([]int, 0, len(games))
	for _, game := range games {
		match := igdbIDPattern.FindStringSubmatch(game.GetId())
		if match == nil {
			continue
		}
		numericID, convErr := strconv.Atoi(match[1])
		if convErr != nil {
			continue
		}
		seedIDByIgdbID[numericID] = game.GetId()
		igdbIDs = append(igdbIDs, numericID)
	}

	ctx, cancel := context.WithTimeout(context.Background(), enrichmentBudget)
	defer cancel()

	client := igdb.NewClient(clientID, clientSecret)
	logger.Info("fetching videos from IGDB", slog.Int("games", len(igdbIDs)))
	rawGames, err := client.GetGames(ctx, igdbIDs)
	if err != nil {
		return fmt.Errorf("failed to fetch games from IGDB: %w", err)
	}

	videosByGameID := make(map[string][]Video, len(rawGames))
	totalVideos := 0
	for _, raw := range rawGames {
		seedID, ok := seedIDByIgdbID[raw.ID]
		if !ok {
			continue
		}
		seenKeys := make(map[string]bool, len(raw.Videos))
		videos := make([]Video, 0, len(raw.Videos))
		for _, rawVideo := range raw.Videos {
			key := strings.TrimSpace(rawVideo.VideoID)
			if key == "" || seenKeys[key] {
				continue
			}
			seenKeys[key] = true
			videos = append(videos, Video{Key: key, Name: rawVideo.Name, Category: categoryFor(rawVideo.Name)})
		}
		if len(videos) == 0 {
			continue
		}
		sortTrailerFirst(videos)
		videosByGameID[seedID] = videos
		totalVideos += len(videos)
	}

	if len(videosByGameID) == 0 {
		return fmt.Errorf("no videos found for any game: refusing to write %q", *outPath)
	}

	if err := writeJSONAtomic(*outPath, videosByGameID); err != nil {
		return fmt.Errorf("failed to write companion videos file: %w", err)
	}

	logger.Info("videos written",
		slog.String("path", *outPath),
		slog.Int("gamesWithVideos", len(videosByGameID)),
		slog.Int("totalVideos", totalVideos))
	return nil
}

func sortTrailerFirst(videos []Video) {
	trailerIndex := -1
	for index, video := range videos {
		if video.Category == "trailer" {
			trailerIndex = index
			break
		}
	}
	if trailerIndex <= 0 {
		return
	}
	trailer := videos[trailerIndex]
	copy(videos[1:trailerIndex+1], videos[0:trailerIndex])
	videos[0] = trailer
}

func writeJSONAtomic(outputPath string, data map[string][]Video) error {
	jsonBytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal videos to JSON: %w", err)
	}

	directory := filepath.Dir(outputPath)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return fmt.Errorf("failed to create output directory %q: %w", directory, err)
	}

	tmp, err := os.CreateTemp(directory, "seed-videos-*.json")
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}
	tmpPath := tmp.Name()
	if _, err := tmp.Write(jsonBytes); err != nil {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to write temporary file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to close temporary file: %w", err)
	}
	if err := os.Chmod(tmpPath, filePerms); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to chmod temporary file: %w", err)
	}
	if err := os.Rename(tmpPath, outputPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to rename temporary file: %w", err)
	}
	return nil
}

func containsAny(haystack string, needles []string) bool {
	for _, needle := range needles {
		if strings.Contains(haystack, needle) {
			return true
		}
	}
	return false
}

func categoryFor(name string) string {
	lower := strings.ToLower(name)
	switch {
	case containsAny(lower, trailerHints):
		return "trailer"
	case containsAny(lower, devHints):
		return "dev_diary"
	case containsAny(lower, gameplayHints):
		return "gameplay"
	default:
		return "otro"
	}
}
