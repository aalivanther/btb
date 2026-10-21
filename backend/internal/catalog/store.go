package catalog

import (
	"sort"
	"time"

	gamesv1 "btb/gen/btb/games/v1"
)

const isoDateLayout = "2006-01-02"

type Store struct {
	games []*gamesv1.Game

	byID map[string]*gamesv1.Game
}

func NewStore(games []*gamesv1.Game) *Store {
	byID := make(map[string]*gamesv1.Game, len(games))
	for _, game := range games {
		byID[game.GetId()] = game
	}

	return &Store{
		games: games,
		byID:  byID,
	}
}

func (s *Store) List(
	year int32,
	month int32,
	kinds []gamesv1.GameKind,
	platforms []gamesv1.Platform,
) []*gamesv1.Game {
	allowedKinds := buildKindFilterSet(kinds)
	allowedPlatforms := buildPlatformFilterSet(platforms)

	matches := make([]*gamesv1.Game, 0, len(s.games))
	for _, game := range s.games {
		releaseYear, releaseMonth, ok := parseYearMonth(game.GetReleaseDate())
		if !ok {
			continue
		}

		if releaseYear != year || releaseMonth != month {
			continue
		}

		if allowedKinds != nil {
			if _, isAllowed := allowedKinds[game.GetKind()]; !isAllowed {
				continue
			}
		}

		if allowedPlatforms != nil {
			if _, isAllowed := allowedPlatforms[game.GetPlatform()]; !isAllowed {
				continue
			}
		}

		matches = append(matches, game)
	}

	sort.SliceStable(matches, func(firstIndex, secondIndex int) bool {
		first := matches[firstIndex]
		second := matches[secondIndex]

		if first.GetReleaseDate() != second.GetReleaseDate() {
			return first.GetReleaseDate() < second.GetReleaseDate()
		}

		return first.GetTitle() < second.GetTitle()
	})

	return matches
}

func (s *Store) Get(id string) (*gamesv1.Game, bool) {
	game, found := s.byID[id]
	return game, found
}

func buildKindFilterSet(kinds []gamesv1.GameKind) map[gamesv1.GameKind]struct{} {
	if len(kinds) == 0 {
		return nil
	}

	set := make(map[gamesv1.GameKind]struct{}, len(kinds))
	for _, kind := range kinds {
		set[kind] = struct{}{}
	}
	return set
}

func buildPlatformFilterSet(platforms []gamesv1.Platform) map[gamesv1.Platform]struct{} {
	if len(platforms) == 0 {
		return nil
	}

	set := make(map[gamesv1.Platform]struct{}, len(platforms))
	for _, platform := range platforms {
		set[platform] = struct{}{}
	}
	return set
}

func parseYearMonth(releaseDate string) (year, month int32, ok bool) {
	parsedDate, err := time.Parse(isoDateLayout, releaseDate)
	if err != nil {
		return 0, 0, false
	}

	return int32(parsedDate.Year()), int32(parsedDate.Month()), true
}
