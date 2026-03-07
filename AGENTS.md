# AGENTS.md

## Purpose
- This repository is a mobile-first Azure DevOps PWA built with Next.js App Router, React 19, TypeScript, Tailwind CSS v4, React Query, Axios, and Zustand.
- Use this file as the working agreement for agentic coding tools operating inside this repo.
- Prefer repository-specific conventions over generic framework defaults.

## Project Shape
- App routes live in `src/app`.
- Shared UI primitives live in `src/components/ui`.
- Layout and app-shell components live in `src/components/layout`.
- API clients and service wrappers live in `src/lib/api` and `src/lib/services`.
- Zustand stores live in `src/lib/stores`.
- Shared types live in `src/types/index.ts`.
- Demo/mock data lives in `src/lib/mocks/demoData.ts`.

## Tooling Snapshot
- Package manager: `npm` (`package-lock.json` is committed).
- Framework: Next.js 16 App Router.
- Language: TypeScript (`.ts` / `.tsx`) with `strict: true`.
- Styling: Tailwind CSS v4 plus custom tokens in `src/app/globals.css`.
- Linting: ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Testing: no automated test framework is currently configured.

## Commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Create production build: `npm run build`
- Start production server: `npm run start`
- Run lint: `npm run lint`

## Verified Commands
- `npm run lint` passes in the current repository state.
- `npm run build` passes in the current repository state.

## Test Status
- There is no `test` script in `package.json`.
- No Jest, Vitest, Playwright, or Cypress config was found.
- No `*.test.*` or `*.spec.*` files were found.
- If you are asked to run tests, state clearly that this repo currently has no test harness.

## Single-Test Guidance
- There is currently no supported command for running a single test because no test framework is installed.
- Do not invent `npm test`, `vitest`, or `jest` commands unless you add that tooling first.
- If a future test runner is added, document the exact single-test command here immediately.

## Build And Validation Expectations
- For code changes, run `npm run lint` at minimum.
- Run `npm run build` when changes could affect routing, typing, configuration, or bundling.
- Because there is no test suite, lint/build are the main verification steps.

## Missing Instruction Files
- No `AGENTS.md` existed before this file.
- No `.cursorrules` file was found.
- No files were found under `.cursor/rules/`.
- No `.github/copilot-instructions.md` file was found.
- If any of those files are added later, merge their guidance into this file rather than duplicating contradictory rules.

## Architecture Notes
- Fetching is centralized in service objects such as `pipelinesService`, `pullRequestsService`, and `repositoriesService`.
- `createAzureClient` and `createVsrmClient` wrap Axios setup and API error mapping.
- Demo mode is a first-class path; many services branch on `isDemoClient(client)`.
- Global app initialization happens in `src/components/layout/Providers.tsx`.
- Persistent client-side state is managed with Zustand stores.
- Data fetching in UI uses React Query.

## Imports
- Use ES module syntax only.
- Keep imports grouped in this order: framework/external packages, `@/` aliases, then relative imports.
- Within a group, keep imports stable and readable; existing files generally sort by dependency importance rather than strict alphabetization.
- Prefer the `@/*` path alias for code under `src`.
- Use relative imports only for nearby siblings when it materially improves clarity.
- Import types with `import type` when the imported symbol is type-only and the file already follows that pattern.

## Formatting
- Match the existing style: semicolons, double quotes, trailing commas where valid, and multi-line JSX when readability improves.
- Use 2-space indentation.
- Keep line length reasonable, but favor readability over forced wrapping.
- Preserve the existing compact object and array formatting style when a structure fits comfortably on one line.
- Use parentheses around multi-line conditional expressions and JSX branches when it improves scanning.

## TypeScript Rules
- Keep `strict` TypeScript compatibility.
- Prefer explicit interfaces and named types for shared shapes.
- Centralize reusable API/domain types in `src/types/index.ts`.
- Use inline prop types only for very small local components.
- Avoid `any`; use `unknown`, generics, discriminated unions, or precise interfaces instead.
- Add optional properties only when the API or UI truly permits absence.
- Preserve literal unions like `"active" | "completed"` instead of widening to `string`.
- Type service return values explicitly, especially for async functions.

