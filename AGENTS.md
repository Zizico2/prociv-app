# Working in this repository

Prefix shell commands with `rtk`; use Bun and preserve bun.lock. Use Astryx components for layout and interaction, with StyleX and the Pulso theme for local styling. Leaflet owns its map DOM. Keep generated protobuf and native HTTP/2 transport server-only. Preserve absent versus zero values, UTC source instants, stable occurrence keys and visible attribution.

Run typecheck, unit tests, desktop/mobile Playwright, theme:check, build, check:client and astryx:doctor for data or UI changes. Runtime must never fall back to fixture data. `proto/README.md` records the exact schema source revision. Theme changes require theme:build and committed generated output.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
