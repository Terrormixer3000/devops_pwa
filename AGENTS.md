# AGENTS.md

## Purpose
- This repository is a mobile-first Azure DevOps PWA built with Next.js App Router, React 19, TypeScript, Tailwind CSS v4, React Query, Axios, Zustand, and `next-pwa`.
- Follow repository conventions over generic framework defaults.
- Keep changes narrow, readable, and compatible with demo mode and the current app shell.

## Instruction Files
- `AGENTS.md` already exists in the repo and should be kept current.
- No `.cursorrules` file was found.
- No files were found under `.cursor/rules/`.
- No `.github/copilot-instructions.md` file was found.
- If any of those files are added later, merge their repo-specific guidance into this file.

## Repository Layout
- Routes live in `src/app`.
- Shared UI primitives live in `src/components/ui`.
- App shell and navigation live in `src/components/layout`.
- API clients live in `src/lib/api`.
- Domain/service wrappers live in `src/lib/services`.
- Server-only helpers for API routes live in `src/lib/server`.
- Zustand stores live in `src/lib/stores`.
- Shared domain and API types live in `src/types/index.ts`.
- Demo/mock state lives in `src/lib/mocks/demoData.ts`.
- Static files and PWA assets live in `public/`.
- Note: `src/components/pipelines`, `src/components/pr`, `src/components/releases`, `src/components/explorer`, `src/components/repos` and `src/app/repositories` do not exist; do not recreate them unless adding actual files.

## Tooling Snapshot
- Package manager: `npm`.
- Framework: Next.js 16 App Router.
- TypeScript is `strict`.
- Path alias: `@/* -> src/*`.
- Linting: ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Styling: Tailwind CSS v4 plus global theme tokens in `src/app/globals.css`.
- PWA: `next-pwa` with a custom service worker at `public/sw-custom.js`.
- There is currently no automated test runner configured.

## Commands
- Install dependencies: `npm install`
- Dev server with HTTPS: `npm run dev` (webpack mode, uses certs from `certificates/localhost.pem` and `certificates/localhost-key.pem`)
- Production build: `npm run build` (webpack mode)
- Production server: `npm run start`
- Lint: `npm run lint`

## Test Commands
- There is no `test` script in `package.json`.
- No Jest, Vitest, Playwright, or Cypress config is present.
- No `*.test.*` or `*.spec.*` files are currently part of the repo workflow.
- If asked to run tests, say clearly that no test harness exists yet.

## Single-Test Guidance
- There is currently no supported single-test command because no test framework is installed.
- Do not invent `npm test`, `jest`, or `vitest` commands.
- If a test runner is added later, document the exact single-test command here immediately.

## Validation Expectations
- Minimum validation for most code changes: `npm run lint`.
- Run `npm run lint && npm run build` for route, config, typing, service worker, or API route changes.
- Because no automated tests exist, lint and build are the primary verification steps.

## Current Verified State
- `npm run lint` is expected to pass.
- `npm run build` is expected to pass.

## Architecture Notes
- Keep Azure DevOps REST details inside service modules, not inside page components.
- Use `createAzureClient` and `createVsrmClient` for authenticated API access.
- Demo mode is first-class; new service methods should preserve `isDemoClient(client)` behavior where relevant.
- Global bootstrapping happens in `src/components/layout/Providers.tsx`.
- UI data fetching is primarily handled with React Query.
- Cross-page client state and persistence are handled with Zustand stores.
- Push notifications use API routes under `src/app/api/push/*`, a local JSON subscription store in `data/subscriptions.json`, and `public/sw-custom.js`.
- Each push subscription has a `webhookToken` (64 hex chars, 256-bit entropy) generated at registration time and stored in `data/subscriptions.json`.
- The webhook endpoint `POST /api/push/webhook` requires `?t=<webhookToken>` — no `WEBHOOK_SECRET` env var.
- The token is stored in the browser under `localStorage` key `azdevops_push_token` by `pushService`.
- Push setup is gated behind a 5-step wizard at `/push-setup`. The `/settings` page and `/push-test` page only show toggle/status UI after the wizard has been completed (token present in localStorage).

## Imports
- Use ES modules only.
- Group imports in this order: external packages, `@/` imports, then relative imports.
- Prefer `@/*` imports for code under `src`.
- Use relative imports only for nearby siblings when they improve clarity.
- Use `import type` for type-only imports when practical.
- Keep imports stable and easy to scan; strict alphabetization is less important than consistency.

## Formatting
- Match the existing style: semicolons, double quotes, trailing commas where valid.
- Use 2-space indentation.
- Prefer multi-line JSX when a one-line version is hard to scan.
- Keep objects and arrays compact when they remain readable.
- Favor readability over aggressive line wrapping.

