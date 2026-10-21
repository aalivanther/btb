# Be The Boss

Every video game release in Mexico on one timeline, for PlayStation, Xbox, Nintendo and PC.
Each game has its page with trailer, availability and franchise; the profile (wishlist, radar, backup) lives in the browser.
Demo: https://akyrion.tech/btb/

## Run locally

1. Install Docker with Compose v2; the whole toolchain runs in the `tools` container.
2. `cp .env.example .env`
3. `make tools-build && make gen && make up`
4. Open http://127.0.0.1:3000 (API on :8080).
5. `make verify` runs codegen, lint and tests; `make seed` refreshes the catalog from IGDB with your Twitch keys.
