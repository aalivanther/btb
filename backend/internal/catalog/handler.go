package catalog

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/gen/btb/games/v1/gamesv1connect"
)

const serviceName = "GameCatalogService"

const (
	minMonth int32 = 1
	maxMonth int32 = 12
)

type Handler struct {
	version string

	store *Store
}

var _ gamesv1connect.GameCatalogServiceHandler = (*Handler)(nil)

func NewHandler(version string, store *Store) *Handler {
	return &Handler{
		version: version,
		store:   store,
	}
}

func (h *Handler) GetServiceInfo(
	_ context.Context,
	_ *connect.Request[gamesv1.GetServiceInfoRequest],
) (*connect.Response[gamesv1.GetServiceInfoResponse], error) {
	response := connect.NewResponse(&gamesv1.GetServiceInfoResponse{
		ServiceName: serviceName,
		Version:     h.version,
	})
	return response, nil
}

func (h *Handler) ListGames(
	_ context.Context,
	request *connect.Request[gamesv1.ListGamesRequest],
) (*connect.Response[gamesv1.ListGamesResponse], error) {
	message := request.Msg

	if message.GetYear() <= 0 {
		return nil, connect.NewError(
			connect.CodeInvalidArgument,
			fmt.Errorf("year must be a positive number, got %d", message.GetYear()),
		)
	}

	if message.GetMonth() < minMonth || message.GetMonth() > maxMonth {
		return nil, connect.NewError(
			connect.CodeInvalidArgument,
			fmt.Errorf("month must be between %d and %d, got %d", minMonth, maxMonth, message.GetMonth()),
		)
	}

	games := h.store.List(
		message.GetYear(),
		message.GetMonth(),
		message.GetKinds(),
		message.GetPlatforms(),
	)

	response := connect.NewResponse(&gamesv1.ListGamesResponse{
		Games: games,
	})
	return response, nil
}

func (h *Handler) GetGame(
	_ context.Context,
	request *connect.Request[gamesv1.GetGameRequest],
) (*connect.Response[gamesv1.GetGameResponse], error) {
	id := request.Msg.GetId()

	if id == "" {
		return nil, connect.NewError(
			connect.CodeInvalidArgument,
			errors.New("game id must not be empty"),
		)
	}

	game, found := h.store.Get(id)
	if !found {
		return nil, connect.NewError(
			connect.CodeNotFound,
			fmt.Errorf("game with id %q was not found", id),
		)
	}

	response := connect.NewResponse(&gamesv1.GetGameResponse{
		Game: game,
	})
	return response, nil
}
