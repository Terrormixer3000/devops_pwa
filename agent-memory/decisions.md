# Architekturentscheidungen

## Entscheidung: Next.js App Router statt Pages Router
**Kontext:** Auswahl des Routing-Systems
**Begründung:** App Router ist der moderne Standard in Next.js 13+. Server Components ermöglichen bessere Performance, async/await in Komponenten ist sauberer.
**Alternativen:** Pages Router (älter, aber stabiler), Vite+React (kein SSR/SSG).

---

## Entscheidung: Zustand statt Redux/Context für State
**Kontext:** Globaler State (Settings, Repository-Auswahl)
**Begründung:** Zustand ist leichtgewichtig, kein Boilerplate, einfache localStorage-Integration, React-Query für Server-State.
**Alternativen:** Redux Toolkit (zu schwer), React Context (Performance-Probleme bei häufigen Updates).

---

## Entscheidung: TanStack React Query für Datenfetching
**Kontext:** Caching, Refetching, Loading/Error-States
**Begründung:** Automatisches Caching, staleTime-Konfiguration, refetchInterval für Live-Daten (Builds, Releases), einfaches Invalidieren nach Mutationen.
**Alternativen:** SWR (weniger Features), manuelles Fetching (zu viel Boilerplate).

---

## Entscheidung: localStorage für PAT-Speicherung (MVP)
**Kontext:** Authentifizierungssicherheit
**Begründung:** MVP-Ansatz. Einfach, funktioniert ohne Backend. Für eine echte Produktivapp sollte ein Backend/BFF die Token verschlüsselt speichern.
**Alternativen:** sessionStorage (geht bei App-Neustart verloren), Backend (zu komplex für MVP).

---

## Entscheidung: Tailwind CSS v4 (kein CSS Modules)
**Kontext:** Styling-Ansatz
**Begründung:** Utility-first passt gut zu Mobile-first UI. Schnelle Iteration, konsistente Dark-Mode-Farben, keine CSS-Datei-Proliferation.
**Alternativen:** CSS Modules (mehr Kontrolle), styled-components (zu schwer für eine PWA).

---

## Entscheidung: VSRM-Host für Release-API
**Kontext:** Azure DevOps Release-Pipelines
**Begründung:** Release-APIs laufen auf `vsrm.dev.azure.com` (nicht `dev.azure.com`). Separater Axios-Client nötig.
**Alternativen:** Keine (API-Vorgabe von Microsoft).

---

## Entscheidung: Bottom Sheet für Repository-Auswahl
**Kontext:** Repository-Selector UX auf mobilen Geräten
**Begründung:** Bottom Sheet ist iOS-natives Pattern, einfach mit einem Daumen bedienbar, zeigt viel Inhalt ohne vollbildschirm.
**Alternativen:** Dropdown/Popover (zu klein), Vollbildseite (Navigation-Overhead).

---

## Entscheidung: Alle Kommentare auf Deutsch
**Kontext:** Codebase-Sprache
**Begründung:** Explizite Benutzeranforderung. UI-Texte und Code-Kommentare auf Deutsch.
**Alternativen:** Englisch (internationaler Standard).
