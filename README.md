# Azure DevOps Mobile Client

A mobile-first Progressive Web App (PWA) for Azure DevOps — designed for iPhone, installable from Safari, with a native app feel.

> UI language: **German / English**. The app supports German and English. Language switches automatically based on browser locale or can be changed in settings.

---

## Features

- **Dashboard** — Quick overview and navigation
- **Pull Requests** — List, details, comments, approvals, complete, create
- **Code Explorer** — Branches, commits, file tree, file content, diffs
- **Pipelines** — Build list, details, timeline, logs, artifacts, start/cancel, YAML creation
- **Release Pipelines** — List, trigger, approve/reject gates
- **Repository Selection** — Favorites, multi-select, persistent selection
- **Push Notifications** — Webhook-based notifications via service worker (requires HTTPS + PWA install)
- **Demo Mode** — Try the app without an Azure DevOps account

---

## Tech Stack

| Area | Technology |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Data fetching | TanStack React Query |
| HTTP | Axios |
| Icons | Lucide React |
| PWA | next-pwa (Workbox) |
| i18n | next-intl (de / en) |
| Azure DevOps API | REST API v7.1 |

---

## Prerequisites

- Node.js >= 18
- npm

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/devops_pwa.git
cd devops_pwa
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the values. Push notifications require VAPID keys — generate them with:

```bash
npx web-push generate-vapid-keys
```

### 3. HTTPS certificates (development)

The dev server requires HTTPS for service worker and PWA functionality. Generate a local certificate:

```bash
mkdir -p certificates
npx mkcert -install
npx mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost
```

Or use any other local CA tool. The cert paths are configured in `package.json`.

### 4. Start the dev server

```bash
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

---

## Production Build

```bash
npm run build
npm run start
```

For production deployments that use push notifications, the app must be served over HTTPS and accessible from the internet so Azure DevOps service hooks can reach the webhook endpoint.

---

## Azure DevOps Configuration

Open the app → you will be redirected to `/settings` automatically if no configuration is found.

1. **Organisation** — e.g. `my-company` from `dev.azure.com/my-company`
2. **Default project** — your Azure DevOps project name
3. **Personal Access Token (PAT)** — see permissions below

### Required PAT Permissions

| Scope | Permission |
|-------|-----------|
| Code | Read |
| Pull Request Threads | Read & Write |
| Build | Read & Execute |
| Release | Read, Write & Execute |
| Identity | Read (for reviewer picker) |

---

## Install as PWA on iPhone

1. Open Safari → navigate to the app URL
2. Tap the Share icon → **Add to Home Screen**
3. The app appears as an icon on your home screen

> Push notifications on iOS require the app to be installed as a PWA and iOS 16.4+.

---

## Push Notifications

Push notifications are delivered via the Web Push API using a webhook from Azure DevOps Service Hooks.

### How it works

1. The user completes the 5-step push setup wizard at `/push-setup`
2. A unique per-user `webhookToken` (256-bit, stored in `localStorage`) is generated
3. Azure DevOps fires a service hook → `POST /api/push/webhook?t=<webhookToken>`
4. The server matches the token to a subscription and sends a Web Push notification

### Setup in Azure DevOps

In your Azure DevOps project → **Project Settings** → **Service hooks** → **Create subscription**:

- Service: **Web Hooks**
- Event: e.g. *Pull request created*, *Build completed*
- URL: `https://your-domain.com/api/push/webhook?t=<your-webhookToken>`

The webhook token is shown in the app during setup.

### API Documentation

The push and webhook endpoints are documented in [`docs/openapi/push-webhooks.openapi.yaml`](docs/openapi/push-webhooks.openapi.yaml).

---

## Demo Mode

The app ships with a built-in demo mode — no Azure DevOps account required. Enable it in `/settings` to explore the UI with mock data.

---

## Project Structure

```
src/
├── app/                  # Pages (Next.js App Router)
│   ├── api/push/         # Push notification API routes
│   ├── dashboard/
│   ├── explorer/
│   ├── pipelines/
│   ├── pull-requests/
│   ├── releases/
│   └── settings/
├── components/
│   ├── layout/           # AppBar, BottomNav, Providers
│   ├── ui/               # Shared UI primitives
│   ├── explorer/         # Explorer sub-components
│   ├── pipelines/        # Pipeline modals and views
│   ├── pr/               # Pull request tabs and modals
│   └── settings/         # Settings sections
└── lib/
    ├── api/              # Axios client factory
    ├── hooks/            # Shared React hooks
    ├── i18n/             # Translation files (de.json, en.json)
    ├── mocks/            # Demo mode data
    ├── services/         # Domain service layer
    ├── stores/           # Zustand stores
    └── utils/            # Pure utility functions
data/
└── subscriptions.json    # Push subscription store (server-side, gitignored in prod)
public/
├── icons/                # PWA icons
└── sw-custom.js          # Custom service worker
```

---

## Privacy

PAT, organisation, and all settings are stored **exclusively in the browser** (`localStorage`). No credentials are transmitted to any server other than Azure DevOps directly from the browser.

The only server-side state is `data/subscriptions.json`, which stores push endpoint URLs and per-user webhook tokens — no Azure DevOps credentials.

---

## Contributing

Contributions are welcome. Please:

- Follow the conventions in [AGENTS.md](AGENTS.md)
- Keep changes narrow and focused
- Run `npm run lint && npm run build` before submitting a PR
- Add new UI text to both `src/lib/i18n/de.json` and `src/lib/i18n/en.json`
- Code comments may be in German or English

---

## License

MIT
