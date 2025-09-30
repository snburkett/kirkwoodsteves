# Kirkwood Steve's

Kirkwood Steve's is a Next.js (App Router) playground for publishing civic signals, AI lab notes, and curated artifacts. Content lives in Git as MDX files and is validated with Zod schemas so that future ingestion and indexing jobs can stay deterministic.

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `CONTENT_HMAC_KEY`
3. Run the dev server: `npm run dev`
4. Visit `http://localhost:3000`

Production builds use `npm run build` followed by `npm run start`.

## Content Model

All posts are stored under `/content/<section>/<slug>.mdx`. Front-matter must include:

- `title`, `slug`, `date` (ISO string), optional `tags`
- Section-specific fields:
  - **Emporium**: `type: "emporium"`, `priceUSD`, `condition`, optional `images`, `status`
  - **Pulse**: `type: "pulse"`, `sourceUrl`
  - **AI**: `type: "ai"`, optional `attachments`
  - **Oddities**: `type: "oddities"`

`/lib/content.ts` exposes loader helpers and Zod schemas that back the validation workflows.

### Creating Content

Use the helper script to scaffold new entries:

```bash
npm run new -- \
  --section emporium \
  --title "Technics SL-Q202" \
  --slug technics-sl-q202 \
  --price 220 \
  --condition "Refurbished"
```

Available flags:

- `--section` one of `emporium|pulse|ai|oddities`
- `--title` human-friendly title
- `--slug` kebab-case slug (also used as filename)
- `--date` optional ISO string (defaults to today)
- `--tags` comma-separated list
- Section fields:
  - Emporium: `--price`, `--condition`, optional `--status`
  - Pulse: `--source`
  - AI: `--attachments` (comma-separated paths)

The script writes a stub MDX file with validated front-matter and a `TODO` body.

## Indexing & Validation

`scripts/build-index.ts` scans all MDX files, validates their front-matter, and writes `/content/_index/all.json`. Run it locally with `npm run index`. Passing `--dry-run` skips writing the JSON file while still validating.

GitHub Actions workflows:

- `build.yml` runs install → typecheck → build on every push and PR.
- `validate-content.yml` runs the front-matter validator on PRs that touch `content/**`.

## API Surface

All API routes are stubs that validate input and return deterministic responses:

- `GET /api/health` → `{ ok: true }`
- `GET /api/status` → last ingest run report from `/content/_reports`
- `GET /api/search?q=yew` → reads `/content/_index/all.json` if present
- `POST /api/chat` → `{ prompt }` checked, returns `{ answer: "stub", citations: [] }`
- `POST /api/ingest/queue` → validates `{ sources, mode? }` and returns a stub job id
- `POST /api/ingest/run` → requires HMAC header and acknowledges the run (no work yet)

Long-running scraping, embeddings, or chat inference are intentionally left as `TODO` placeholders.

## Security Notes

`/lib/auth.ts` enforces a simple HMAC signature for the `/api/ingest/run` endpoint via the `x-run-signature` header. Set `CONTENT_HMAC_KEY` in your environment and sign requests with SHA-256 using the raw request body.

## Project Layout

```
app/                # App Router pages and API routes
components/         # Shared UI primitives
content/            # MDX source and future indexes/reports/RAG assets
lib/                # Schemas, loaders, MDX renderer, auth helpers
scripts/            # CLI utilities for content management
```

Future ingestion jobs should drop JSON run reports into `content/_reports` and search indexes into `content/_index` so they remain versioned with the site.
