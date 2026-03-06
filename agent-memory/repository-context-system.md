# Repository-Kontext-System

## Übersicht
Die App arbeitet repository-zentriert. Repositories werden global im
`repositoryStore` (Zustand) verwaltet und beeinflussen alle Hauptansichten.

## Modi

### Single-Repo-Modus
- Genau ein Repository ausgewählt
- Genutzt für: Code Explorer, PR-Details, Build-Details

### Multi-Repo-Modus
- Mehrere Repositories gleichzeitig ausgewählt
- Genutzt für: PR-Liste, Pipeline-Liste
- Aggregierte Daten mit Repository-Label je Eintrag

## Favoriten-System

### Datenspeicherung
```
localStorage['azdevops_favorites'] = '["repo-id-1", "repo-id-2"]'
```

### Verhalten
- Standard: Nur Favoriten anzeigen
- Wenn keine Favoriten: alle Repositories anzeigen
- Umschalter "Favoriten / Alle" im Repository-Sheet

### Editieren
- Stern-Button in der Repository-Liste → Favorit togglen
- Sofortige Persistenz in localStorage

## Persistenz der Auswahl
```
localStorage['azdevops_selected_repos'] = '[{id, name, project, ...}]'
```
Wird beim App-Start wiederhergestellt.

## Verhalten je Modul

| Modul          | Multi-Repo | Einzeln | Hinweis |
|----------------|------------|---------|---------|
| Dashboard      | Ja (Info)  | Ja      | Zeigt PRs aus erstem Repo |
| Pull Requests  | Ja         | Ja      | Aggregiert, sortiert nach Datum |
| Code Explorer  | Nein       | Ja      | Immer Single-Repo |
| Pipelines      | Ja         | Ja      | Builds global (kein Repo-Filter) |
| Releases       | Nein       | Nein    | Kein direkter Repo-Bezug |

## AppBar Repository-Selector

### Implementierung
- Öffnet ein Bottom-Sheet (iOS-Stil)
- Zeigt Favoriten oder alle Repositories
- Häkchen-Markierung für ausgewählte Repos
- Stern-Button für Favoriten
- Mehrfachauswahl: Alle togglebar, Bestätigen-Button

### Props
```tsx
<AppBar
  title="Seitenname"
  showRepoSelector={true}   // Selector anzeigen?
  multiSelect={true}        // Mehrfachauswahl erlauben?
/>
```

## Repository-Loading
Repositories werden beim App-Start in `Providers.tsx` geladen:
1. Settings laden (settingsStore)
2. Favoriten laden (repositoryStore)
3. Gespeicherte Auswahl laden (repositoryStore)
4. Repositories von API laden → setRepositories()
