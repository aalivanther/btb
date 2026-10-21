package config

import (
	"os"
	"strings"
)

const defaultPort = "8080"

const defaultListenHost = "127.0.0.1"

const defaultSeedPath = "seed/seed.json"

const defaultCORSOrigins = "http://localhost:3000,http://127.0.0.1:3000"

var buildVersion = "0.1.31"

type Config struct {
	Port string

	ListenHost string

	Version string

	SeedPath string

	CORSAllowedOrigins []string
}

func Load() Config {
	return Config{
		Port: getEnvOrDefault("PORT", defaultPort),
		ListenHost: getEnvOrDefault("LISTEN_HOST", defaultListenHost),
		Version: buildVersion,
		SeedPath: getEnvOrDefault("SEED_PATH", defaultSeedPath),
		CORSAllowedOrigins: parseOriginList(getEnvOrDefault("CORS_ALLOWED_ORIGINS", defaultCORSOrigins)),
	}
}

func parseOriginList(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func getEnvOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
