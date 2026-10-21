package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/encoding/protojson"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/internal/catalog"
	"btb/internal/providers/igdb"
)

const defaultSeedPath = "seed/seed.json"

const maxFranchiseItems = 12

const enrichmentTimeout = 10 * time.Minute

const outputFilePermissions = 0o644

const jsonIndent = "  "

var igdbIDPattern = regexp.MustCompile(`-igdb-(\d+)$`)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "franchisegen: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	seedPath := flag.String("seed", defaultSeedPath, "ruta del seed a enriquecer (se reescribe en su lugar)")
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

	ctx, cancel := context.WithTimeout(context.Background(), enrichmentTimeout)
	defer cancel()

	client := igdb.NewClient(clientID, clientSecret)

	enrichedCount, err := enrichFranchises(ctx, client, logger, games)
	if err != nil {
		return fmt.Errorf("failed to enrich franchises: %w", err)
	}

	if enrichedCount == 0 {
		return fmt.Errorf("no game received franchise data: refusing to rewrite %q without changes", *seedPath)
	}

	if err := writeSeedFileAtomic(*seedPath, games); err != nil {
		return fmt.Errorf("failed to write enriched seed: %w", err)
	}

	logger.Info("seed enriched", slog.String("path", *seedPath),
		slog.Int("games", len(games)), slog.Int("withFranchise", enrichedCount))
	return nil
}

func enrichFranchises(ctx context.Context, client *igdb.Client, logger *slog.Logger, games []*gamesv1.Game) (int, error) {
	igdbIDByGameIndex := make(map[int]int, len(games))
	seedIDByIgdbID := make(map[int]string, len(games))
	igdbIDs := make([]int, 0, len(games))
	for index, game := range games {
		match := igdbIDPattern.FindStringSubmatch(game.GetId())
		if match == nil {
			logger.Warn("game id has no IGDB suffix; skipping", slog.String("id", game.GetId()))
			continue
		}
		numericID, err := strconv.Atoi(match[1])
		if err != nil {
			logger.Warn("game id has a non-numeric IGDB suffix; skipping", slog.String("id", game.GetId()))
			continue
		}
		igdbIDByGameIndex[index] = numericID
		seedIDByIgdbID[numericID] = game.GetId()
		igdbIDs = append(igdbIDs, numericID)
	}

	logger.Info("fetching game collections", slog.Int("games", len(igdbIDs)))
	collectionByGameID, err := client.GetGameCollections(ctx, igdbIDs)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch game collections: %w", err)
	}

	uniqueCollectionIDs := make([]int, 0, len(collectionByGameID))
	seenCollections := make(map[int]bool, len(collectionByGameID))
	for _, igdbID := range igdbIDs {
		ref, hasCollection := collectionByGameID[igdbID]
		if hasCollection && !seenCollections[ref.ID] {
			seenCollections[ref.ID] = true
			uniqueCollectionIDs = append(uniqueCollectionIDs, ref.ID)
		}
	}
	logger.Info("collections found", slog.Int("collections", len(uniqueCollectionIDs)))

	members, err := client.GetCollectionGames(ctx, uniqueCollectionIDs)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch collection members: %w", err)
	}
	membersByCollectionID := make(map[int][]igdb.RawCollectionGame, len(uniqueCollectionIDs))
	for _, member := range members {
		for _, ref := range member.Collections {
			membersByCollectionID[ref.ID] = append(membersByCollectionID[ref.ID], member)
		}
	}
	logger.Info("collection members fetched", slog.Int("members", len(members)))

	enrichedCount := 0
	for index, game := range games {
		igdbID, hasIgdbID := igdbIDByGameIndex[index]
		if !hasIgdbID {
			continue
		}
		ref, hasCollection := collectionByGameID[igdbID]
		if !hasCollection {
			continue
		}

		items := buildFranchiseItems(client, membersByCollectionID[ref.ID], igdbID, seedIDByIgdbID)
		if len(items) == 0 {
			continue
		}

		game.Franchise = &gamesv1.Collection{Name: ref.Name, Items: items}
		enrichedCount++
	}

	return enrichedCount, nil
}