## React And Next.js Conventions
- Use `"use client"` only in files that need client-only hooks, browser APIs, or interactivity.
- Route files under `src/app/**/page.tsx` and `src/app/layout.tsx` use default exports, which is standard for Next App Router.
- Outside of route modules, prefer named exports.
- Keep components focused; extract helpers when a page becomes hard to scan.
- Prefer small local helper components for repeated JSX blocks inside a page.
- Use React Query for server/stateful async reads in components.
- Use Zustand for cross-page client state and persisted selections/settings.

## Naming Conventions
- Components: PascalCase (`AppBar`, `SelectionSheet`).
- Hooks: `useX` (`useAzureClient`, `useSettingsStore`).
- Stores: `useXStore` for hooks, `XState` for store interfaces.
- Services: lowerCamelCase object names ending in `Service` or pluralized service domain (`pipelinesService`).
- Utility modules: lowerCamelCase or descriptive nouns (`unifiedDiff.ts`, `fileTypes.ts`).
- Types/interfaces: PascalCase.
- Boolean flags: `is*`, `has*`, `should*`, or clearly stateful names like `demoMode`.
- IDs and route params should preserve Azure DevOps naming where relevant (`buildId`, `releaseId`, `repoId`, `prId`).

## Error Handling
- Reuse `ApiError` for API-layer failures when appropriate.
- Convert transport errors into user-meaningful messages in the client/service layer.
- Fail safely in UI bootstrapping code; this repo often falls back to empty arrays or null state.
- Catch browser persistence failures where storage or parsing can fail.
- Do not silently swallow errors unless the fallback state is intentional and harmless.
- In non-UI infrastructure code, prefer returning typed results or throwing typed errors rather than logging only.
- In UI effects, `console.error` is acceptable when paired with a safe fallback.

## State And Persistence
- Settings and selections are persisted via browser storage.
- Guard all browser-only APIs with `typeof window !== "undefined"` when execution might happen during SSR/build.
- When clearing settings, maintain the existing pattern of clearing related persisted store keys as well.
- Keep demo mode compatible when changing state initialization or data loading flows.

## Styling Rules
- Prefer Tailwind utility classes for component styling.
- Reuse existing design tokens and theme variables from `src/app/globals.css`.
- Respect both dark and light theme behavior; this repo supports both through `data-theme` and token remapping.
- Preserve the mobile/PWA focus, safe-area handling, and fixed app-shell spacing variables.
- Avoid introducing a second competing design system.
- When adding colors, favor the established slate/blue Fluent-inspired palette.

## Content And Comments
- Existing UI text and comments are primarily in German.
- Keep new user-facing text consistent with the surrounding screen language.
- Prefer ASCII when editing text; the codebase often uses transliterations like `ae`, `ue`, and `oe`.
- Add comments only when the behavior is non-obvious, platform-specific, or easy to break.

## Services And API Calls
- Keep Azure DevOps REST details inside service modules, not scattered through UI components.
- Reuse the existing Axios clients instead of creating ad hoc fetch wrappers.
- Preserve demo-mode branches whenever adding service methods.
- Use `URLSearchParams` for query construction when multiple optional params are involved.
- Type API responses with `AzureListResponse<T>` and domain models from `src/types/index.ts`.

## When Making Changes
- Check whether the target file is a client component before using hooks or browser APIs.
- Follow the nearest existing pattern in the same folder before introducing a new abstraction.
- Avoid broad refactors unless they are required for the task.
- Do not remove German comments or copy unless you are intentionally rewriting the surrounding content.
- Keep route behavior, storage keys, and demo mode backwards compatible unless the task explicitly changes them.

## Preferred Verification For Agents
- For UI or logic changes: run `npm run lint`.
- For route/config/type changes: run `npm run lint && npm run build`.
- If a future test suite is added, run the most targeted test command first, then broader validation as needed.

## Documentation Maintenance
- Keep this file updated when scripts, tooling, or conventions change.
- If testing is added later, update both the general test section and the single-test guidance.
- If Cursor or Copilot instruction files are introduced later, fold their repository-specific rules into this file.
