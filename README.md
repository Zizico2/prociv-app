# Pulso · Portugal, agora

A small current-occurrence map for mainland Portugal. Search municipalities, localities, occurrence numbers or natures; filter by category, region and status; open an occurrence to see its location, start time and committed resources. The desktop list sits beside the map. Mobile has map/list views and accessible detail/filter sheets. Map clusters expand on click, markers work with keyboard activation, and a location control only asks for browser geolocation after a click.

The app uses public ANEPC data, with visible source times and attribution. The source is a rolling view: an occurrence can have started days ago while still remaining open. There is no archive, historical database, incident prediction, weather layer or background location tracking. Coverage is mainland Portugal. This independent project is not ANEPC and is not an emergency service.

## Stack and repository boundaries

Matches [ipma-weather](https://github.com/Zizico2/ipma-weather): Next.js 16.4.6 App Router, React 19.3.1, Bun 1.4.4, Astryx 0.7.13, StyleX, TanStack DB/Query, Hono typed routes, native server-only HTTP/2 gRPC with Connect/Protobuf-ES, and Node.js 24 on Vercel. Leaflet 1.9.4 renders OpenStreetMap tiles without an API key.

```text
browser -> Next.js/Hono -> prociv-gateway (tonic/Moka) -> prociv-proxy (tonic/Progenitor) -> ANEPC ArcGIS
```

Each layer owns a separate repository: [OpenAPI/client](https://github.com/Zizico2/prociv-openapi), [protobuf](https://github.com/Zizico2/prociv-proto), [proxy](https://github.com/Zizico2/prociv-proxy), [gateway](https://github.com/Zizico2/prociv-gateway), [deployment](https://github.com/Zizico2/prociv-infra). The app contains no Rust service or direct ANEPC browser fetch. The generated protobuf and HTTP/2 transport stay on the server. The source schema and exact commit provenance are vendored under `proto/`.

## Run locally

Start prociv-proxy on **50101**, then prociv-gateway on **50102**, using `rtk cargo run --locked` in each checkout. Alternatively follow the pinned-source Compose setup in prociv-infra. Then, in this app:

```sh
rtk bun install --frozen-lockfile
rtk proxy cp .env.example .env.local
rtk bun run dev
```

Open http://127.0.0.1:3100. `PROCIV_GRPC_URL` is server-only, defaulting to `http://127.0.0.1:50102`. Point it to port 50101 to bypass the gateway. Hosted deployments use an HTTPS native gRPC gateway origin, with normal certificate validation. No gRPC-Web or browser CORS configuration is needed.

```sh
rtk bun run build
rtk bun run start --port 3100
```

The build prerenders a static loading shell and streams the current snapshot at request time. It does not need a running backend during build. Each server request owns a TanStack DB and QueryClient; native dehydration/hydration seeds the browser. The browser refreshes every minute and on focus. Manual refresh waits for any initial load before fetching again. Failed refreshes preserve the last successful snapshot; missing/stale source timestamps are disclosed. The gateway may reuse a snapshot for up to 60 seconds. ANEPC itself refreshes its view roughly every five minutes; the app does not claim second-by-second live tracking.

Zeros and missing resource counts are distinct. A `+` on a total means some counts are missing. Occurrences without usable coordinates remain searchable in the list. Dates use Europe/Lisbon; source epoch timestamps are UTC. Stable Numero/ID keys allow refresh and `?oc=...` links. The full source snapshot is loaded; filters do not change the national headline totals. Nature categories are a small app grouping of source codes, not an official ANEPC taxonomy.

## Map configuration

The default tiles are `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with visible OpenStreetMap attribution and normal browser caching/referrer headers. No tile prefetch, bulk download or offline cache is implemented. The public tile service is suitable for this sample; for greater traffic select a tile provider and its attribution with build-time `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION`. Those values are public configuration, never secrets. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Verify

```sh
rtk bun run typecheck
rtk bun run test
rtk bun run theme:check
rtk bunx playwright install --with-deps chromium
rtk bun run test:e2e
rtk bun run build
rtk bun run check:client
rtk bun run astryx:doctor
```

The fixture suite uses an actual generated-schema HTTP/2 gRPC server on **50111** and isolated Next build directory `build/e2e` on **3101**. It tests desktop/mobile search and categories, accented text, missing coordinates/counts, sheets, deep links, narrow-screen overflow and retained data on refresh failure. OSM tiles are stubbed only in tests. Runtime never falls back to fake data. Live browser QA checks the actual ANEPC → Rust → Next.js path separately.

`DEPLOYED_TEST_URL=https://your-deployment.vercel.app rtk bun run test:e2e:deployed` checks a deployed app with its real gateway. For a protected preview set `VERCEL_AUTOMATION_BYPASS_SECRET` privately; tests send the bypass header without publishing traces.

Regenerate server TypeScript with `rtk bun run proto:generate`. Change theme tokens in `src/themes/prociv/procivTheme.ts`, then run `rtk bun run theme:build` and commit the generated output. Layout and controls use Astryx; the map's domain-specific DOM/CSS belongs to Leaflet.

## Deployment

[prociv-infra](https://github.com/Zizico2/prociv-infra) owns source pins, containers, Cloud Run Terraform, and manually reviewed Vercel release artifacts. The app's `vercel.json` disables automatic production deploys from main. Branch previews may be enabled by connecting this repository to a Vercel project and setting `PROCIV_GRPC_URL` independently in Preview and Production as a Config variable. No credentials are checked into this repository. The repository is deployable; creating it does not provision hosted resources.
