package gamesv1connect

import (
	v1 "btb/gen/btb/games/v1"
	connect "connectrpc.com/connect"
	context "context"
	errors "errors"
	http "net/http"
	strings "strings"
)

const _ = connect.IsAtLeastVersion1_13_0

const (
	GameCatalogServiceName = "btb.games.v1.GameCatalogService"
)

const (
	GameCatalogServiceGetServiceInfoProcedure = "/btb.games.v1.GameCatalogService/GetServiceInfo"
	GameCatalogServiceListGamesProcedure = "/btb.games.v1.GameCatalogService/ListGames"
	GameCatalogServiceGetGameProcedure = "/btb.games.v1.GameCatalogService/GetGame"
)

type GameCatalogServiceClient interface {
	GetServiceInfo(context.Context, *connect.Request[v1.GetServiceInfoRequest]) (*connect.Response[v1.GetServiceInfoResponse], error)
	ListGames(context.Context, *connect.Request[v1.ListGamesRequest]) (*connect.Response[v1.ListGamesResponse], error)
	GetGame(context.Context, *connect.Request[v1.GetGameRequest]) (*connect.Response[v1.GetGameResponse], error)
}

func NewGameCatalogServiceClient(httpClient connect.HTTPClient, baseURL string, opts ...connect.ClientOption) GameCatalogServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	gameCatalogServiceMethods := v1.File_btb_games_v1_games_proto.Services().ByName("GameCatalogService").Methods()
	return &gameCatalogServiceClient{
		getServiceInfo: connect.NewClient[v1.GetServiceInfoRequest, v1.GetServiceInfoResponse](
			httpClient,
			baseURL+GameCatalogServiceGetServiceInfoProcedure,
			connect.WithSchema(gameCatalogServiceMethods.ByName("GetServiceInfo")),
			connect.WithClientOptions(opts...),
		),
		listGames: connect.NewClient[v1.ListGamesRequest, v1.ListGamesResponse](
			httpClient,
			baseURL+GameCatalogServiceListGamesProcedure,
			connect.WithSchema(gameCatalogServiceMethods.ByName("ListGames")),
			connect.WithClientOptions(opts...),
		),
		getGame: connect.NewClient[v1.GetGameRequest, v1.GetGameResponse](
			httpClient,
			baseURL+GameCatalogServiceGetGameProcedure,
			connect.WithSchema(gameCatalogServiceMethods.ByName("GetGame")),
			connect.WithClientOptions(opts...),
		),
	}
}

type gameCatalogServiceClient struct {
	getServiceInfo *connect.Client[v1.GetServiceInfoRequest, v1.GetServiceInfoResponse]
	listGames      *connect.Client[v1.ListGamesRequest, v1.ListGamesResponse]
	getGame        *connect.Client[v1.GetGameRequest, v1.GetGameResponse]
}

func (c *gameCatalogServiceClient) GetServiceInfo(ctx context.Context, req *connect.Request[v1.GetServiceInfoRequest]) (*connect.Response[v1.GetServiceInfoResponse], error) {
	return c.getServiceInfo.CallUnary(ctx, req)
}

func (c *gameCatalogServiceClient) ListGames(ctx context.Context, req *connect.Request[v1.ListGamesRequest]) (*connect.Response[v1.ListGamesResponse], error) {
	return c.listGames.CallUnary(ctx, req)
}

func (c *gameCatalogServiceClient) GetGame(ctx context.Context, req *connect.Request[v1.GetGameRequest]) (*connect.Response[v1.GetGameResponse], error) {
	return c.getGame.CallUnary(ctx, req)
}

type GameCatalogServiceHandler interface {
	GetServiceInfo(context.Context, *connect.Request[v1.GetServiceInfoRequest]) (*connect.Response[v1.GetServiceInfoResponse], error)
	ListGames(context.Context, *connect.Request[v1.ListGamesRequest]) (*connect.Response[v1.ListGamesResponse], error)
	GetGame(context.Context, *connect.Request[v1.GetGameRequest]) (*connect.Response[v1.GetGameResponse], error)
}

func NewGameCatalogServiceHandler(svc GameCatalogServiceHandler, opts ...connect.HandlerOption) (string, http.Handler) {
	gameCatalogServiceMethods := v1.File_btb_games_v1_games_proto.Services().ByName("GameCatalogService").Methods()
	gameCatalogServiceGetServiceInfoHandler := connect.NewUnaryHandler(
		GameCatalogServiceGetServiceInfoProcedure,
		svc.GetServiceInfo,
		connect.WithSchema(gameCatalogServiceMethods.ByName("GetServiceInfo")),
		connect.WithHandlerOptions(opts...),
	)
	gameCatalogServiceListGamesHandler := connect.NewUnaryHandler(
		GameCatalogServiceListGamesProcedure,
		svc.ListGames,
		connect.WithSchema(gameCatalogServiceMethods.ByName("ListGames")),
		connect.WithHandlerOptions(opts...),
	)
	gameCatalogServiceGetGameHandler := connect.NewUnaryHandler(
		GameCatalogServiceGetGameProcedure,
		svc.GetGame,
		connect.WithSchema(gameCatalogServiceMethods.ByName("GetGame")),
		connect.WithHandlerOptions(opts...),
	)
	return "/btb.games.v1.GameCatalogService/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case GameCatalogServiceGetServiceInfoProcedure:
			gameCatalogServiceGetServiceInfoHandler.ServeHTTP(w, r)
		case GameCatalogServiceListGamesProcedure:
			gameCatalogServiceListGamesHandler.ServeHTTP(w, r)
		case GameCatalogServiceGetGameProcedure:
			gameCatalogServiceGetGameHandler.ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})
}

type UnimplementedGameCatalogServiceHandler struct{}

func (UnimplementedGameCatalogServiceHandler) GetServiceInfo(context.Context, *connect.Request[v1.GetServiceInfoRequest]) (*connect.Response[v1.GetServiceInfoResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("btb.games.v1.GameCatalogService.GetServiceInfo is not implemented"))
}

func (UnimplementedGameCatalogServiceHandler) ListGames(context.Context, *connect.Request[v1.ListGamesRequest]) (*connect.Response[v1.ListGamesResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("btb.games.v1.GameCatalogService.ListGames is not implemented"))
}

func (UnimplementedGameCatalogServiceHandler) GetGame(context.Context, *connect.Request[v1.GetGameRequest]) (*connect.Response[v1.GetGameResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("btb.games.v1.GameCatalogService.GetGame is not implemented"))
}
