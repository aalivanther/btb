package igdb

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	gamesv1 "btb/gen/btb/games/v1"
)

const collectionGamesLimit = 500

const collectionsBatchSize = 100

type CollectionRef struct {
	ID int
	Name string
}

type igdbCollectionRef struct {
	ID int `json:"id"`
	Name string `json:"name"`
}

type rawGameCollection struct {
	ID int `json:"id"`
	Collections []igdbCollectionRef `json:"collections"`
}

type RawCollectionGame struct {
	ID int `json:"id"`
	Name string `json:"name"`
	Summary string `json:"summary"`
	FirstReleaseDate int64 `json:"first_release_date"`
	Cover igdbImage `json:"cover"`
	Artworks []igdbImage `json:"artworks"`
	Screenshots []igdbImage `json:"screenshots"`
	AggregatedRating float64 `json:"aggregated_rating"`
	AggregatedRatingCount int `json:"aggregated_rating_count"`
	TotalRating float64 `json:"total_rating"`
	TotalRatingCount int `json:"total_rating_count"`
	GameType int `json:"game_type"`
	Collections []igdbCollectionRef `json:"collections"`
}

var extraLabelByGameType = map[int]string{
	1:  "DLC",
	2:  "Expansión",
	4:  "Expansión independiente",
	8:  "Remake",
	9:  "Remaster",
	10: "Juego expandido",
	11: "Port",
}

func (c *Client) GetGameCollections(ctx context.Context, gameIDs []int) (map[int]CollectionRef, error) {
	collections := make(map[int]CollectionRef, len(gameIDs))
	if len(gameIDs) == 0 {
		return collections, nil
	}

	for start := 0; start < len(gameIDs); start += getGamesBatchSize {
		end := start + getGamesBatchSize
		if end > len(gameIDs) {
			end = len(gameIDs)
		}
		batch := gameIDs[start:end]

		body := "fields id,collections.id,collections.name;" +
			fmt.Sprintf("where id = (%s);", joinInts(batch)) +
			fmt.Sprintf("limit %d;", len(batch))

		bodyBytes, err := c.doQuery(ctx, endpointGames, body)
		if err != nil {
			return nil, fmt.Errorf("igdb: failed to fetch collections for batch starting at %d: %w", start, err)
		}

		var rows []rawGameCollection
		if err := json.Unmarshal(bodyBytes, &rows); err != nil {
			return nil, fmt.Errorf("igdb: failed to parse collections for batch starting at %d: %w", start, err)
		}

		for _, row := range rows {
			for _, ref := range row.Collections {
				if ref.ID != 0 && ref.Name != "" {
					collections[row.ID] = CollectionRef(ref)
					break
				}
			}
		}
	}

	return collections, nil
}

func (c *Client) GetCollectionGames(ctx context.Context, collectionIDs []int) ([]RawCollectionGame, error) {
	if len(collectionIDs) == 0 {
		return []RawCollectionGame{}, nil
	}

	const fields = "fields id,name,summary,first_release_date," +
		"cover.image_id,artworks.image_id,screenshots.image_id," +
		"aggregated_rating,aggregated_rating_count,total_rating,total_rating_count," +
		"game_type,collections.id,collections.name;"

	members := make([]RawCollectionGame, 0, len(collectionIDs)*4)

	for start := 0; start < len(collectionIDs); start += collectionsBatchSize {
		end := start + collectionsBatchSize
		if end > len(collectionIDs) {
			end = len(collectionIDs)
		}
		batch := collectionIDs[start:end]

		for offset := 0; ; offset += collectionGamesLimit {
			body := fields +
				fmt.Sprintf("where collections = (%s);", joinInts(batch)) +
				fmt.Sprintf("sort first_release_date asc; limit %d; offset %d;", collectionGamesLimit, offset)

			bodyBytes, err := c.doQuery(ctx, endpointGames, body)
			if err != nil {
				return nil, fmt.Errorf("igdb: failed to fetch collection games (batch %d, offset %d): %w", start, offset, err)
			}

			var page []RawCollectionGame
			if err := json.Unmarshal(bodyBytes, &page); err != nil {
				return nil, fmt.Errorf("igdb: failed to parse collection games (batch %d, offset %d): %w", start, offset, err)
			}
			members = append(members, page...)

			if len(page) < collectionGamesLimit {
				break
			}
		}
	}

	return members, nil
}

func (c *Client) BuildCollectionItem(member RawCollectionGame, seedIDByIgdbID map[int]string) *gamesv1.CollectionItem {
	year := ""
	if member.FirstReleaseDate != 0 {
		year = time.Unix(member.FirstReleaseDate, 0).UTC().Format("2006")
	}

	backdropURL := ""
	if len(member.Artworks) > 0 {
		backdropURL = c.BuildImageURL(member.Artworks[0].ImageID, ImageSizeHero)
	} else if len(member.Screenshots) > 0 {
		backdropURL = c.BuildImageURL(member.Screenshots[0].ImageID, ImageSizeHero)
	}

	criticBase := member.AggregatedRating
	criticCount := member.AggregatedRatingCount
	if criticBase <= 0 {
		criticBase = member.TotalRating
		criticCount = member.TotalRatingCount
	}
	rating := normalizeCritic(criticBase, criticCount)

	return &gamesv1.CollectionItem{
		Title:       member.Name,
		Year:        year,
		PosterUrl:   c.BuildImageURL(member.Cover.ImageID, ImageSizeCoverBig),
		Overview:    member.Summary,
		BackdropUrl: backdropURL,
		Rating:      rating,
		Extra:       extraLabelByGameType[member.GameType],
		GameId: seedIDByIgdbID[member.ID],
	}
}