func buildFranchiseItems(client *igdb.Client, members []igdb.RawCollectionGame, selfIgdbID int, seedIDByIgdbID map[int]string) []*gamesv1.CollectionItem {
	siblings := make([]igdb.RawCollectionGame, 0, len(members))
	for _, member := range members {
		if member.ID != selfIgdbID {
			siblings = append(siblings, member)
		}
	}
	if len(siblings) == 0 {
		return nil
	}

	sort.SliceStable(siblings, func(left, right int) bool {
		leftDate, rightDate := siblings[left].FirstReleaseDate, siblings[right].FirstReleaseDate
		if leftDate == 0 && rightDate == 0 {
			return siblings[left].Name < siblings[right].Name
		}
		if leftDate == 0 {
			return false
		}
		if rightDate == 0 {
			return true
		}
		if leftDate != rightDate {
			return leftDate < rightDate
		}
		return siblings[left].Name < siblings[right].Name
	})

	selected := make([]igdb.RawCollectionGame, 0, maxFranchiseItems)
	if len(siblings) <= maxFranchiseItems {
		selected = append(selected, siblings...)
	} else {
		for _, sibling := range siblings {
			if _, inSeed := seedIDByIgdbID[sibling.ID]; inSeed && len(selected) < maxFranchiseItems {
				selected = append(selected, sibling)
			}
		}
		for _, sibling := range siblings {
			if len(selected) >= maxFranchiseItems {
				break
			}
			if _, inSeed := seedIDByIgdbID[sibling.ID]; !inSeed {
				selected = append(selected, sibling)
			}
		}
		sort.SliceStable(selected, func(left, right int) bool {
			leftDate, rightDate := selected[left].FirstReleaseDate, selected[right].FirstReleaseDate
			if leftDate == 0 && rightDate == 0 {
				return selected[left].Name < selected[right].Name
			}
			if leftDate == 0 {
				return false
			}
			if rightDate == 0 {
				return true
			}
			if leftDate != rightDate {
				return leftDate < rightDate
			}
			return selected[left].Name < selected[right].Name
		})
	}

	items := make([]*gamesv1.CollectionItem, 0, len(selected))
	for _, sibling := range selected {
		items = append(items, client.BuildCollectionItem(sibling, seedIDByIgdbID))
	}
	return items
}

func writeSeedFileAtomic(outputPath string, games []*gamesv1.Game) error {
	if err := catalog.ValidateGames(games); err != nil {
		return fmt.Errorf("refusing to write invalid enriched seed: %w", err)
	}

	response := &gamesv1.ListGamesResponse{Games: games}

	marshalOptions := protojson.MarshalOptions{
		UseProtoNames: false,
		Indent:        jsonIndent,
	}
	jsonBytes, err := marshalOptions.Marshal(response)
	if err != nil {
		return fmt.Errorf("failed to marshal enriched seed to JSON: %w", err)
	}

	directory := filepath.Dir(outputPath)
	temporaryFile, err := os.CreateTemp(directory, "seed-enriched-*.json")
	if err != nil {
		return fmt.Errorf("failed to create temporary file in %q: %w", directory, err)
	}
	temporaryPath := temporaryFile.Name()

	if _, err := temporaryFile.Write(jsonBytes); err != nil {
		_ = temporaryFile.Close()
		_ = os.Remove(temporaryPath)
		return fmt.Errorf("failed to write temporary file: %w", err)
	}
	if err := temporaryFile.Close(); err != nil {
		_ = os.Remove(temporaryPath)
		return fmt.Errorf("failed to close temporary file: %w", err)
	}
	if err := os.Chmod(temporaryPath, outputFilePermissions); err != nil {
		_ = os.Remove(temporaryPath)
		return fmt.Errorf("failed to set permissions on temporary file: %w", err)
	}

	if err := os.Rename(temporaryPath, outputPath); err != nil {
		_ = os.Remove(temporaryPath)
		return fmt.Errorf("failed to replace %q atomically: %w", outputPath, err)
	}
	return nil
}
