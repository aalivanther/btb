FROM golang:1.26.3 AS builder

ARG VERSION=0.1.30

WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-s -w -X btb/internal/config.buildVersion=${VERSION}" \
    -o /out/api ./cmd/api

FROM gcr.io/distroless/static@sha256:f7f8f729987ad0fdf6b05eeeae94b26e6a0f613bdf46feea7fc40f7bd72953e6 AS runtime

COPY --from=builder /out/api /api

COPY --from=builder /src/seed /seed

ENV SEED_PATH=/seed/seed.json

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/api"]
