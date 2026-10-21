package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"

	"btb/gen/btb/games/v1/gamesv1connect"
	"btb/internal/catalog"
	"btb/internal/config"
	"btb/internal/deals"
	"btb/internal/providers/cheapshark"
	"btb/internal/server"
)

const healthCheckPath = "/healthz"

const shutdownTimeout = 15 * time.Second

const maxRequestMessageBytes = 1 << 20

const healthcheckTimeout = 3 * time.Second

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(runHealthcheck())
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	if err := run(logger); err != nil {
		logger.Error("server terminated with error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func runHealthcheck() int {
	cfg := config.Load()
	client := &http.Client{Timeout: healthcheckTimeout}
	response, err := client.Get("http://" + net.JoinHostPort("127.0.0.1", cfg.Port) + healthCheckPath)
	if err != nil {
		return 1
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func run(logger *slog.Logger) error {
	cfg := config.Load()

	games, err := catalog.LoadSeed(cfg.SeedPath)
	if err != nil {
		logger.Error(
			"failed to load catalog seed at startup",
			slog.String("seed_path", cfg.SeedPath),
			slog.String("error", err.Error()),
		)
		return err
	}
	logger.Info(
		"catalog seed loaded",
		slog.String("seed_path", cfg.SeedPath),
		slog.Int("games", len(games)),
	)

	store := catalog.NewStore(games)

	rootContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	handlerOptions := []connect.HandlerOption{
		connect.WithInterceptors(
			server.LoggingInterceptor(logger),
			server.RecoveryInterceptor(logger),
		),
		connect.WithReadMaxBytes(maxRequestMessageBytes),
	}

	gameHandler := catalog.NewHandler(cfg.Version, store)

	gamePath, gameHTTPHandler := gamesv1connect.NewGameCatalogServiceHandler(gameHandler, handlerOptions...)

	dealsHandler := deals.NewHandler(cheapshark.NewClient())
	dealsPath, dealsHTTPHandler := gamesv1connect.NewDealsServiceHandler(dealsHandler, handlerOptions...)

	mux := http.NewServeMux()
	mux.Handle(gamePath, gameHTTPHandler)
	mux.Handle(dealsPath, dealsHTTPHandler)
	mux.HandleFunc(healthCheckPath, healthCheckHandler)

	address := net.JoinHostPort(cfg.ListenHost, cfg.Port)

	handlerWithCORS := server.CORSMiddleware(cfg.CORSAllowedOrigins, mux)
	logger.Info("cors allow-list configured", slog.Any("origins", cfg.CORSAllowedOrigins))

	httpServer := server.New(address, handlerWithCORS, logger)

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info(
			"http server starting",
			slog.String("address", address),
			slog.String("version", cfg.Version),
		)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
		close(serverErrors)
	}()

	select {
	case err := <-serverErrors:
		if err != nil {
			return err
		}
		return nil

	case <-rootContext.Done():
		logger.Info("shutdown signal received, draining connections")

		stop()

		shutdownContext, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()

		if err := httpServer.Shutdown(shutdownContext); err != nil {
			return err
		}

		logger.Info("http server stopped gracefully")
		return nil
	}
}

func healthCheckHandler(responseWriter http.ResponseWriter, _ *http.Request) {
	responseWriter.Header().Set("Content-Type", "text/plain; charset=utf-8")
	responseWriter.WriteHeader(http.StatusOK)
	if _, err := responseWriter.Write([]byte("ok")); err != nil {
		slog.Default().Warn("failed to write health check response", slog.String("error", err.Error()))
	}
}
