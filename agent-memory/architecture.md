# Architektur

## Projektstruktur

```
src/
├── app/                        # Next.js App Router Seiten
│   ├── dashboard/page.tsx      # Startseite / Übersicht
│   ├── pull-requests/
│   │   ├── page.tsx            # PR-Liste (Multi-Repo)
│   │   ├── new/page.tsx        # Neuen PR erstellen
│   │   └── [repoId]/[prId]/page.tsx  # PR-Details
│   ├── explorer/page.tsx       # Code Explorer (Branches, Commits, Dateien)
│   ├── pipelines/
│   │   ├── page.tsx            # Pipeline/Build Liste
│   │   └── [buildId]/page.tsx  # Build Details
│   ├── releases/
│   │   ├── page.tsx            # Release Liste + Approvals
│   │   └── [releaseId]/page.tsx # Release Details
│   ├── settings/page.tsx       # Einstellungen (PAT, Org, Projekt)
│   ├── layout.tsx              # Root Layout mit Providers + BottomNav
│   └── globals.css             # Globale Styles (Tailwind + Custom)
│
├── components/
│   ├── layout/
│   │   ├── AppBar.tsx          # Top-Leiste mit Repository-Auswahl
│   │   ├── BottomNav.tsx       # Untere Navigation (6 Tabs)
│   │   └── Providers.tsx       # QueryClient + App-Init (Settings/Repos laden)
│   └── ui/
│       ├── Badge.tsx           # Status-Badges (success/danger/warning/info/muted)
│       ├── Button.tsx          # Wiederverwendbarer Button mit Varianten
│       ├── EmptyState.tsx      # Leere-Liste Platzhalter
│       ├── ErrorMessage.tsx    # Fehlermeldung mit Retry
│       ├── LoadingSpinner.tsx  # Ladeanimation + PageLoader
│       ├── Modal.tsx           # Zentrierter Dialog
│       └── Sheet.tsx           # Bottom Sheet (iOS-Stil)
│
├── lib/
│   ├── api/
│   │   └── client.ts           # Axios-Client Factory (Azure + VSRM)
│   ├── hooks/
│   │   └── useAzureClient.ts   # React Hook: gibt Axios-Clients zurück
│   ├── services/               # API-Serviceschicht (je Domain)
│   │   ├── settingsService.ts
│   │   ├── favoritesService.ts
│   │   ├── repositoriesService.ts
│   │   ├── pullRequestsService.ts
│   │   ├── pipelinesService.ts
│   │   └── releasesService.ts
│   └── stores/                 # Zustand Stores
│       ├── settingsStore.ts    # PAT, Organisation, Projekt
│       └── repositoryStore.ts  # Repositories, Auswahl, Favoriten
│
└── types/
    └── index.ts                # Alle TypeScript Typen
```

## State Management

### settingsStore (Zustand)
- `settings: AppSettings | null` – Organisation, Projekt, PAT
- `isConfigured: boolean` – alle drei Felder gesetzt?
- `loadSettings()`, `setSettings()`, `clearSettings()`

### repositoryStore (Zustand)
- `repositories: Repository[]` – alle verfügbaren Repos
- `selectedRepositories: Repository[]` – aktuell ausgewählt (Single/Multi)
- `favorites: string[]` – IDs der Favoriten-Repos
- `showAllRepos: boolean` – Favoriten vs. alle anzeigen
- Persistenz: localStorage (Auswahl + Favoriten)

## API-Schicht

### createAzureClient(settings) → AxiosInstance
- Basis-URL: `https://dev.azure.com/{org}`
- Auth: Basic Token (`:PAT` Base64-kodiert)
- Fehler-Interceptor: 401/403/404 → ApiError

### createVsrmClient(settings) → AxiosInstance
- Basis-URL: `https://vsrm.dev.azure.com/{org}`
- Für Release-Pipelines (anderer Host!)

## Navigation
- **Bottom Navigation:** Dashboard, PRs, Code, Pipelines, Releases, Settings
- **AppBar (oben):** Seitentitel + Repository-Auswahl (Sheet)
- **Repository-Sheet:** Favoriten/Alle, Mehrfachauswahl, Favoriten-Stern

## Repository-Kontext
- Code Explorer: immer Single-Repo
- PRs: Single oder Multi-Repo
- Pipelines: Single oder Multi-Repo
- Releases: kein direkter Repo-Bezug

## PWA
- `next-pwa` mit Workbox Service Worker
- `manifest.json` in /public
- iOS: apple-mobile-web-app-capable, apple-touch-icon
- Safe Areas: env(safe-area-inset-*)
