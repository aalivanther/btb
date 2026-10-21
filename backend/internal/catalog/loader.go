package catalog

import (
	"fmt"
	"os"
	"time"

	"google.golang.org/protobuf/encoding/protojson"

	gamesv1 "btb/gen/btb/games/v1"
)

const seedDateLayout = "2006-01-02"

func LoadSeed(path string) ([]*gamesv1.Game, error) {
	rawBytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("catalog: failed to read seed file %q: %w", path, err)
	}

	unmarshalOptions := protojson.UnmarshalOptions{DiscardUnknown: false}

	parsedResponse := &gamesv1.ListGamesResponse{}
	if err := unmarshalOptions.Unmarshal(rawBytes, parsedResponse); err != nil {
		return nil, fmt.Errorf("catalog: failed to parse seed file %q as JSON: %w", path, err)
	}

	games := parsedResponse.GetGames()

	if err := ValidateGames(games); err != nil {
		return nil, fmt.Errorf("catalog: seed file %q is invalid: %w", path, err)
	}

	return games, nil
}

func ValidateGames(games []*gamesv1.Game) error {
	if len(games) == 0 {
		return fmt.Errorf("contains no games")
	}

	seenIDs := make(map[string]int, len(games))

	for index, game := range games {
		if game.GetId() == "" {
			return fmt.Errorf("game at index %d has an empty id", index)
		}

		if previousIndex, exists := seenIDs[game.GetId()]; exists {
			return fmt.Errorf(
				"duplicate game id %q (at index %d and index %d)",
				game.GetId(), previousIndex, index,
			)
		}
		seenIDs[game.GetId()] = index
		if game.GetTitle() == "" {
			return fmt.Errorf("game at index %d (id %q) has an empty title", index, game.GetId())
		}
		if game.GetReleaseDate() == "" {
			return fmt.Errorf("game at index %d (id %q) has an empty release_date", index, game.GetId())
		}
		if _, parseErr := time.Parse(seedDateLayout, game.GetReleaseDate()); parseErr != nil {
			return fmt.Errorf(
				"game at index %d (id %q) has a malformed release_date %q (want AAAA-MM-DD): %w",
				index, game.GetId(), game.GetReleaseDate(), parseErr,
			)
		}
	}

	return nil
}
