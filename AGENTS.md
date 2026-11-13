# AGENTS.md — EduCluster AI (Next.js K-Means & Silhouette app)

App: education data-mining web app (student score clustering). Docs are in Indonesian: `rules.md` (binding coding standards), `architecture.md`, `schema.md`, `prd.md`, `design.md`. Read `rules.md` before writing code.

## Commands

- `npm run dev` / `npm run build` / `npm start` — standard Next.js 15 (App Router).
- `npm run build` is the de-facto typecheck (there is no separate typecheck script).
- `npm run lint` **fails** — ESLint is not installed (not in devDependencies). Do not "fix" this casually or assume lint passes in CI; there is no CI.
- `npm run verify:kmeans` — cross-validation of our hand-written K-Means/Silhouette against the `ml-kmeans` library on a fixed dataset. Exits 1 on mismatch. It runs `node --import tsx --conditions=react-server scripts/verify-kmeans.mjs`; the `--conditions=react-server` flag is required because the engine modules use `import 'server-only'`. Do not run engine modules in plain Node without it.
- No test framework. The verify script is the only automated correctness check; for manual validation, compare against a hand-computed example.

## Server/client boundary (hard rule — build breaks if violated)

- `src/lib/kmeans.ts`, `src/lib/silhouette.ts`, `src/lib/clusterEngine.ts` all start with `import 'server-only'`. Client components must never import runtime values from them — only `import type { ... }`. This failure mode is intentional and is how the boundary is enforced.
- All algorithm execution happens via Server Actions in `src/app/actions/clustering.ts` (file starts with `'use server'`).
- The algorithms are **hand-written TypeScript** — no ML library in production. `ml-kmeans` and `tsx` are devDependencies used only by the verify script.

## Deterministic clustering rules (do not change casually)

- Cluster labels are assigned post-convergence by `rankClustersByNilaiAkhir` using weighted centroid score `0.3·Harian + 0.3·UTS + 0.4·UAS`. Highest → `'Tinggi'`, middle → `'Sedang'`, lowest → `'Rendah'`. `clusterEngine.ts` asserts Tinggi ≥ Sedang ≥ Rendah and throws if violated.
- Always run K-Means through `runKMeansStable` (multi-restart, n_init ≥ 5, picks min WCSS). Raw `runKMeans` is nondeterministic (K-Means++ init uses `Math.random`) and must not be called directly from the engine path.
- Input validation: Nilai Akhir formula is the same 0.3/0.3/0.4 weighting, computed in `src/lib/parser.ts` during CSV/XLSX parsing.

## Persistence quirks

- `src/lib/db.ts` is dual-layer: Supabase when `.env.local` credentials are set (see `.env.local.example`, DDL in `supabase_schema.sql`), otherwise an **in-memory cache that resets on server restart**. The app is fully demoable without credentials by design (userless/no-login architecture).
- **Dual-Mode persistence is gated by admin session**: `runClusteringAction` in `src/app/actions/clustering.ts` calls `isAdminRequest()` from `src/lib/auth.ts`. Admin (valid session cookie) → upsert + cache to Supabase; user (no session) → pure pass-through, no DB writes at all. **Writes** (`upsertDataAkademik`, `cacheClusteringResult`) and `resetDataAction` are admin-only; **reads** (`getLatestClusteringAction`) are open to both modes.
- **Session result handoff**: after successful clustering, `ClusteringResult` is saved to `sessionStorage` (key `educluster-session-result`) via `src/lib/sessionResult.ts`. Dashboard/Laporan load order: sessionStorage first → DB fallback (`getLatestClusteringAction`) → empty state. This is how user-mode results survive navigation without any DB. Uploading a new file or clearing data invalidates the session result.
- Admin auth is a single-password scheme: `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` env vars (server-only), session = HttpOnly cookie signed with HMAC-SHA256 (`src/lib/auth.ts`, 8-hour TTL). There is no `admin` table and no Supabase Auth. Login page: `/admin/login`.
- **Admin data management (UC-07)**: `/admin/data` page + `src/app/actions/adminData.ts` (`getManagedStudentsAction`, `updateStudentNilaiAction`, `deleteStudentAction`). Editing/deleting a student recomputes clustering automatically via `processClustering` + `cacheClusteringResult`. Data source: `getSupabaseOrMemorySnapshot()` in `db.ts` (Supabase join, or in-memory mirror `memoryRecords` when Supabase is unconfigured). Without Supabase the page shows a "database belum terhubung" notice.
- Clustering results are stored per `periode_analisis` via delete-then-insert (idempotent; re-running the same period never duplicates rows).
- Known limitation: DB cache reconstruction always rebuilds results as mode `'3D'`, even if the run was `'1D'`.

## Theming & UI conventions

- Dark mode is class-based (`darkMode: "class"`), theme persisted in `localStorage` key `'educluster-theme'`, with an anti-FOUC inline script in `src/app/layout.tsx`. Every new UI element needs `dark:` variants.
- Glassmorphism card pattern used app-wide: `bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10`.
- Semantic cluster colors (consistent across charts/tables): Tinggi = emerald, Sedang = amber, Rendah = rose; centroid marker on scatter = yellow `#facc15` star.
- Print stylesheet in `globals.css`: interactive elements need class `no-print`; official report blocks (letterhead, signatures) use `print-only`. Print forces white background/black text even in dark mode.
- Errors surface to users via `sonner` toasts; Server Actions return `{ success, error }` objects instead of throwing to the client.

## Known inconsistencies (do not "fix" silently)

- Silhouette thresholds differ between files: `silhouette.ts` interprets with 0.2/0.35/0.5, `db.ts` uses 0.25, and the "ambiguous student" filter in `laporan/page.tsx` uses 0.2. Changing one requires deciding on a single shared threshold first.
- `npm audit` reports pre-existing advisories on `xlsx` and `postcss`/`next` — not introduced by recent work; evaluate before upgrading.
- The project is **not a git repository** — there is no history, branch, or PR workflow.
