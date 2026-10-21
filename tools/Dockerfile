FROM golang:1.26.3-bookworm

ARG BUF_VERSION=1.70.0
ARG GOLANGCI_LINT_VERSION=2.12.2
ARG GOFUMPT_VERSION=0.10.0
ARG NODE_MAJOR=24
ARG PNPM_VERSION=11.5.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://github.com/bufbuild/buf/releases/download/v${BUF_VERSION}/buf-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/buf \
 && chmod +x /usr/local/bin/buf

RUN curl -sSfL "https://raw.githubusercontent.com/golangci/golangci-lint/v${GOLANGCI_LINT_VERSION}/install.sh" \
      | sh -s -- -b /usr/local/bin "v${GOLANGCI_LINT_VERSION}"

RUN go install "mvdan.cc/gofumpt@v${GOFUMPT_VERSION}" \
 && cp "$(go env GOPATH)/bin/gofumpt" /usr/local/bin/gofumpt

RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /work

CMD ["bash"]
