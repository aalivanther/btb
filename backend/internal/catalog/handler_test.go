package catalog

import (
	"context"
	"testing"

	"connectrpc.com/connect"

	gamesv1 "btb/gen/btb/games/v1"
)

const testVersion = "0.0.21"

func newTestHandler(t *testing.T) *Handler {
	t.Helper()

	gameA := &gamesv1.Game{
		Id:          "game-a",
		Kind:        gamesv1.GameKind_GAME_KIND_GAME,
		Platform:    gamesv1.Platform_PLATFORM_PLAYSTATION,
		Title:       "Alborada",
		ReleaseDate: "2026-06-10",
	}
	gameB := &gamesv1.Game{
		Id:          "game-b",
		Kind:        gamesv1.GameKind_GAME_KIND_DLC,
		Platform:    gamesv1.Platform_PLATFORM_XBOX,
		Title:       "Bruma",
		ReleaseDate: "2026-06-25",
	}
	gameC := &gamesv1.Game{
		Id:          "game-c",
		Kind:        gamesv1.GameKind_GAME_KIND_GAME,
		Platform:    gamesv1.Platform_PLATFORM_PLAYSTATION,
		Title:       "Cenit",
		ReleaseDate: "2026-07-01",
	}

	store := NewStore([]*gamesv1.Game{gameA, gameB, gameC})
	return NewHandler(testVersion, store)
}

func TestGetServiceInfo(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)

	response, err := handler.GetServiceInfo(
		context.Background(),
		connect.NewRequest(&gamesv1.GetServiceInfoRequest{}),
	)
	if err != nil {
		t.Fatalf("GetServiceInfo returned an unexpected error: %v", err)
	}

	if got := response.Msg.GetServiceName(); got != serviceName {
		t.Errorf("service_name = %q, want %q", got, serviceName)
	}
	if got := response.Msg.GetVersion(); got != testVersion {
		t.Errorf("version = %q, want %q", got, testVersion)
	}
}

func TestListGames(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name          string
		request       *gamesv1.ListGamesRequest
		wantErrorCode connect.Code
		wantIDs       []string
	}

	cases := []testCase{
		{
			name: "june 2026 without filters returns both games sorted by date",
			request: &gamesv1.ListGamesRequest{
				Year:  2026,
				Month: 6,
			},
			wantIDs: []string{"game-a", "game-b"},
		},
		{
			name: "june 2026 filtered by dlc returns only the dlc",
			request: &gamesv1.ListGamesRequest{
				Year:  2026,
				Month: 6,
				Kinds: []gamesv1.GameKind{gamesv1.GameKind_GAME_KIND_DLC},
			},
			wantIDs: []string{"game-b"},
		},
		{
			name: "june 2026 filtered by xbox returns only the xbox game",
			request: &gamesv1.ListGamesRequest{
				Year:      2026,
				Month:     6,
				Platforms: []gamesv1.Platform{gamesv1.Platform_PLATFORM_XBOX},
			},
			wantIDs: []string{"game-b"},
		},
		{
			name: "june 2026 filtered by playstation excludes july playstation game",
			request: &gamesv1.ListGamesRequest{
				Year:      2026,
				Month:     6,
				Platforms: []gamesv1.Platform{gamesv1.Platform_PLATFORM_PLAYSTATION},
			},
			wantIDs: []string{"game-a"},
		},
		{
			name: "month without games returns an empty list",
			request: &gamesv1.ListGamesRequest{
				Year:  2026,
				Month: 3,
			},
			wantIDs: []string{},
		},
		{
			name: "non-positive year is rejected as invalid argument",
			request: &gamesv1.ListGamesRequest{
				Year:  0,
				Month: 6,
			},
			wantErrorCode: connect.CodeInvalidArgument,
		},
		{
			name: "out-of-range month is rejected as invalid argument",
			request: &gamesv1.ListGamesRequest{
				Year:  2026,
				Month: 13,
			},
			wantErrorCode: connect.CodeInvalidArgument,
		},
	}

	handler := newTestHandler(t)

	for _, testCaseEntry := range cases {
		t.Run(testCaseEntry.name, func(t *testing.T) {
			t.Parallel()

			response, err := handler.ListGames(
				context.Background(),
				connect.NewRequest(testCaseEntry.request),
			)

			if testCaseEntry.wantErrorCode != 0 {
				if err == nil {
					t.Fatalf("ListGames expected error code %v, got nil error", testCaseEntry.wantErrorCode)
				}
				if got := connect.CodeOf(err); got != testCaseEntry.wantErrorCode {
					t.Fatalf("ListGames error code = %v, want %v", got, testCaseEntry.wantErrorCode)
				}
				return
			}

			if err != nil {
				t.Fatalf("ListGames returned an unexpected error: %v", err)
			}

			gotGames := response.Msg.GetGames()
			if len(gotGames) != len(testCaseEntry.wantIDs) {
				t.Fatalf(
					"ListGames returned %d games, want %d",
					len(gotGames), len(testCaseEntry.wantIDs),
				)
			}
			for index, wantID := range testCaseEntry.wantIDs {
				if got := gotGames[index].GetId(); got != wantID {
					t.Errorf("game[%d] id = %q, want %q", index, got, wantID)
				}
			}
		})
	}
}

func TestGetGame(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name          string
		id            string
		wantErrorCode connect.Code
		wantID        string
	}

	cases := []testCase{
		{
			name:   "existing id returns the game",
			id:     "game-a",
			wantID: "game-a",
		},
		{
			name:          "missing id returns not found",
			id:            "does-not-exist",
			wantErrorCode: connect.CodeNotFound,
		},
		{
			name:          "empty id returns invalid argument",
			id:            "",
			wantErrorCode: connect.CodeInvalidArgument,
		},
	}

	handler := newTestHandler(t)

	for _, testCaseEntry := range cases {
		t.Run(testCaseEntry.name, func(t *testing.T) {
			t.Parallel()

			response, err := handler.GetGame(
				context.Background(),
				connect.NewRequest(&gamesv1.GetGameRequest{Id: testCaseEntry.id}),
			)

			if testCaseEntry.wantErrorCode != 0 {
				if err == nil {
					t.Fatalf("GetGame expected error code %v, got nil error", testCaseEntry.wantErrorCode)
				}
				if got := connect.CodeOf(err); got != testCaseEntry.wantErrorCode {
					t.Fatalf("GetGame error code = %v, want %v", got, testCaseEntry.wantErrorCode)
				}
				return
			}

			if err != nil {
				t.Fatalf("GetGame returned an unexpected error: %v", err)
			}
			if got := response.Msg.GetGame().GetId(); got != testCaseEntry.wantID {
				t.Errorf("game id = %q, want %q", got, testCaseEntry.wantID)
			}
		})
	}
}