## TypeScript Rules
- Preserve `strict` compatibility.
- Prefer explicit interfaces for shared shapes and API payloads.
- Keep shared types centralized in `src/types/index.ts`.
- Avoid `any`; prefer `unknown`, unions, generics, or exact interfaces.
- Keep literal unions narrow; do not widen to `string` unless necessary.
- Type async return values explicitly in services and route handlers.
- Mark properties optional only when they are truly absent in API or UI flows.

## React And Next.js Conventions
- Add `"use client"` only when hooks, browser APIs, or client interactivity are required.
- `page.tsx` and `layout.tsx` files use default exports.
- Prefer named exports outside route modules.
- Keep components focused; extract helpers when a page grows difficult to scan.
- Prefer local helper components for repeated JSX inside a page.
- Guard browser-only APIs when code can run during SSR or build.

## Naming Conventions
- Components: PascalCase (`AppBar`, `SelectionSheet`).
- Hooks: `useX`.
- Zustand hooks: `useXStore`.
- Services: lowerCamelCase ending in `Service` or pluralized domain objects (`pipelinesService`).
- Types and interfaces: PascalCase.
- Booleans: `is*`, `has*`, `should*`, or clear state names like `demoMode`.
- Preserve Azure DevOps naming for IDs and params: `repoId`, `prId`, `buildId`, `releaseId`.

## Error Handling
- Reuse `ApiError` patterns in the API layer when possible.
- Convert transport failures into user-meaningful messages near the service/UI boundary.
- Safe fallbacks are common in this repo; empty arrays, `null`, and disabled UI states are acceptable when intentional.
- Do not swallow errors silently unless the fallback is explicit and harmless.
- `console.error` is acceptable in client bootstrap/effects when paired with a safe fallback.
- In API routes and server utilities, prefer typed results or thrown errors over log-only failures.

## State And Persistence
- Settings, selections, favorites, and demo state are persisted in browser storage.
- Keep storage keys backwards compatible unless the task explicitly changes persistence behavior.
- `settingsService.clear()` removes all `azdevops_*` keys; keep that behavior in mind before adding new keys.
- `azdevops_push_token` stores the per-user webhook authentication token — cleared on push unsubscribe.
- Preserve demo mode when changing initialization, settings, or service flows.

## Styling Rules
- Prefer Tailwind utilities over ad hoc CSS files.
- Reuse existing tokens and theme variables from `src/app/globals.css`.
- Respect both dark and light mode behavior.
- Preserve the mobile/PWA layout, safe-area handling, and fixed top/bottom shell spacing.
- Avoid introducing a second design system.
- The visual language is slate/blue and Fluent-inspired; stay close to that palette unless extending an established pattern.

## Text, Language, And Comments
- Existing user-facing copy is primarily German.
- Keep new UI text consistent with the surrounding screen language.
- Prefer ASCII in edited files; the repo often uses transliterations such as `ae`, `oe`, and `ue`.
- Add comments only when behavior is non-obvious, platform-specific, or easy to break.

## Services And API Calls
- Keep Azure DevOps endpoint construction in services, not in components.
- Reuse Axios clients instead of creating ad hoc fetch wrappers for Azure DevOps.
- Use `URLSearchParams` when building multi-parameter query strings.
- Type response payloads with domain models and `AzureListResponse<T>` where appropriate.
- When changing push flows, keep user-to-subscription matching strict so notifications only go to subscribed, affected users.

## PWA And Push Notes
- `npm run dev` uses `next dev --experimental-https` and keeps PWA/Service Worker enabled by default for push testing.
- Set `PWA_IN_DEV=false` only when you intentionally want to disable PWA behavior in development.
- `public/sw-custom.js` is intentionally ignored by ESLint.
- Public icon files: `public/icons/icon-192.png` (192x192), `public/icons/icon-512.png` (512x512), `public/apple-touch-icon.png` (180x180, derived from icon-512). Do not add placeholder icons.
- Push support depends on secure context, PWA install requirements on iOS, and service worker availability.
- Webhook auth uses per-user token `?t=<webhookToken>` only. There is no global `WEBHOOK_SECRET`.
- Changes to push, service worker, or API route code should always be validated with `npm run lint && npm run build`.

## When Making Changes
- Check the nearest file in the same folder and follow its local pattern first.
- Avoid broad refactors unless required by the task.
- Do not remove or rewrite surrounding German copy unless the task calls for it.
- Keep route behavior, storage behavior, and demo compatibility stable by default.

## Documentation Maintenance
- Update this file whenever scripts, tooling, architecture, or conventions change.
- If tests are introduced later, update both the general test section and the single-test guidance.
- If Cursor or Copilot instruction files appear later, fold their rules into this file instead of duplicating them elsewhere.
