# Azure DevOps Mobile Client – Projektübersicht

## Ziel
Mobile-first Progressive Web App (PWA) als Azure DevOps Client für iPhone.
Kein vollständiger Ersatz der Weboberfläche, sondern ein produktiver Mobilclient
für die häufigsten DevOps-Aufgaben.

## Kernfunktionen
- Pull Requests lesen, kommentieren, approven, mergen, erstellen
- Code Explorer: Branches, Commits, Dateistruktur, Dateiinhalt anzeigen
- Build-Pipelines: Liste, Details, Logs, Artefakte, starten, abbrechen
- Release-Pipelines: Liste, starten, Approvals erteilen/ablehnen
- Repository-Auswahl mit Favoriten und Mehrfachauswahl
- Dashboard mit Schnellzugriff

## Technologien
- **Framework:** Next.js 15 (App Router)
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Daten-Fetching:** TanStack React Query
- **HTTP-Client:** Axios
- **Icons:** Lucide React
- **Datum:** date-fns (de Locale)
- **PWA:** next-pwa (Workbox)
- **API:** Azure DevOps REST API v7.1

## Plattform
- Mobile-first, primär für iPhone optimiert
- PWA: installierbar, offline-fähig (Service Worker via next-pwa)
- Dark Mode by default (slate-950 Hintergrund)
- Safe Areas für iPhone Notch/Home-Indicator

## Authentifizierung
- Personal Access Token (PAT) – lokal im localStorage gespeichert
- Konfiguration in /settings: Organisation, Projekt, PAT
- Architektur bereit für späteres Backend/BFF

## Sprachkonvention
- Kommentare im Code: **Deutsch**
- UI-Texte: **Deutsch**
