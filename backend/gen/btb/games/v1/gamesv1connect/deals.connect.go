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
	DealsServiceName = "btb.games.v1.DealsService"
)

const (
	DealsServiceListBestDealsProcedure = "/btb.games.v1.DealsService/ListBestDeals"
	DealsServiceFindGameDealsProcedure = "/btb.games.v1.DealsService/FindGameDeals"
)

type DealsServiceClient interface {
	ListBestDeals(context.Context, *connect.Request[v1.ListBestDealsRequest]) (*connect.Response[v1.ListBestDealsResponse], error)
	FindGameDeals(context.Context, *connect.Request[v1.FindGameDealsRequest]) (*connect.Response[v1.FindGameDealsResponse], error)
}

func NewDealsServiceClient(httpClient connect.HTTPClient, baseURL string, opts ...connect.ClientOption) DealsServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	dealsServiceMethods := v1.File_btb_games_v1_deals_proto.Services().ByName("DealsService").Methods()
	return &dealsServiceClient{
		listBestDeals: connect.NewClient[v1.ListBestDealsRequest, v1.ListBestDealsResponse](
			httpClient,
			baseURL+DealsServiceListBestDealsProcedure,
			connect.WithSchema(dealsServiceMethods.ByName("ListBestDeals")),
			connect.WithClientOptions(opts...),
		),
		findGameDeals: connect.NewClient[v1.FindGameDealsRequest, v1.FindGameDealsResponse](
			httpClient,
			baseURL+DealsServiceFindGameDealsProcedure,
			connect.WithSchema(dealsServiceMethods.ByName("FindGameDeals")),
			connect.WithClientOptions(opts...),
		),
	}
}

type dealsServiceClient struct {
	listBestDeals *connect.Client[v1.ListBestDealsRequest, v1.ListBestDealsResponse]
	findGameDeals *connect.Client[v1.FindGameDealsRequest, v1.FindGameDealsResponse]
}

func (c *dealsServiceClient) ListBestDeals(ctx context.Context, req *connect.Request[v1.ListBestDealsRequest]) (*connect.Response[v1.ListBestDealsResponse], error) {
	return c.listBestDeals.CallUnary(ctx, req)
}

func (c *dealsServiceClient) FindGameDeals(ctx context.Context, req *connect.Request[v1.FindGameDealsRequest]) (*connect.Response[v1.FindGameDealsResponse], error) {
	return c.findGameDeals.CallUnary(ctx, req)
}

type DealsServiceHandler interface {
	ListBestDeals(context.Context, *connect.Request[v1.ListBestDealsRequest]) (*connect.Response[v1.ListBestDealsResponse], error)
	FindGameDeals(context.Context, *connect.Request[v1.FindGameDealsRequest]) (*connect.Response[v1.FindGameDealsResponse], error)
}

func NewDealsServiceHandler(svc DealsServiceHandler, opts ...connect.HandlerOption) (string, http.Handler) {
	dealsServiceMethods := v1.File_btb_games_v1_deals_proto.Services().ByName("DealsService").Methods()
	dealsServiceListBestDealsHandler := connect.NewUnaryHandler(
		DealsServiceListBestDealsProcedure,
		svc.ListBestDeals,
		connect.WithSchema(dealsServiceMethods.ByName("ListBestDeals")),
		connect.WithHandlerOptions(opts...),
	)
	dealsServiceFindGameDealsHandler := connect.NewUnaryHandler(
		DealsServiceFindGameDealsProcedure,
		svc.FindGameDeals,
		connect.WithSchema(dealsServiceMethods.ByName("FindGameDeals")),
		connect.WithHandlerOptions(opts...),
	)
	return "/btb.games.v1.DealsService/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case DealsServiceListBestDealsProcedure:
			dealsServiceListBestDealsHandler.ServeHTTP(w, r)
		case DealsServiceFindGameDealsProcedure:
			dealsServiceFindGameDealsHandler.ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})
}

type UnimplementedDealsServiceHandler struct{}

func (UnimplementedDealsServiceHandler) ListBestDeals(context.Context, *connect.Request[v1.ListBestDealsRequest]) (*connect.Response[v1.ListBestDealsResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("btb.games.v1.DealsService.ListBestDeals is not implemented"))
}

func (UnimplementedDealsServiceHandler) FindGameDeals(context.Context, *connect.Request[v1.FindGameDealsRequest]) (*connect.Response[v1.FindGameDealsResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("btb.games.v1.DealsService.FindGameDeals is not implemented"))
}
