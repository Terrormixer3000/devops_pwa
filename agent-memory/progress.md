# Projektfortschritt

## Implementiert

### Grundgerüst
- [x] Next.js 15 mit TypeScript, Tailwind v4, App Router
- [x] PWA: next-pwa, manifest.json, Icons (192/512px), iOS Meta-Tags
- [x] App Shell: Root Layout, Bottom Navigation (6 Tabs), AppBar mit Repo-Selector
- [x] Providers: QueryClient, App-Init (Settings + Repos laden)
- [x] Dark Mode by default (slate-950)
- [x] Alle TypeScript-Typen (`src/types/index.ts`)

### Services & API
- [x] Axios-Client Factory (Azure + VSRM)
- [x] settingsService (localStorage)
- [x] favoritesService (localStorage)
- [x] repositoriesService (list, branches, commits, tree, file content)
- [x] pullRequestsService (list, get, threads, comment, vote, complete, create, iterations, changes)
- [x] pipelinesService (list, builds, get, timeline, log, artifacts, queue, cancel)
- [x] releasesService (definitions, releases, create, approvals, approve/reject)

### Stores
- [x] settingsStore (Zustand)
- [x] repositoryStore (Zustand + Persistenz)

### Seiten
- [x] /dashboard – Übersicht mit Schnellzugriff, PRs, Builds
- [x] /settings – PAT, Org, Projekt, Verbindungstest
- [x] /pull-requests – Liste mit Status-Filter, Multi-Repo Aggregation
- [x] /pull-requests/new – PR erstellen
- [x] /pull-requests/[repoId]/[prId] – Details, Tabs, Kommentare, Approval, Files, Commits
- [x] /explorer – Branches, Commits, Dateibaum, Dateiinhalt
- [x] /pipelines – Build-Runs + Pipeline-Definitionen, Build starten
- [x] /pipelines/[buildId] – Details, Timeline, Logs, Artefakte
- [x] /releases – Releases, Definitionen, Approvals
- [x] /releases/[releaseId] – Release-Details mit Umgebungsstatus

### UI-Komponenten
- [x] Button (5 Varianten, Loading-State)
- [x] Badge (6 Varianten)
- [x] Sheet (Bottom Sheet, iOS-Stil)
- [x] Modal (Zentrierter Dialog)
- [x] LoadingSpinner + PageLoader
- [x] ErrorMessage mit Retry
- [x] EmptyState

## In Arbeit
- Alle Kernfunktionen implementiert

## Als nächstes (mögliche Erweiterungen)
- Pull Request Diff-Ansicht (Zeilen-Diff)
- Offline-Support verbessern
- Push Notifications für PR-Status
- Biometrische Sicherung für PAT
- Dark/Light Mode Umschalter
- Commit-Details-Ansicht
- Pipeline-Parameter beim Starten
- Suche / Filter in Listen
- Pagination für lange Listen

## Bekannte Probleme
- PR Vote: Reviewer-ID muss aus dem PR-Objekt ermittelt werden (aktuell Fallback)
- Build-Log: Logfile-ID wird aus URL geparst (fragil)
- Icons: Einfache Platzhalter-PNGs, sollten durch echte Icons ersetzt werden
