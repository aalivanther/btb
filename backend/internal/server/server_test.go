package server

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"connectrpc.com/connect"

	gamesv1 "btb/gen/btb/games/v1"
	"btb/gen/btb/games/v1/gamesv1connect"
)

type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

type fakeDealsService struct {
	panicOnList bool
	listErr     error
}

func (s *fakeDealsService) ListBestDeals(
	_ context.Context,
	_ *connect.Request[gamesv1.ListBestDealsRequest],
) (*connect.Response[gamesv1.ListBestDealsResponse], error) {
	if s.panicOnList {
		panic("boom: fallo inesperado del handler")
	}
	if s.listErr != nil {
		return nil, s.listErr
	}
	return connect.NewResponse(&gamesv1.ListBestDealsResponse{}), nil
}

func (s *fakeDealsService) FindGameDeals(
	_ context.Context,
	_ *connect.Request[gamesv1.FindGameDealsRequest],
) (*connect.Response[gamesv1.FindGameDealsResponse], error) {
	return connect.NewResponse(&gamesv1.FindGameDealsResponse{
		Deals: []*gamesv1.Deal{{DealId: "d1", Title: "Gothic"}},
	}), nil
}

func newTestService(
	t *testing.T, service gamesv1connect.DealsServiceHandler, interceptors ...connect.Interceptor,
) gamesv1connect.DealsServiceClient {
	t.Helper()
	path, handler := gamesv1connect.NewDealsServiceHandler(service, connect.WithInterceptors(interceptors...))
	mux := http.NewServeMux()
	mux.Handle(path, handler)
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return gamesv1connect.NewDealsServiceClient(server.Client(), server.URL)
}

func TestRecoveryInterceptorCatchesPanic(t *testing.T) {
	t.Parallel()
	logBuffer := &syncBuffer{}
	logger := slog.New(slog.NewTextHandler(logBuffer, nil))
	client := newTestService(t, &fakeDealsService{panicOnList: true},
		RecoveryInterceptor(logger), LoggingInterceptor(logger))

	_, err := client.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{}))
	if err == nil {
		t.Fatalf("expected an error from the panicking handler, got nil")
	}
	if code := connect.CodeOf(err); code != connect.CodeInternal {
		t.Errorf("error code = %v, want %v", code, connect.CodeInternal)
	}
	if strings.Contains(err.Error(), "boom") {
		t.Errorf("client error should not leak panic details, got %q", err.Error())
	}

	response, err := client.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{}))
	if err != nil {
		t.Fatalf("server should keep serving after a panic, got error: %v", err)
	}
	if len(response.Msg.GetDeals()) != 1 {
		t.Errorf("expected 1 deal from healthy method, got %d", len(response.Msg.GetDeals()))
	}

	logged := logBuffer.String()
	if !strings.Contains(logged, "recovered from panic") {
		t.Errorf("log should mention the recovered panic, got:\n%s", logged)
	}
	if !strings.Contains(logged, gamesv1connect.DealsServiceListBestDealsProcedure) {
		t.Errorf("log should mention the procedure %q, got:\n%s",
			gamesv1connect.DealsServiceListBestDealsProcedure, logged)
	}
}

