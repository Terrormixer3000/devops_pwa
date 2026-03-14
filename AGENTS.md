# AGENTS.md

## Purpose

This repository is a mobile-first Azure DevOps PWA built with Next.js App Router, React 19, TypeScript, Tailwind CSS v4, React Query, Axios, Zustand, and `next-pwa`.

Follow repository conventions over generic framework defaults. Keep changes narrow, readable, and compatible with demo mode and the current app shell.

---

## Repository Layout

- Routes: `src/app/`
- Shared UI primitives: `src/components/ui/`
- App shell and navigation: `src/components/layout/`
- API clients: `src/lib/api/`
- Domain service wrappers: `src/lib/services/`
- Server-only helpers for API routes: `src/lib/server/`
- Zustand stores: `src/lib/stores/`
- Shared domain and API types: `src/types/index.ts`
- Demo/mock state: `src/lib/mocks/demoData.ts`
- Static files and PWA assets: `public/`
- Domain sub-components: `src/components/pipelines/`, `src/components/pr/`, `src/components/explorer/`, `src/components/settings/`
- Note: `src/components/releases`, `src/components/repos`, and `src/app/repositories` do not exist; do not recreate them unless adding actual files.

---

## Tooling

- Package manager: `npm`
- Framework: Next.js 16 App Router
- TypeScript: `strict`
- Path alias: `@/* → src/*`
- Linting: ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Styling: Tailwind CSS v4 plus global theme tokens in `src/app/globals.css`
- PWA: `next-pwa` with a custom service worker at `public/sw-custom.js`
- No automated test runner is configured

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server with HTTPS (webpack mode)
npm run build        # Production build (webpack mode)
npm run start        # Production server
npm run lint         # Lint
```

The dev server uses `--experimental-https` with certs from `certificates/localhost.pem` and `certificates/localhost-key.pem`. Generate them with `mkcert` or equivalent.

---

## Testing

There is no test framework installed. No `*.test.*` or `*.spec.*` files exist. If asked to run tests, say clearly that no test harness exists yet.

Minimum validation:
- Most changes: `npm run lint`
- Route, config, typing, service worker, or API route changes: `npm run lint && npm run build`

---

## Architecture Notes

- Keep Azure DevOps REST details inside service modules, not inside page components.
- Use `createAzureClient` and `createVsrmClient` for authenticated API access.
- Demo mode is first-class; new service methods should preserve `isDemoClient(client)` behavior where relevant.
- Global bootstrapping happens in `src/components/layout/Providers.tsx`.
- UI data fetching is primarily handled with React Query.
- Cross-page client state and persistence are handled with Zustand stores.
- YAML pipeline creation always starts in the drawer and continues in a YAML editor; the pipeline is only finalized through the commit flow, with automatic definition creation only when committing to the repo default branch.
- Pull Request creation opens as a drawer on `/pull-requests`; `/pull-requests/new` is a redirect-only compatibility route.
- Push notifications use API routes under `src/app/api/push/*`, a local JSON subscription store in `data/subscriptions.json`, and `public/sw-custom.js`.
- Each push subscription has a `webhookToken` (64 hex chars, 256-bit entropy) generated at registration time and stored in `data/subscriptions.json`.
- Each browser subscription also stores per-event notification preferences; settings and server-side delivery must stay aligned so disabled event types are not sent.
- The webhook endpoint `POST /api/push/webhook` requires `?t=<webhookToken>` — no global secret.
- The token is stored in the browser under `localStorage` key `azdevops_push_token` by `pushService`.
- Push setup happens directly on `/settings`: activate notifications there, then manually register the generated personal webhook URL in Azure DevOps. `/push-setup` is redirect-only compatibility. `/push-test` requires an active subscription plus token present in `localStorage`.

---

## Imports

- Use ES modules only.
- Group imports: external packages → `@/` imports → relative imports.
- Prefer `@/*` imports for code under `src`.
- Use relative imports only for nearby siblings when they improve clarity.
- Use `import type` for type-only imports when practical.

---

## Formatting

- Semicolons, double quotes, trailing commas where valid.
- 2-space indentation.
- Prefer multi-line JSX when a one-line version is hard to scan.
- Keep objects and arrays compact when they remain readable.
- Favor readability over aggressive line wrapping.

---

## TypeScript Rules

- Preserve `strict` compatibility.
- Prefer explicit interfaces for shared shapes and API payloads.
- Keep shared types centralized in `src/types/index.ts`.
- Avoid `any`; prefer `unknown`, unions, generics, or exact interfaces.
- Keep literal unions narrow; do not widen to `string` unless necessary.
- Type async return values explicitly in services and route handlers.
- Mark properties optional only when they are truly absent in API or UI flows.

---

## React and Next.js Conventions

- Add `"use client"` only when hooks, browser APIs, or client interactivity are required.
- `page.tsx` and `layout.tsx` files use default exports.
- Prefer named exports outside route modules.
- Keep components focused; extract helpers when a page grows difficult to scan.
- Prefer local helper components for repeated JSX inside a page.
- Guard browser-only APIs when code can run during SSR or build.

---

## Naming Conventions

- Components: PascalCase (`AppBar`, `SelectionSheet`)
- Hooks: `useX`
- Zustand hooks: `useXStore`
- Services: lowerCamelCase ending in `Service` or pluralized domain objects (`pipelinesService`)
- Types and interfaces: PascalCase
- Booleans: `is*`, `has*`, `should*`, or clear state names like `demoMode`
- Preserve Azure DevOps naming for IDs and params: `repoId`, `prId`, `buildId`, `releaseId`

---

## Error Handling

- Reuse `ApiError` patterns in the API layer when possible.
- Convert transport failures into user-meaningful messages near the service/UI boundary.
- Safe fallbacks (empty arrays, `null`, disabled UI states) are acceptable when intentional.
- Do not swallow errors silently unless the fallback is explicit and harmless.
- `console.error` is acceptable in client bootstrap/effects when paired with a safe fallback.
- In API routes and server utilities, prefer typed results or thrown errors over log-only failures.

---

## State and Persistence

- Settings, selections, favorites, and demo state are persisted in browser storage.
- Keep storage keys backwards compatible unless the task explicitly changes persistence behavior.
- `settingsService.clear()` removes all `azdevops_*` keys; keep that in mind before adding new keys.
- `azdevops_push_token` stores the per-user webhook authentication token — cleared on push unsubscribe.
- Preserve demo mode when changing initialization, settings, or service flows.

---

## Styling Rules

- Prefer Tailwind utilities over ad hoc CSS files.
- Reuse existing tokens and theme variables from `src/app/globals.css`.
- Respect both dark and light mode behavior.
- Preserve the mobile/PWA layout, safe-area handling, and fixed top/bottom shell spacing.
- Avoid introducing a second design system.
- The visual language is slate/blue and Fluent-inspired; stay close to that palette unless extending an established pattern.

---

## Internationalisation (i18n)

The app uses `next-intl` for all user-facing text. Translation files live in `src/lib/i18n/`:

- `de.json` — German (default)
- `en.json` — English
- `index.ts` — exports `messages` map and `detectBrowserLocale()`

**Rules:**
- All user-facing strings must use `useTranslations("<namespace>")` from `next-intl` — no hardcoded display text in components.
- Code comments remain German; identifiers stay as-is.
- New UI text must be added to **both** `de.json` and `en.json` under the matching namespace.
- Translation namespaces map 1:1 to component or page scope (e.g. `"pipelines"`, `"prOverview"`, `"commentThread"`).
- Static utility functions that produce translated labels (e.g. `getBuildStatusLabel`, `getTimelineStatusLabel`) accept a `t` function as parameter — they do not import `next-intl` themselves.
- The active locale is managed by `LocaleProvider` in `Providers.tsx`. `setDemoLocale(locale)` is called synchronously in `Providers` so demo data fetches use the correct language from the first render.
- Demo data (`demoData.ts`) uses a module-level `LOCALE_STRINGS` map and an `ls()` helper to return locale-specific strings without React context.
- When adding a new locale-tagged React Query query for demo data, include `settings.demoMode` in the `queryKey`. On locale change, `LocaleProvider` invalidates `pr-policies` and `pr-threads` queries to flush stale translated content.

## Text and Comments

- Use real umlauts (ö, ä, ü, Ö, Ä, Ü) in all user-facing display strings. Transliterations (`oe`, `ae`, `ue`) may appear in code identifiers and older files — do not change those unless the task explicitly targets them.
- Add code comments only when behavior is non-obvious, platform-specific, or easy to break.

---

## Services and API Calls

- Keep Azure DevOps endpoint construction in services, not in components.
- Reuse Axios clients instead of creating ad hoc fetch wrappers for Azure DevOps.
- Use `URLSearchParams` when building multi-parameter query strings.
- Type response payloads with domain models and `AzureListResponse<T>` where appropriate.
- When changing push flows, keep user-to-subscription matching strict so notifications only go to subscribed, affected users.

---

## PWA and Push Notes

- `npm run dev` uses `next dev --experimental-https` and keeps PWA/service worker enabled by default for push testing.
- Set `PWA_IN_DEV=false` only when you intentionally want to disable PWA behavior in development.
- `public/sw-custom.js` is intentionally ignored by ESLint.
- Public icon files: `public/icons/icon-192.png` (192×192), `public/icons/icon-512.png` (512×512), `public/apple-touch-icon.png` (180×180). Do not add placeholder icons.
- Push support depends on secure context, PWA install requirements on iOS, and service worker availability.
- Webhook auth uses per-user token `?t=<webhookToken>` only. There is no global `WEBHOOK_SECRET`.
- Changes to push, service worker, or API route code should be validated with `npm run lint && npm run build`.

---

## Shared Utilities (`src/lib/utils/`)

- `timeAgo.ts` — relative time formatting; accepts a `t` function from `useTranslations("common")` for locale-aware output
- `gitUtils.ts` — branch display helpers (`shortBranchName`, `branchIcon`)
- `selectionLabel.ts` — summary label for multi-select states
- `buildStatus.ts` — `getBuildStatusVariant(status)` and `getBuildStatusLabel(status, t)` — `t` comes from `useTranslations("buildStatus")`
- `timelineUtils.ts` — all pipeline timeline types, constants, and pure functions (`buildTimelineView`, `formatDuration`, `getTimelineStatusLabel(status, t)`, etc.)
- `fileTypes.ts`, `imageText.ts`, `unifiedDiff.ts`, `errorUtils.ts` — existing utilities, unchanged

---

## Shared Hooks (`src/lib/hooks/`)

- `useCurrentUser.ts` — loads the Azure DevOps current user once; used on pages that need the GUID
- `usePushState.ts` — bundles push support/permission/subscription state + `refresh()`; replaces manual push `useEffect` blocks on settings and push-test pages
- `useRepoExplorer.ts` — all state, queries, and handlers for the explorer page
- `usePRDetail.ts` — all state, queries, mutations, and computed values for the PR detail page; returns an `h` object consumed by the page and sub-components
- `useAzureClient.ts`, `usePullToRefresh.ts` — existing hooks, unchanged

---

## Shared UI Components (`src/components/ui/`)

- `TabBar.tsx` — generic tab bar used across detail pages
- `ApprovalModal.tsx` — reusable confirmation modal
- `BuildStatusIndicator.tsx` — coloured status dot + label
- `WebhookUrlBox.tsx` — read-only webhook URL display with copy button
- `PushSupportHint.tsx` — push-support status hint block
- `PullToRefreshIndicator.tsx` — spinner shown during pull-to-refresh

---

## Explorer (`src/app/explorer/page.tsx` + `src/components/explorer/`)

- Page is ~33 lines; all logic lives in `useRepoExplorer` hook.
- Sub-components: `RepoExplorer`, `FileTree`, `FileViewer`, `FileHistoryView`, `BranchCompareView`, `CommitDiffView`, `CommitList`, `CommitSheet`, `NewFileSheet`, `BranchList`, `ChangeTypeDot`

---

## PR Detail Page (`src/app/pull-requests/[repoId]/[prId]/page.tsx`)

- Page is ~256 lines; all state/queries/mutations live in `usePRDetail` hook (result stored as `h`).
- **Tabs**: `uebersicht` | `dateien` | `kommentare` | `commits`
- **Tab components** in `src/components/pr/`: `PRTabOverview`, `PRTabFiles`, `PRTabComments`, `PRTabCommits`
- **Modal components** in `src/components/pr/`: `PRVoteModal`, `PRCompleteModal`, `PRReviewerModal`
- **Primitives** in `src/components/pr/`: `VoteBadge`, `ChangeTypeDot`, `CommentItem`, `CommentThread`
- **Merge blocker**: Computed from PR data (isDraft, mergeStatus, reviewer votes, policies, comments) — no extra API call
- **Files tab**: `getIterationChanges` for last iteration + `RichDiffViewer`
- **Commits tab**: Iteration list clickable → file list + diff per `versionType: "commit"`
- **Comments tab**: Threads with reply function (`replyToThread`), then new comment form
- **Reviewer management**: Add (from `identityService.listTeamMembers`), remove, required/optional via `addReviewer` upsert

---

## Pipelines (`src/app/pipelines/page.tsx` + `src/app/pipelines/[buildId]/page.tsx`)

- List page is ~198 lines; modals extracted to `src/components/pipelines/`.
- `StartPipelineModal.tsx` — self-contained; props: `open, pipeline, isPending, error, onClose, onStart(branchRef, params)`
- `CreatePipelineModal.tsx` — self-contained; props: `open, isPending, error, repositories, pipelineFolders, onClose, onSubmit(data)`
- Detail page is ~214 lines; timeline logic extracted to `timelineUtils.ts` and `TimelineView.tsx`.
- `TimelineView.tsx` exports: `getStatusIcon`, `JobsSummaryCards`, `TimelineNodeSection`, `LogSelector`

---

## Settings (`src/app/settings/page.tsx` + `src/components/settings/`)

- Page is ~210 lines; JSX split into two section components.
- `ConnectionSettings.tsx` — theme + Azure DevOps config form + PAT link + test result + action buttons
- `PushNotificationsSection.tsx` — push toggle/status section; uses `PushSupportStatus` / `PushPermissionState` from `pushService`

---

## Service Layer Reference

### `pullRequestsService` (`src/lib/services/pullRequestsService.ts`)

All methods follow the `isDemoClient(client)` pattern:

- `addReviewer(reviewerId, isRequired)` — PUT `reviewers/{id}`
- `removeReviewer(reviewerId)` — DELETE `reviewers/{id}`
- `replyToThread(threadId, content)` — POST `threads/{threadId}/comments`
- `updateThreadStatus(threadId, status)` — PATCH `threads/{threadId}`
- `editComment(threadId, commentId, content)` — PATCH `threads/{threadId}/comments/{id}`
- `deleteComment(threadId, commentId)` — DELETE `threads/{threadId}/comments/{id}`
- `getIterationChanges(prId, iterationId)` — returns `{ changeEntries }` (used for files and commits tabs)

### `identityService` (`src/lib/services/identityService.ts`)

- `getCurrentUser(client)` — via `/_apis/connectionData` (stable GUID for vote/reviewer assignment)
- `listTeamMembers(client, project)` — default team members (for reviewer picker in PR)

---

## When Making Changes

- Check the nearest file in the same folder and follow its local pattern first.
- Avoid broad refactors unless required by the task.
- Do not remove or rewrite surrounding German copy unless the task calls for it.
- Keep route behavior, storage behavior, and demo compatibility stable by default.

---

## Documentation Maintenance

- Update this file whenever scripts, tooling, architecture, or conventions change.
- If tests are introduced later, update both the test section and the single-test guidance.
- If Cursor, Copilot, or other agent instruction files are added, fold their rules into this file instead of duplicating them elsewhere.
