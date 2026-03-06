# Azure DevOps Mobile Client

Mobile-first Progressive Web App (PWA) als Azure DevOps Client für iPhone.

## Funktionen

- **Pull Requests** – Liste, Details, Kommentare, Approval, Complete, Erstellen
- **Code Explorer** – Branches, Commits, Dateistruktur, Dateiinhalt
- **Pipelines** – Build-Liste, Details, Timeline, Logs, Artefakte, starten/abbrechen
- **Release-Pipelines** – Liste, starten, Approvals erteilen/ablehnen
- **Repository-Auswahl** – Favoriten, Mehrfachauswahl, persistente Auswahl
- **Dashboard** – Schnellzugriff und Übersicht

## Starten

### Voraussetzungen
- Node.js >= 18
- npm

### Installation

```bash
npm install
npm run dev
```

App öffnen unter: `http://localhost:3000`

### Produktions-Build

```bash
npm run build
npm start
```

## Einrichtung

1. App öffnen → automatisch zu `/settings` weitergeleitet (wenn nicht konfiguriert)
2. **Organisation** eingeben (z.B. `meine-firma` aus `dev.azure.com/meine-firma`)
3. **Standardprojekt** eingeben
4. **Personal Access Token (PAT)** eingeben

### PAT-Berechtigungen

Der PAT benötigt mindestens:
- Code: Read
- Pull Request Threads: Read & Write
- Build: Read & Execute
- Release: Read, Write & Execute

## Als PWA installieren (iPhone)

1. Safari öffnen → URL der App eingeben
2. Teilen-Symbol → "Zum Home-Bildschirm"
3. App erscheint als Icon auf dem Home-Bildschirm

## Technologiestack

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 15 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Datenfetching | TanStack React Query |
| HTTP | Axios |
| Icons | Lucide React |
| PWA | next-pwa (Workbox) |
| API | Azure DevOps REST API v7.1 |

## Projektstruktur

```
src/
├── app/              # Seiten (Next.js App Router)
├── components/       # UI-Komponenten und Layout
├── lib/
│   ├── api/          # Axios-Client Factory
│   ├── hooks/        # React Hooks
│   ├── services/     # API-Serviceschicht
│   └── stores/       # Zustand Stores
└── types/            # TypeScript Typen
agent-memory/         # Persistente Wissensbasis fuer Agenten
```

## Agent Memory System

Das Verzeichnis `agent-memory/` enthält Markdown-Dateien mit persistentem Kontext für Claude Code und OpenAI Codex:

- `project-overview.md` – Projektziel und Technologien
- `architecture.md` – Projektstruktur und Module
- `api-integration.md` – Azure DevOps REST API Dokumentation
- `repository-context-system.md` – Repo-Auswahl und Favoriten
- `progress.md` – Implementierungsfortschritt
- `decisions.md` – Architekturentscheidungen
- `current-focus.md` – Aktueller Entwicklungsfokus

## Datenschutz

PAT und Einstellungen werden ausschliesslich lokal im Browser (`localStorage`) gespeichert. Es findet keine Übertragung an externe Server statt.
