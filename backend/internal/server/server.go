package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"connectrpc.com/connect"
)

const (
	readHeaderTimeout = 10 * time.Second

	readTimeout = 30 * time.Second

	writeTimeout = 30 * time.Second

	idleTimeout = 120 * time.Second
)

const corsMaxAge = "3600"

const corsAllowedHeaders = "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms, " +
	"Grpc-Timeout, X-Grpc-Web, X-User-Agent"

const corsExposedHeaders = "Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin"

func CORSMiddleware(allowedOrigins []string, next http.Handler) http.Handler {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			allowed[trimmed] = true
		}
	}

	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		origin := request.Header.Get("Origin")

		if origin != "" && allowed[origin] {
			header := writer.Header()
			header.Set("Access-Control-Allow-Origin", origin)
			header.Add("Vary", "Origin")
			header.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			header.Set("Access-Control-Allow-Headers", corsAllowedHeaders)
			header.Set("Access-Control-Expose-Headers", corsExposedHeaders)
			header.Set("Access-Control-Max-Age", corsMaxAge)
		}

		if request.Method == http.MethodOptions {
			writer.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(writer, request)
	})
}

func New(address string, handler http.Handler, logger *slog.Logger) *http.Server {
	protocols := new(http.Protocols)
	protocols.SetHTTP1(true)
	protocols.SetUnencryptedHTTP2(true)

	return &http.Server{
		Addr:              address,
		Handler:           handler,
		Protocols:         protocols,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
		ErrorLog: slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}
}

func LoggingInterceptor(logger *slog.Logger) connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, request connect.AnyRequest) (connect.AnyResponse, error) {
			start := time.Now()

			response, err := next(ctx, request)

			duration := time.Since(start)
			attributes := []slog.Attr{
				slog.String("procedure", request.Spec().Procedure),
				slog.Duration("duration", duration),
			}

			if err != nil {
				logger.LogAttrs(ctx, slog.LevelWarn, "rpc call failed",
					append(attributes, slog.String("error", err.Error()))...)
			} else {
				logger.LogAttrs(ctx, slog.LevelInfo, "rpc call handled", attributes...)
			}

			return response, err
		}
	}
}

func RecoveryInterceptor(logger *slog.Logger) connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, request connect.AnyRequest) (response connect.AnyResponse, err error) {
			defer func() {
				if recovered := recover(); recovered != nil {
					stack := debug.Stack()
					logger.LogAttrs(
						ctx, slog.LevelError, "recovered from panic in rpc handler",
						slog.String("procedure", request.Spec().Procedure),
						slog.Any("panic", recovered),
						slog.String("stack", string(stack)),
					)
					err = connect.NewError(connect.CodeInternal, fmt.Errorf("internal server error"))
				}
			}()

			return next(ctx, request)
		}
	}
}