func TestLoggingInterceptorLogsProcedureWithoutBreakingResponse(t *testing.T) {
	t.Parallel()
	logBuffer := &syncBuffer{}
	logger := slog.New(slog.NewTextHandler(logBuffer, nil))
	service := &fakeDealsService{
		listErr: connect.NewError(connect.CodeUnavailable, fmt.Errorf("provider down")),
	}
	client := newTestService(t, service, LoggingInterceptor(logger))

	response, err := client.FindGameDeals(context.Background(), connect.NewRequest(&gamesv1.FindGameDealsRequest{}))
	if err != nil {
		t.Fatalf("FindGameDeals error: %v", err)
	}
	if len(response.Msg.GetDeals()) != 1 || response.Msg.GetDeals()[0].GetTitle() != "Gothic" {
		t.Fatalf("logging interceptor altered the response: %+v", response.Msg.GetDeals())
	}
	logged := logBuffer.String()
	if !strings.Contains(logged, "rpc call handled") {
		t.Errorf("log should contain the success entry, got:\n%s", logged)
	}
	if !strings.Contains(logged, gamesv1connect.DealsServiceFindGameDealsProcedure) {
		t.Errorf("log should mention the procedure %q, got:\n%s",
			gamesv1connect.DealsServiceFindGameDealsProcedure, logged)
	}

	_, err = client.ListBestDeals(context.Background(), connect.NewRequest(&gamesv1.ListBestDealsRequest{}))
	if err == nil {
		t.Fatalf("expected the handler error to pass through, got nil")
	}
	if code := connect.CodeOf(err); code != connect.CodeUnavailable {
		t.Errorf("error code = %v, want %v (logging must not rewrite errors)", code, connect.CodeUnavailable)
	}
	logged = logBuffer.String()
	if !strings.Contains(logged, "rpc call failed") {
		t.Errorf("log should contain the failure entry, got:\n%s", logged)
	}
	if !strings.Contains(logged, gamesv1connect.DealsServiceListBestDealsProcedure) {
		t.Errorf("log should mention the failing procedure %q, got:\n%s",
			gamesv1connect.DealsServiceListBestDealsProcedure, logged)
	}
}

func TestCORSMiddlewareAllowsListedOrigin(t *testing.T) {
	t.Parallel()
	allowed := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	handler := CORSMiddleware(allowed, http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusOK)
	}))

	request := httptest.NewRequest(http.MethodPost, "/btb.games.v1.DealsService/FindGameDeals", nil)
	request.Header.Set("Origin", "http://localhost:3000")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Errorf("allow-origin = %q, want the requesting origin echoed back", got)
	}
	if got := recorder.Header().Get("Vary"); !strings.Contains(got, "Origin") {
		t.Errorf("Vary = %q, want it to include Origin (per-origin caching)", got)
	}
	allowHeaders := recorder.Header().Get("Access-Control-Allow-Headers")
	for _, needed := range []string{"Content-Type", "Connect-Protocol-Version"} {
		if !strings.Contains(allowHeaders, needed) {
			t.Errorf("allow-headers %q missing %q", allowHeaders, needed)
		}
	}
	if got := recorder.Header().Get("Access-Control-Expose-Headers"); !strings.Contains(got, "Grpc-Status") {
		t.Errorf("expose-headers = %q, want it to include Grpc-Status", got)
	}
	if recorder.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (the request must still reach the handler)", recorder.Code, http.StatusOK)
	}
}

func TestCORSMiddlewareRejectsUnlistedOrigin(t *testing.T) {
	t.Parallel()
	handler := CORSMiddleware([]string{"http://localhost:3000"}, http.HandlerFunc(
		func(writer http.ResponseWriter, _ *http.Request) {
			writer.WriteHeader(http.StatusOK)
		}))

	request := httptest.NewRequest(http.MethodPost, "/rpc", nil)
	request.Header.Set("Origin", "http://evil.example.com")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("allow-origin = %q, want empty for an unlisted origin", got)
	}
}

func TestCORSMiddlewarePreflight(t *testing.T) {
	t.Parallel()
	reachedHandler := false
	handler := CORSMiddleware([]string{"http://localhost:3000"}, http.HandlerFunc(
		func(writer http.ResponseWriter, _ *http.Request) {
			reachedHandler = true
			writer.WriteHeader(http.StatusOK)
		}))

	request := httptest.NewRequest(http.MethodOptions, "/rpc", nil)
	request.Header.Set("Origin", "http://localhost:3000")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Errorf("preflight status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
	if reachedHandler {
		t.Error("preflight should be answered by the middleware, not forwarded to the handler")
	}
	if got := recorder.Header().Get("Access-Control-Max-Age"); got == "" {
		t.Error("preflight must set Access-Control-Max-Age so browsers cache the permission")
	}
}

func TestCORSMiddlewareEmptyListEmitsNothing(t *testing.T) {
	t.Parallel()
	handler := CORSMiddleware(nil, http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusOK)
	}))

	request := httptest.NewRequest(http.MethodPost, "/rpc", nil)
	request.Header.Set("Origin", "http://localhost:3000")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("allow-origin = %q, want empty when the allow-list is empty", got)
	}
}
