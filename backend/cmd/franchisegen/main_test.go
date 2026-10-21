package main

import (
	"testing"

	"btb/internal/providers/igdb"
)

func member(id int, name string, releaseDate int64) igdb.RawCollectionGame {
	return igdb.RawCollectionGame{ID: id, Name: name, FirstReleaseDate: releaseDate}
}

func TestBuildFranchiseItems(t *testing.T) {
	t.Parallel()

	client := igdb.NewClient("test-id", "test-secret")

	testCases := []struct {
		name           string
		members        []igdb.RawCollectionGame
		selfIgdbID     int
		seedIDByIgdbID map[int]string
		wantTitles     []string
	}{
		{
			name:       "excluye al propio juego y ordena cronologicamente",
			selfIgdbID: 3,
			members: []igdb.RawCollectionGame{
				member(2, "Segunda", 200),
				member(3, "Yo mismo", 300),
				member(1, "Primera", 100),
			},
			seedIDByIgdbID: map[int]string{},
			wantTitles:     []string{"Primera", "Segunda"},
		},
		{
			name:       "las entregas sin fecha van al final con desempate por titulo",
			selfIgdbID: 99,
			members: []igdb.RawCollectionGame{
				member(1, "Zeta sin fecha", 0),
				member(2, "Alfa sin fecha", 0),
				member(3, "Con fecha", 500),
			},
			seedIDByIgdbID: map[int]string{},
			wantTitles:     []string{"Con fecha", "Alfa sin fecha", "Zeta sin fecha"},
		},
		{
			name:       "saga sin otras entregas devuelve vacio",
			selfIgdbID: 1,
			members: []igdb.RawCollectionGame{
				member(1, "Solo yo", 100),
			},
			seedIDByIgdbID: map[int]string{},
			wantTitles:     []string{},
		},
		{
			name:       "el tope prioriza las entregas que viven en el seed y reordena cronologico",
			selfIgdbID: 999,
			members: func() []igdb.RawCollectionGame {
				built := make([]igdb.RawCollectionGame, 0, 14)
				names := []string{"E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "E11", "E12", "E13", "E14"}
				for index, name := range names {
					built = append(built, member(index+1, name, int64((index+1)*100)))
				}
				return built
			}(),
			seedIDByIgdbID: map[int]string{13: "e13-igdb-13", 14: "e14-igdb-14"},
			wantTitles: []string{
				"E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "E13", "E14",
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			items := buildFranchiseItems(client, testCase.members, testCase.selfIgdbID, testCase.seedIDByIgdbID)

			if len(items) != len(testCase.wantTitles) {
				t.Fatalf("got %d items, want %d", len(items), len(testCase.wantTitles))
			}
			for index, item := range items {
				if item.GetTitle() != testCase.wantTitles[index] {
					t.Errorf("item %d: got title %q, want %q", index, item.GetTitle(), testCase.wantTitles[index])
				}
			}
		})
	}
}

func TestBuildFranchiseItemsSetsGameID(t *testing.T) {
	t.Parallel()

	client := igdb.NewClient("test-id", "test-secret")
	members := []igdb.RawCollectionGame{
		member(10, "En el seed", 100),
		member(20, "Fuera del seed", 200),
	}
	seedIDs := map[int]string{10: "en-el-seed-igdb-10"}

	items := buildFranchiseItems(client, members, 999, seedIDs)
	if len(items) != 2 {
		t.Fatalf("got %d items, want 2", len(items))
	}
	if items[0].GetGameId() != "en-el-seed-igdb-10" {
		t.Errorf("seed member: got game_id %q, want %q", items[0].GetGameId(), "en-el-seed-igdb-10")
	}
	if items[1].GetGameId() != "" {
		t.Errorf("non-seed member: got game_id %q, want empty", items[1].GetGameId())
	}
}
