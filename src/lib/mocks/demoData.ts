/**
 * Demo-Daten fuer den Demo-Modus der App.
 *
 * Simuliert eine vollstaendige Azure DevOps Umgebung im Browser ohne echte API-Verbindung.
 * Der Zustand (PRs, Builds, Threads etc.) wird im localStorage gespeichert und ist
 * daher sitzungsuebergreifend persistent.
 *
 * Alle Service-Methoden pruefen via `isDemoClient()` ob sie hier hinweiterleiten sollen.
 */

import {
  Branch,
  Build,
  BuildArtifact,
  BuildTimeline,
  Commit,
  IdentityRef,
  Pipeline,
  PRIteration,
  PRThread,
  PullRequest,
  Release,
  ReleaseApproval,
  ReleaseDefinition,
  ReleaseEnvironment,
  Repository,
  Reviewer,
  TimelineRecord,
  TreeEntry,
  WorkItem,
} from "@/types";

const STORAGE_KEY = "azdevops_demo_state";
const PROJECT_ID = "demo-project-001";
const PROJECT_NAME = "Demo Platform";
const ORGANIZATION_NAME = "demo-org";
const NOW = new Date("2026-03-06T12:00:00.000Z");

type IterationChanges = {
  changeEntries: Array<{ item: { path: string }; changeType: string }>;
};

/** Vollstaendiger Demo-Zustand der im localStorage persistiert wird. */
interface DemoState {
  repositories: Repository[];
  branches: Record<string, Branch[]>;
  commits: Record<string, Commit[]>;
  trees: Record<string, TreeEntry[]>;
  files: Record<string, string>;
  pullRequests: Record<string, PullRequest[]>;
  threads: Record<string, PRThread[]>;
  iterations: Record<string, PRIteration[]>;
  changes: Record<string, IterationChanges>;
  pipelines: Pipeline[];
  builds: Build[];
  timelines: Record<string, BuildTimeline>;
  logs: Record<string, string>;
  artifacts: Record<string, BuildArtifact[]>;
  releaseDefinitions: ReleaseDefinition[];
  releases: Release[];
  approvals: ReleaseApproval[];
  counters: {
    nextPrId: number;
    nextThreadId: number;
    nextCommentId: number;
    nextBuildId: number;
    nextReleaseId: number;
    nextApprovalId: number;
    nextIterationId: number;
  };
}

/** Fiktive Benutzer-Identitaeten fuer die Demo-Umgebung. */
const identityPool: IdentityRef[] = [
  { id: "user-01", displayName: "Mara Schulz", uniqueName: "mara.schulz@demo.local" },
  { id: "user-02", displayName: "Tobias Lang", uniqueName: "tobias.lang@demo.local" },
  { id: "user-03", displayName: "Elena Roth", uniqueName: "elena.roth@demo.local" },
  { id: "user-04", displayName: "Jonas Keller", uniqueName: "jonas.keller@demo.local" },
  { id: "user-05", displayName: "Lina Berger", uniqueName: "lina.berger@demo.local" },
  { id: "user-06", displayName: "Viktor Haas", uniqueName: "viktor.haas@demo.local" },
  { id: "user-07", displayName: "Nora Beck", uniqueName: "nora.beck@demo.local" },
  { id: "user-08", displayName: "Sven Maurer", uniqueName: "sven.maurer@demo.local" },
];

/** Katalog der Demo-Repositories (30 Eintraege aus verschiedenen Bereichen). */
const repoCatalog = [
  { namespace: "core", name: "api-gateway", activity: "high" },
  { namespace: "core", name: "identity-service", activity: "high" },
  { namespace: "core", name: "config-service", activity: "medium" },
  { namespace: "billing", name: "invoice-api", activity: "high" },
  { namespace: "billing", name: "payment-worker", activity: "medium" },
  { namespace: "billing", name: "subscription-ui", activity: "low" },
  { namespace: "commerce", name: "catalog-api", activity: "high" },
  { namespace: "commerce", name: "cart-service", activity: "medium" },
  { namespace: "commerce", name: "checkout-ui", activity: "high" },
  { namespace: "commerce", name: "pricing-engine", activity: "medium" },
  { namespace: "ops", name: "terraform-live", activity: "low" },
  { namespace: "ops", name: "platform-templates", activity: "medium" },
  { namespace: "ops", name: "monitoring-stack", activity: "medium" },
  { namespace: "data", name: "warehouse-sync", activity: "high" },
  { namespace: "data", name: "customer-events", activity: "high" },
  { namespace: "data", name: "ml-feature-store", activity: "low" },
  { namespace: "mobile", name: "ios-shell", activity: "medium" },
  { namespace: "mobile", name: "android-shell", activity: "medium" },
  { namespace: "web", name: "portal-shell", activity: "high" },
  { namespace: "web", name: "admin-console", activity: "medium" },
  { namespace: "web", name: "design-system", activity: "medium" },
  { namespace: "shared", name: "auth-sdk", activity: "high" },
  { namespace: "shared", name: "observability-sdk", activity: "medium" },
  { namespace: "shared", name: "testing-kit", activity: "low" },
  { namespace: "shared", name: "devex-cli", activity: "medium" },
  { namespace: "integration", name: "sap-connector", activity: "low" },
  { namespace: "integration", name: "salesforce-sync", activity: "medium" },
  { namespace: "integration", name: "stripe-webhooks", activity: "medium" },
  { namespace: "security", name: "secret-rotation", activity: "high" },
  { namespace: "security", name: "audit-trails", activity: "medium" },
] as const;

// In-Memory-Cache des Demo-Zustands (wird beim ersten Zugriff befuellt)
let memoryState: DemoState | null = null;

/** Erstellt eine tiefe Kopie eines Werts via JSON-Runde-Trip. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Kodiert einen UTF-8-String zu Base64, kompatibel mit Browser und Node.js. */
function encodeToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

/** Gibt einen minimal beschriebenen Demo-Projekt-Verweis zurueck. */
function projectRef() {
  return { id: PROJECT_ID, name: PROJECT_NAME };
}

/** Gibt einen ISO-8601-Timestamp zurueck, der `days` Tage vor dem Demo-Zeitpunkt liegt. */
function daysAgo(days: number, hour = 9, minute = 0): string {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

/** Waehlt eine Identitaet aus dem Pool deterministisch per Modulo-Selektion aus. */
function pickIdentity(seed: number): IdentityRef {
  return identityPool[seed % identityPool.length];
}

/** Erstellt ein Reviewer-Objekt aus einer Identitaet mit vorgegebenem Vote. */
function toReviewer(seed: number, vote: Reviewer["vote"], isRequired = true): Reviewer {
  const person = pickIdentity(seed);
  return {
    id: person.id,
    displayName: person.displayName,
    vote,
    isRequired,
  };
}

/** Erstellt einen zusammengesetzten Schluessel fuer Repository+Branch-Lookups. */
function repoKey(repoId: string, branch: string) {
  return `${repoId}::${branch}`;
}

/** Erstellt einen zusammengesetzten Schluessel fuer Baum-Lookups (Repo+Branch+Pfad). */
function treeKey(repoId: string, branch: string, path: string) {
  return `${repoId}::${branch}::${path}`;
}

/** Erstellt einen zusammengesetzten Schluessel fuer Dateiinhalt-Lookups. */
function fileKey(repoId: string, branch: string, path: string) {
  return `${repoId}::${branch}::${path}`;
}

/** Erstellt einen zusammengesetzten Schluessel fuer PR-Lookups. */
function prKey(repoId: string, prId: number) {
  return `${repoId}::${prId}`;
}

/** Erstellt einen zusammengesetzten Schluessel fuer Iterations-Aenderungs-Lookups. */
function changeKey(repoId: string, prId: number, iterationId: number) {
  return `${repoId}::${prId}::${iterationId}`;
}

/** Erstellt einen zusammengesetzten Schluessel fuer Build-Log-Lookups. */
function logKey(buildId: number, logId: number) {
  return `${buildId}::${logId}`;
}

/** Entfernt das `refs/heads/`-Praefix von Branch-Referenzen. */
function sanitizeBranchName(name: string) {
  return name.replace(/^refs\/heads\//, "");
}

function buildTreeForRepo(repoId: string, branch: string, fullName: string, index: number) {
  const repoSlug = fullName.replace(/\//g, "-");
  const configPath = `/${fullName.split("/")[0]}`;
  const serviceName = fullName.split("/")[1];
  const namespace = fullName.split("/")[0];
  const serviceNamePascal = pascalCase(serviceName);
  // Der Dateibaum ist bewusst klein gehalten, deckt aber Explorer, Dateiinhalt und PR-Dateilisten ab.
  const root: TreeEntry[] = [
    {
      objectId: `${repoSlug}-root-src`,
      gitObjectType: "tree",
      path: "/src",
      url: `https://demo.local/repos/${repoId}/src`,
    },
    {
      objectId: `${repoSlug}-root-infra`,
      gitObjectType: "tree",
      path: "/infra",
      url: `https://demo.local/repos/${repoId}/infra`,
    },
    {
      objectId: `${repoSlug}-root-pipelines`,
      gitObjectType: "tree",
      path: "/.azuredevops",
      url: `https://demo.local/repos/${repoId}/pipelines`,
    },
    {
      objectId: `${repoSlug}-root-readme`,
      gitObjectType: "blob",
      path: "/README.md",
      size: 3200,
      url: `https://demo.local/repos/${repoId}/README.md`,
    },
    {
      objectId: `${repoSlug}-root-docs`,
      gitObjectType: "tree",
      path: "/docs",
      url: `https://demo.local/repos/${repoId}/docs`,
    },
    {
      objectId: `${repoSlug}-root-assets`,
      gitObjectType: "tree",
      path: "/assets",
      url: `https://demo.local/repos/${repoId}/assets`,
    },
    {
      objectId: `${repoSlug}-root-package`,
      gitObjectType: "blob",
      path: "/package.json",
      size: 680,
      url: `https://demo.local/repos/${repoId}/package.json`,
    },
  ];

  const src: TreeEntry[] = [
    {
      objectId: `${repoSlug}-src-app`,
      gitObjectType: "tree",
      path: "/src/app",
      url: `https://demo.local/repos/${repoId}/src/app`,
    },
    {
      objectId: `${repoSlug}-src-domain`,
      gitObjectType: "tree",
      path: "/src/domain",
      url: `https://demo.local/repos/${repoId}/src/domain`,
    },
    {
      objectId: `${repoSlug}-src-main`,
      gitObjectType: "blob",
      path: "/src/main.ts",
      size: 980,
      url: `https://demo.local/repos/${repoId}/src/main.ts`,
    },
  ];

  const srcApp: TreeEntry[] = [
    {
      objectId: `${repoSlug}-app-index`,
      gitObjectType: "blob",
      path: "/src/app/index.ts",
      size: 460,
      url: `https://demo.local/repos/${repoId}/src/app/index.ts`,
    },
    {
      objectId: `${repoSlug}-app-routes`,
      gitObjectType: "blob",
      path: "/src/app/routes.ts",
      size: 540,
      url: `https://demo.local/repos/${repoId}/src/app/routes.ts`,
    },
  ];

  const srcDomain: TreeEntry[] = [
    {
      objectId: `${repoSlug}-domain-service`,
      gitObjectType: "blob",
      path: "/src/domain/service.ts",
      size: 1240,
      url: `https://demo.local/repos/${repoId}/src/domain/service.ts`,
    },
    {
      objectId: `${repoSlug}-domain-model`,
      gitObjectType: "blob",
      path: "/src/domain/model.ts",
      size: 720,
      url: `https://demo.local/repos/${repoId}/src/domain/model.ts`,
    },
  ];

  const infra: TreeEntry[] = [
    {
      objectId: `${repoSlug}-infra-values`,
      gitObjectType: "blob",
      path: "/infra/values.yaml",
      size: 420,
      url: `https://demo.local/repos/${repoId}/infra/values.yaml`,
    },
    {
      objectId: `${repoSlug}-infra-chart`,
      gitObjectType: "blob",
      path: "/infra/chart.yaml",
      size: 280,
      url: `https://demo.local/repos/${repoId}/infra/chart.yaml`,
    },
  ];

  const pipelines: TreeEntry[] = [
    {
      objectId: `${repoSlug}-azdo-ci`,
      gitObjectType: "blob",
      path: "/.azuredevops/ci.yml",
      size: 520,
      url: `https://demo.local/repos/${repoId}/.azuredevops/ci.yml`,
    },
    {
      objectId: `${repoSlug}-azdo-release`,
      gitObjectType: "blob",
      path: "/.azuredevops/release.yml",
      size: 610,
      url: `https://demo.local/repos/${repoId}/.azuredevops/release.yml`,
    },
  ];

  const docs: TreeEntry[] = [
    {
      objectId: `${repoSlug}-docs-architecture`,
      gitObjectType: "blob",
      path: "/docs/architecture.md",
      size: 1820,
      url: `https://demo.local/repos/${repoId}/docs/architecture.md`,
    },
    {
      objectId: `${repoSlug}-docs-decisions`,
      gitObjectType: "blob",
      path: "/docs/decision-log.md",
      size: 1260,
      url: `https://demo.local/repos/${repoId}/docs/decision-log.md`,
    },
    {
      objectId: `${repoSlug}-docs-release`,
      gitObjectType: "blob",
      path: "/docs/release-notes.md",
      size: 980,
      url: `https://demo.local/repos/${repoId}/docs/release-notes.md`,
    },
  ];

  const assets: TreeEntry[] = [
    {
      objectId: `${repoSlug}-assets-overview`,
      gitObjectType: "blob",
      path: "/assets/system-overview.svg",
      size: 2490,
      url: `https://demo.local/repos/${repoId}/assets/system-overview.svg`,
    },
    {
      objectId: `${repoSlug}-assets-mobile`,
      gitObjectType: "blob",
      path: "/assets/mobile-preview.png",
      size: 1480,
      url: `https://demo.local/repos/${repoId}/assets/mobile-preview.png`,
    },
  ];

  const files: Record<string, string> = {
    [fileKey(repoId, branch, "/README.md")]: `# ${fullName}\n\nDies ist das Demo-Repository ${fullName} im Projekt ${PROJECT_NAME}.\n\n- Namespace: ${namespace}\n- Aktivitaetsstufe: ${repoCatalog[index].activity}\n- Branch: ${branch}\n`,
    [fileKey(repoId, branch, "/package.json")]: JSON.stringify(
      {
        name: repoSlug,
        version: "1.0.0",
        private: true,
        scripts: {
          build: "tsc -p tsconfig.json",
          test: "vitest run",
          lint: "eslint src",
        },
      },
      null,
      2
    ),
    [fileKey(repoId, branch, "/src/main.ts")]: `import { bootstrap } from "./app/index";\n\nbootstrap({ service: "${fullName}", branch: "${branch}" });\n`,
    [fileKey(repoId, branch, "/src/app/index.ts")]: `export function bootstrap(config: { service: string; branch: string }) {\n  console.log("boot", config.service, config.branch);\n}\n`,
    [fileKey(repoId, branch, "/src/app/routes.ts")]: `export const routes = [\n  "/health",\n  "/metrics",\n  "/${serviceName}",\n];\n`,
    [fileKey(repoId, branch, "/src/domain/service.ts")]: `export async function run${serviceNamePascal}Workflow() {\n  return { ok: true, repo: "${fullName}" };\n}\n`,
    [fileKey(repoId, branch, "/src/domain/model.ts")]: `export interface ${serviceNamePascal}Model {\n  id: string;\n  namespace: "${namespace}";\n  active: boolean;\n}\n`,
    [fileKey(repoId, branch, "/infra/values.yaml")]: `replicaCount: ${index % 3 === 0 ? 3 : 2}\nnamespace: ${configPath.slice(1)}\nfeatureFlags:\n  demoMode: true\n`,
    [fileKey(repoId, branch, "/infra/chart.yaml")]: `apiVersion: v2\nname: ${repoSlug}\nversion: 0.${index + 1}.0\n`,
    [fileKey(repoId, branch, "/.azuredevops/ci.yml")]: `trigger:\n  branches:\n    include:\n      - main\n      - develop\npool:\n  vmImage: ubuntu-latest\nsteps:\n  - script: npm ci\n  - script: npm test\n  - script: npm run build\n`,
    [fileKey(repoId, branch, "/.azuredevops/release.yml")]: `stages:\n  - stage: Deploy_Dev\n  - stage: Deploy_Test\n  - stage: Deploy_Prod\n`,
    [fileKey(repoId, branch, "/docs/architecture.md")]: `# Architekturuebersicht ${serviceNamePascal}\n\nDieses Dokument beschreibt die Kernkomponenten von \`${fullName}\`.\n\n## Kontext\n\n- Service: ${serviceName}\n- Namespace: ${namespace}\n- Default Branch: ${sanitizeBranchName(branch)}\n\n## Komponenten\n\n1. API Layer unter \`/src/app\`\n2. Domain-Workflow in \`/src/domain/service.ts\`\n3. Deployment-Pipelines in \`/.azuredevops\`\n\n## Hinweise fuer Reviews\n\n- Aendere bei API-Aenderungen auch \`docs/release-notes.md\`\n- Aktualisiere \`assets/system-overview.svg\`, wenn sich die Topologie aendert\n`,
    [fileKey(repoId, branch, "/docs/decision-log.md")]: `# Decision Log\n\n## ${NOW.getUTCFullYear()}-01-15\n- Wir setzen weiterhin auf branch-basierte Deployments fuer ${serviceName}.\n\n## ${NOW.getUTCFullYear()}-02-03\n- Bildassets fuer Ops-Dashboards liegen in \`/assets\`.\n\n## ${NOW.getUTCFullYear()}-02-24\n- PR-Reviews pruefen jetzt explizit Markdown-Dokumentation und Architekturdiagramme.\n`,
    [fileKey(repoId, branch, "/docs/release-notes.md")]: `# Release Notes\n\n## ${sanitizeBranchName(branch)}\n\n### Added\n- Verbesserte Logging-Hooks im Workflow.\n- Aktualisierte Dokumentation fuer ${serviceNamePascal}.\n\n### Changed\n- Pipeline-Validierung in CI stricter gemacht.\n- Neue Vorschau fuer Diagramm-Assets im Code Explorer.\n`,
    [fileKey(repoId, branch, "/assets/system-overview.svg")]: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="680" viewBox="0 0 1200 680">\n  <defs>\n    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">\n      <stop offset="0%" stop-color="#0f172a" />\n      <stop offset="100%" stop-color="#1e293b" />\n    </linearGradient>\n  </defs>\n  <rect width="1200" height="680" fill="url(#bg)" rx="24" />\n  <rect x="120" y="120" width="280" height="120" rx="16" fill="#1d4ed8" opacity="0.9" />\n  <text x="260" y="188" text-anchor="middle" fill="#e2e8f0" font-size="28" font-family="Arial">Client App</text>\n  <rect x="460" y="100" width="300" height="160" rx="16" fill="#0ea5e9" opacity="0.9" />\n  <text x="610" y="188" text-anchor="middle" fill="#082f49" font-size="30" font-family="Arial">${serviceNamePascal}</text>\n  <rect x="830" y="120" width="250" height="120" rx="16" fill="#16a34a" opacity="0.9" />\n  <text x="955" y="188" text-anchor="middle" fill="#052e16" font-size="24" font-family="Arial">Downstream API</text>\n  <rect x="410" y="360" width="380" height="190" rx="16" fill="#334155" opacity="0.95" />\n  <text x="600" y="430" text-anchor="middle" fill="#f8fafc" font-size="24" font-family="Arial">Azure DevOps Pipeline</text>\n  <text x="600" y="470" text-anchor="middle" fill="#cbd5e1" font-size="18" font-family="Arial">Build • Test • Release</text>\n  <line x1="400" y1="180" x2="460" y2="180" stroke="#93c5fd" stroke-width="6" />\n  <line x1="760" y1="180" x2="830" y2="180" stroke="#86efac" stroke-width="6" />\n  <line x1="610" y1="260" x2="610" y2="360" stroke="#94a3b8" stroke-width="6" />\n</svg>\n`,
    [fileKey(repoId, branch, "/assets/mobile-preview.png")]: `PNG_PLACEHOLDER_${repoSlug}_${sanitizeBranchName(branch)}`,
  };

  return {
    trees: {
      [treeKey(repoId, branch, "/")]: root,
      [treeKey(repoId, branch, "/src")]: src,
      [treeKey(repoId, branch, "/src/app")]: srcApp,
      [treeKey(repoId, branch, "/src/domain")]: srcDomain,
      [treeKey(repoId, branch, "/infra")]: infra,
      [treeKey(repoId, branch, "/.azuredevops")]: pipelines,
      [treeKey(repoId, branch, "/docs")]: docs,
      [treeKey(repoId, branch, "/assets")]: assets,
    },
    files,
  };
}

/** Konvertiert einen kebab-/slash-separierten String in PascalCase. */
function pascalCase(value: string) {
  return value
    .split(/[-_/]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Generiert einen deterministischen Demo-Commit fuer ein Repository. */
function makeCommit(repoId: string, branch: string, fullName: string, seed: number, position: number): Commit {
  const author = pickIdentity(seed + position);
  const commitDate = daysAgo(seed + position, 8 + (position % 7), 10 + ((seed + position) % 40));
  return {
    commitId: `${repoId}-${branch}-${position}`.replace(/[^a-zA-Z0-9]/g, "").padEnd(40, "0").slice(0, 40),
    author: {
      name: author.displayName,
      email: author.uniqueName || `${author.id}@demo.local`,
      date: commitDate,
    },
    committer: {
      name: author.displayName,
      email: author.uniqueName || `${author.id}@demo.local`,
      date: commitDate,
    },
    comment: `feat(${fullName.split("/")[1]}): Update ${branch} workflow step ${position + 1}`,
    changeCounts: {
      Add: 4 + (position % 3),
      Edit: 2 + (seed % 4),
      Delete: position % 2,
    },
    url: `https://demo.local/repos/${repoId}/commits/${branch}/${position}`,
    remoteUrl: `https://demo.local/repos/${repoId}/commit/${position}`,
  };
}

/** Erstellt eine Build-Timeline mit Stage, drei Tasks und zugehoerigen Log-Eintraegen.
 * Jeder fuenfte Build (seed % 5 === 0) schlaegt deterministisch fehl. */
function createBuildTimeline(buildId: number, seed: number, inProgress = false): { timeline: BuildTimeline; logs: Record<string, string> } {
  const stageId = `stage-${buildId}`;
  const taskInstallId = `task-install-${buildId}`;
  const taskTestId = `task-test-${buildId}`;
  const taskDeployId = `task-deploy-${buildId}`;
  const logIds = [buildId * 10 + 1, buildId * 10 + 2, buildId * 10 + 3];

  const records: TimelineRecord[] = [
    {
      id: stageId,
      type: "Stage",
      name: "Build and Verify",
      state: inProgress ? "inProgress" : "completed",
      result: inProgress ? undefined : "succeeded",
      startTime: daysAgo(seed, 8),
      finishTime: inProgress ? undefined : daysAgo(seed, 8, 24),
      order: 1,
    },
    {
      id: taskInstallId,
      parentId: stageId,
      type: "Task",
      name: "Install dependencies",
      state: "completed",
      result: "succeeded",
      startTime: daysAgo(seed, 8),
      finishTime: daysAgo(seed, 8, 6),
      order: 1,
      log: { url: `https://demo.local/builds/${buildId}/logs/${logIds[0]}` },
    },
    {
      id: taskTestId,
      parentId: stageId,
      type: "Task",
      name: "Run unit and integration tests",
      state: inProgress ? "inProgress" : "completed",
      result: inProgress ? undefined : seed % 5 === 0 ? "failed" : "succeeded",
      startTime: daysAgo(seed, 8, 7),
      finishTime: inProgress ? undefined : daysAgo(seed, 8, 18),
      order: 2,
      log: { url: `https://demo.local/builds/${buildId}/logs/${logIds[1]}` },
    },
    {
      id: taskDeployId,
      parentId: stageId,
      type: "Task",
      name: "Publish build artifacts",
      state: inProgress ? "pending" : "completed",
      result: inProgress ? undefined : "succeeded",
      startTime: daysAgo(seed, 8, 19),
      finishTime: inProgress ? undefined : daysAgo(seed, 8, 24),
      order: 3,
      log: { url: `https://demo.local/builds/${buildId}/logs/${logIds[2]}` },
    },
  ];

  const logs: Record<string, string> = {
    [logKey(buildId, logIds[0])]: `[setup] Installing dependencies\nnpm ci\nadded 482 packages in 8s\n`,
    [logKey(buildId, logIds[1])]: `[test] Running suites\nPASS src/domain/service.test.ts\nPASS src/app/routes.test.ts\ncoverage: 86.3%\n`,
    [logKey(buildId, logIds[2])]: `[publish] Packing artifacts\nartifact: drop\nartifact: sbom\n`,
  };

  if (seed % 5 === 0 && !inProgress) {
    records[2].result = "failed";
    records[0].result = "failed";
    logs[logKey(buildId, logIds[1])] = `[test] Running suites\nFAIL src/domain/service.test.ts\nAssertionError: expected feature toggle to be enabled\n`;
  }

  return { timeline: { records }, logs };
}

/** Erstellt den vollstaendigen Ausgangs-Demo-Zustand mit Repositories, Branches,
 * Commits, PRs, Pipelines, Releases und Work Items. */
function seedDemoState(): DemoState {
  const repositories: Repository[] = [];
  const branches: Record<string, Branch[]> = {};
  const commits: Record<string, Commit[]> = {};
  const trees: Record<string, TreeEntry[]> = {};
  const files: Record<string, string> = {};
  const pullRequests: Record<string, PullRequest[]> = {};
  const threads: Record<string, PRThread[]> = {};
  const iterations: Record<string, PRIteration[]> = {};
  const changes: Record<string, IterationChanges> = {};
  const pipelines: Pipeline[] = [];
  const builds: Build[] = [];
  const timelines: Record<string, BuildTimeline> = {};
  const logs: Record<string, string> = {};
  const artifacts: Record<string, BuildArtifact[]> = {};
  const releaseDefinitions: ReleaseDefinition[] = [];
  const releases: Release[] = [];
  const approvals: ReleaseApproval[] = [];

  let nextPrId = 1200;
  let nextThreadId = 4000;
  let nextCommentId = 9000;
  let nextIterationId = 700;
  let nextBuildId = 8500;
  let nextReleaseId = 610;
  let nextApprovalId = 210;

  // Repositories bilden die Basis fuer Explorer, PRs, Builds und Dashboard-Kacheln.
  repoCatalog.forEach((entry, index) => {
    const repoId = `repo-${String(index + 1).padStart(2, "0")}`;
    const fullName = `${entry.namespace}/${entry.name}`;
    const defaultBranch = index % 5 === 0 ? "refs/heads/develop" : "refs/heads/main";
    const defaultBranchName = sanitizeBranchName(defaultBranch);
    const repo: Repository = {
      id: repoId,
      name: fullName,
      project: projectRef(),
      defaultBranch,
      remoteUrl: `https://demo.local/${ORGANIZATION_NAME}/${PROJECT_NAME}/_git/${fullName}`,
      size: 2000 + index * 130,
    };
    repositories.push(repo);

    const repoBranches: Branch[] = [
      {
        name: "main",
        objectId: `${repoId}-main-sha`.padEnd(40, "a").slice(0, 40),
        creator: pickIdentity(index),
        url: `https://demo.local/repos/${repoId}/branches/main`,
      },
      {
        name: "develop",
        objectId: `${repoId}-develop-sha`.padEnd(40, "b").slice(0, 40),
        creator: pickIdentity(index + 1),
        url: `https://demo.local/repos/${repoId}/branches/develop`,
      },
      {
        name: `feature/${entry.name.replace(/-/g, "-")}-hardening`,
        objectId: `${repoId}-feature-sha`.padEnd(40, "c").slice(0, 40),
        creator: pickIdentity(index + 2),
        url: `https://demo.local/repos/${repoId}/branches/feature`,
      },
      {
        name: `release/2026.${String((index % 3) + 1).padStart(2, "0")}`,
        objectId: `${repoId}-release-sha`.padEnd(40, "d").slice(0, 40),
        creator: pickIdentity(index + 3),
        url: `https://demo.local/repos/${repoId}/branches/release`,
      },
    ];
    if (index % 4 === 0) {
      repoBranches.push({
        name: `hotfix/${entry.name}-latency`,
        objectId: `${repoId}-hotfix-sha`.padEnd(40, "e").slice(0, 40),
        creator: pickIdentity(index + 4),
        url: `https://demo.local/repos/${repoId}/branches/hotfix`,
      });
    }
    branches[repoId] = repoBranches;

    repoBranches.forEach((branch, branchIndex) => {
      commits[repoKey(repoId, branch.name)] = Array.from({ length: 6 }, (_, commitIndex) =>
        makeCommit(repoId, branch.name, fullName, index * 3 + branchIndex + commitIndex, commitIndex)
      );
      const treeData = buildTreeForRepo(repoId, branch.name, fullName, index);
      Object.assign(trees, treeData.trees);
      Object.assign(files, treeData.files);
    });

    const repoPullRequests: PullRequest[] = [];

    const activePrId = nextPrId++;
    const activePr: PullRequest = {
      pullRequestId: activePrId,
      title: `${entry.namespace}: Harden ${entry.name} rollout handling`,
      description: `Diese Aenderung stabilisiert das Rollout-Verhalten fuer ${fullName} und bereitet die naechste Release-Welle vor.`,
      status: "active",
      createdBy: pickIdentity(index),
      creationDate: daysAgo(index % 9, 10 + (index % 5), 12),
      sourceRefName: `refs/heads/feature/${entry.name}-hardening`,
      targetRefName: defaultBranch,
      mergeStatus: "succeeded",
      isDraft: entry.activity === "low",
      reviewers: [
        toReviewer(index + 1, entry.activity === "high" ? 10 : 5),
        toReviewer(index + 2, entry.activity === "low" ? -5 : 0),
      ],
      repository: { id: repoId, name: fullName, project: { name: PROJECT_NAME } },
      url: `https://demo.local/repos/${repoId}/pullrequests/${activePrId}`,
    };
    repoPullRequests.push(activePr);

    const activePrKey = prKey(repoId, activePrId);
    threads[activePrKey] = [
      {
        id: nextThreadId++,
        status: "active",
        publishedDate: daysAgo(index % 6, 11, 0),
        lastUpdatedDate: daysAgo(index % 6, 11, 40),
        comments: [
          {
            id: nextCommentId++,
            content: "Wir sollten das Timeout fuer den Retry-Pfad noch an die Load-Tests angleichen.",
            author: pickIdentity(index + 1),
            publishedDate: daysAgo(index % 6, 11, 0),
            lastUpdatedDate: daysAgo(index % 6, 11, 0),
            commentType: "text",
          },
          {
            id: nextCommentId++,
            content: "Passt, ich habe den Wert auf 30s angehoben und die Canary-Checks nachgezogen.",
            author: pickIdentity(index),
            publishedDate: daysAgo(index % 6, 11, 40),
            lastUpdatedDate: daysAgo(index % 6, 11, 40),
            commentType: "text",
          },
        ],
      },
    ];
    iterations[activePrKey] = [
      {
        id: nextIterationId++,
        description: "Basis fuer Rollout-Hardening",
        author: pickIdentity(index),
        createdDate: daysAgo(index % 6, 9, 15),
        updatedDate: daysAgo(index % 6, 9, 15),
        sourceRefCommit: { commitId: commits[repoKey(repoId, repoBranches[2].name)][0].commitId },
        targetRefCommit: { commitId: commits[repoKey(repoId, defaultBranchName)][0].commitId },
      },
      {
        id: nextIterationId++,
        description: "Review-Fixes und Feature-Flag Anpassungen",
        author: pickIdentity(index),
        createdDate: daysAgo(index % 5, 10, 25),
        updatedDate: daysAgo(index % 5, 10, 25),
        sourceRefCommit: { commitId: commits[repoKey(repoId, repoBranches[2].name)][1].commitId },
        targetRefCommit: { commitId: commits[repoKey(repoId, defaultBranchName)][1].commitId },
      },
    ];
    const activeIterationId = iterations[activePrKey][1].id;
    changes[changeKey(repoId, activePrId, activeIterationId)] = {
      changeEntries: [
        { item: { path: "/src/domain/service.ts" }, changeType: "edit" },
        { item: { path: "/infra/values.yaml" }, changeType: "edit" },
        { item: { path: "/.azuredevops/ci.yml" }, changeType: "edit" },
        { item: { path: "/docs/architecture.md" }, changeType: "edit" },
        { item: { path: "/assets/system-overview.svg" }, changeType: "edit" },
      ],
    };

    if (entry.activity !== "low" || index % 2 === 0) {
      const completedPrId = nextPrId++;
      const completedPr: PullRequest = {
        pullRequestId: completedPrId,
        title: `${entry.namespace}: Release branch fuer ${entry.name} zusammenfuehren`,
        description: `Merge der vorbereiteten Release-Aenderungen fuer ${fullName}.`,
        status: "completed",
        createdBy: pickIdentity(index + 3),
        creationDate: daysAgo(10 + (index % 7), 8, 20),
        closedDate: daysAgo(8 + (index % 6), 14, 10),
        sourceRefName: `refs/heads/release/2026.${String((index % 3) + 1).padStart(2, "0")}`,
        targetRefName: "refs/heads/main",
        mergeStatus: "succeeded",
        reviewers: [
          toReviewer(index + 4, 10),
          toReviewer(index + 5, 10, false),
        ],
        repository: { id: repoId, name: fullName, project: { name: PROJECT_NAME } },
        url: `https://demo.local/repos/${repoId}/pullrequests/${completedPrId}`,
      };
      repoPullRequests.push(completedPr);

      const completedPrKey = prKey(repoId, completedPrId);
      threads[completedPrKey] = [
        {
          id: nextThreadId++,
          status: "closed",
          publishedDate: daysAgo(9 + (index % 6), 10, 0),
          lastUpdatedDate: daysAgo(8 + (index % 6), 11, 0),
          comments: [
            {
              id: nextCommentId++,
              content: "Bitte die Release Notes noch um die Migrationsschritte ergaenzen.",
              author: pickIdentity(index + 4),
              publishedDate: daysAgo(9 + (index % 6), 10, 0),
              lastUpdatedDate: daysAgo(9 + (index % 6), 10, 0),
              commentType: "text",
            },
            {
              id: nextCommentId++,
              content: "Release Notes sind aktualisiert, inklusive Backout-Strategie.",
              author: pickIdentity(index + 3),
              publishedDate: daysAgo(8 + (index % 6), 11, 0),
              lastUpdatedDate: daysAgo(8 + (index % 6), 11, 0),
              commentType: "text",
            },
          ],
        },
      ];
      iterations[completedPrKey] = [
        {
          id: nextIterationId++,
          description: "Release Candidate",
          author: pickIdentity(index + 3),
          createdDate: daysAgo(11 + (index % 6), 9, 30),
          updatedDate: daysAgo(11 + (index % 6), 9, 30),
          sourceRefCommit: { commitId: commits[repoKey(repoId, repoBranches[3].name)][0].commitId },
          targetRefCommit: { commitId: commits[repoKey(repoId, "main")][0].commitId },
        },
      ];
      changes[changeKey(repoId, completedPrId, iterations[completedPrKey][0].id)] = {
        changeEntries: [
          { item: { path: "/README.md" }, changeType: "edit" },
          { item: { path: "/src/app/routes.ts" }, changeType: "edit" },
          { item: { path: "/docs/release-notes.md" }, changeType: "edit" },
          { item: { path: "/assets/mobile-preview.png" }, changeType: "add" },
        ],
      };
    }

    if (index % 4 === 0) {
      const abandonedPrId = nextPrId++;
      const abandonedBranch = repoBranches.find((branch) => branch.name.startsWith("hotfix/"))?.name || "develop";
      const abandonedPr: PullRequest = {
        pullRequestId: abandonedPrId,
        title: `${entry.namespace}: Experiment fuer ${entry.name} verwerfen`,
        description: `Veralteter Ansatz fuer ${fullName}, wird durch neues Rollout-Konzept ersetzt.`,
        status: "abandoned",
        createdBy: pickIdentity(index + 5),
        creationDate: daysAgo(14 + (index % 5), 13, 5),
        closedDate: daysAgo(12 + (index % 5), 16, 45),
        sourceRefName: `refs/heads/${abandonedBranch}`,
        targetRefName: defaultBranch,
        mergeStatus: "queued",
        reviewers: [
          toReviewer(index + 6, -10),
          toReviewer(index + 7, 0, false),
        ],
        repository: { id: repoId, name: fullName, project: { name: PROJECT_NAME } },
        url: `https://demo.local/repos/${repoId}/pullrequests/${abandonedPrId}`,
      };
      repoPullRequests.push(abandonedPr);

      const abandonedPrKey = prKey(repoId, abandonedPrId);
      threads[abandonedPrKey] = [
        {
          id: nextThreadId++,
          status: "wontFix",
          publishedDate: daysAgo(13 + (index % 4), 15, 0),
          lastUpdatedDate: daysAgo(12 + (index % 4), 15, 40),
          comments: [
            {
              id: nextCommentId++,
              content: "Wir stoppen diesen Strang. Die technischen Risiken sind zu hoch fuer den aktuellen Release-Zyklus.",
              author: pickIdentity(index + 6),
              publishedDate: daysAgo(13 + (index % 4), 15, 0),
              lastUpdatedDate: daysAgo(13 + (index % 4), 15, 0),
              commentType: "text",
            },
          ],
        },
      ];
      iterations[abandonedPrKey] = [
        {
          id: nextIterationId++,
          description: "Verworfener Spike",
          author: pickIdentity(index + 5),
          createdDate: daysAgo(15 + (index % 4), 11, 10),
          updatedDate: daysAgo(15 + (index % 4), 11, 10),
          sourceRefCommit: { commitId: commits[repoKey(repoId, abandonedBranch)][0].commitId },
          targetRefCommit: { commitId: commits[repoKey(repoId, defaultBranchName)][0].commitId },
        },
      ];
      changes[changeKey(repoId, abandonedPrId, iterations[abandonedPrKey][0].id)] = {
        changeEntries: [
          { item: { path: "/src/domain/model.ts" }, changeType: "edit" },
          { item: { path: "/docs/decision-log.md" }, changeType: "edit" },
        ],
      };
    }

    pullRequests[repoId] = repoPullRequests.sort(
      (left, right) => new Date(right.creationDate).getTime() - new Date(left.creationDate).getTime()
    );
  });

  // Pro Namespace entstehen zwei Build-Pipelines, damit Filter und Detailseiten genug Material haben.
  const pipelineNamespaces = ["core", "billing", "commerce", "ops", "data", "mobile", "web", "shared", "integration", "security"];
  pipelineNamespaces.forEach((namespace, index) => {
    const repo = repositories.find((candidate) => candidate.name.startsWith(`${namespace}/`)) || repositories[index];
    pipelines.push({
      id: 300 + index,
      name: `${namespace.toUpperCase()} CI`,
      folder: `\\${namespace}`,
      project: projectRef(),
    });
    pipelines.push({
      id: 500 + index,
      name: `${namespace.toUpperCase()} Delivery`,
      folder: `\\${namespace}\\delivery`,
      project: projectRef(),
    });

    [0, 1].forEach((offset) => {
      const buildId = nextBuildId++;
      const inProgress = index === 2 && offset === 0;
      const queuedOn = daysAgo(index + offset, 7 + offset, 10);
      const definitionId = offset === 0 ? 300 + index : 500 + index;
      const definitionName = offset === 0 ? `${namespace.toUpperCase()} CI` : `${namespace.toUpperCase()} Delivery`;
      const definitionPath = offset === 0 ? `\\${namespace}` : `\\${namespace}\\delivery`;
      const timelineData = createBuildTimeline(buildId, index + offset, inProgress);
      timelines[String(buildId)] = timelineData.timeline;
      Object.assign(logs, timelineData.logs);

      const build: Build = {
        id: buildId,
        buildNumber: `2026.${index + 1}.${offset + 10}`,
        status: inProgress ? "inProgress" : "completed",
        result: inProgress ? undefined : index % 5 === 0 && offset === 0 ? "failed" : offset === 1 ? "partiallySucceeded" : "succeeded",
        queueTime: queuedOn,
        startTime: queuedOn,
        finishTime: inProgress ? undefined : daysAgo(index + offset, 7 + offset, 30),
        requestedBy: pickIdentity(index + offset),
        requestedFor: pickIdentity(index + offset + 1),
        definition: { id: definitionId, name: definitionName, path: definitionPath },
        sourceBranch: offset === 0 ? "refs/heads/main" : "refs/heads/develop",
        sourceVersion: `${repo.id}${definitionId}`.padEnd(40, "f").slice(0, 40),
        repository: { id: repo.id, name: repo.name },
        logs: { url: `https://demo.local/builds/${buildId}/logs` },
        url: `https://demo.local/builds/${buildId}`,
        _links: { timeline: { href: `https://demo.local/builds/${buildId}/timeline` } },
      };
      builds.push(build);
      artifacts[String(buildId)] =
        build.result === "failed" || inProgress
          ? []
          : [
              {
                id: buildId * 10,
                name: "drop",
                resource: {
                  type: "Container",
                  downloadUrl: `https://demo.local/builds/${buildId}/artifacts/drop.zip`,
                  url: `https://demo.local/builds/${buildId}/artifacts/drop`,
                },
              },
              {
                id: buildId * 10 + 1,
                name: "sbom",
                resource: {
                  type: "FilePath",
                  downloadUrl: `https://demo.local/builds/${buildId}/artifacts/sbom.json`,
                  url: `https://demo.local/builds/${buildId}/artifacts/sbom`,
                },
              },
            ];
    });
  });

  const releaseNames = [
    "Customer Platform",
    "Billing Hub",
    "Commerce Suite",
    "Data Foundation",
    "Digital Channels",
    "Security Operations",
  ];

  releaseNames.forEach((name, index) => {
    releaseDefinitions.push({
      id: 800 + index,
      name,
      description: `${name} Release-Pipeline fuer das Demo-Projekt`,
      createdBy: pickIdentity(index),
      modifiedOn: daysAgo(index + 2, 9, 0),
      environments: [
        { id: (800 + index) * 10 + 1, name: "Dev", rank: 1 },
        { id: (800 + index) * 10 + 2, name: "Test", rank: 2 },
        { id: (800 + index) * 10 + 3, name: "Prod", rank: 3 },
      ],
    });
  });

  releaseDefinitions.forEach((definition, index) => {
    const releaseCount = index < 4 ? 2 : 1;
    Array.from({ length: releaseCount }).forEach((_, position) => {
      const releaseId = nextReleaseId++;
      const releaseName = `${definition.name} Release-${releaseId}`;
      const createdOn = daysAgo(index * 2 + position, 6 + position, 40);
      const prodApproval: ReleaseApproval = {
        id: nextApprovalId++,
        status: index % 2 === 0 && position === 0 ? "pending" : "approved",
        approver: pickIdentity(index + 2),
        approvedBy: index % 2 === 0 && position === 0 ? undefined : pickIdentity(index + 2),
        comments: index % 2 === 0 && position === 0 ? "" : "Freigabe fuer Produktivdeployment erteilt.",
        createdOn,
        modifiedOn: createdOn,
        releaseEnvironmentReference: { id: definition.environments?.[2].id || 0, name: "Prod" },
        releaseReference: { id: releaseId, name: releaseName },
      };

      const environments: ReleaseEnvironment[] = [
        {
          id: definition.environments?.[0].id || 0,
          name: "Dev",
          status: "succeeded",
          deploySteps: [
            {
              id: releaseId * 10 + 1,
              deploymentId: releaseId * 100 + 1,
              status: "succeeded",
              operationStatus: "PhaseSucceeded",
              requestedBy: pickIdentity(index),
              queuedOn: createdOn,
              startedOn: createdOn,
              completedOn: daysAgo(index * 2 + position, 7 + position, 15),
            },
          ],
          preDeployApprovals: [],
          postDeployApprovals: [],
          rank: 1,
        },
        {
          id: definition.environments?.[1].id || 0,
          name: "Test",
          status: position === 0 ? "succeeded" : "inProgress",
          deploySteps: [
            {
              id: releaseId * 10 + 2,
              deploymentId: releaseId * 100 + 2,
              status: position === 0 ? "succeeded" : "inProgress",
              operationStatus: position === 0 ? "PhaseSucceeded" : "QueuedForAgent",
              requestedBy: pickIdentity(index + 1),
              queuedOn: createdOn,
              startedOn: createdOn,
              completedOn: position === 0 ? daysAgo(index * 2 + position, 8 + position, 5) : undefined,
            },
          ],
          preDeployApprovals: [],
          postDeployApprovals: [],
          rank: 2,
        },
        {
          id: definition.environments?.[2].id || 0,
          name: "Prod",
          status: prodApproval.status === "pending" ? "queued" : position === 0 ? "succeeded" : "notStarted",
          deploySteps: prodApproval.status === "pending"
            ? []
            : [
                {
                  id: releaseId * 10 + 3,
                  deploymentId: releaseId * 100 + 3,
                  status: position === 0 ? "succeeded" : "notStarted",
                  operationStatus: position === 0 ? "PhaseSucceeded" : "NotStarted",
                  requestedBy: pickIdentity(index + 2),
                  queuedOn: createdOn,
                  startedOn: position === 0 ? createdOn : undefined,
                  completedOn: position === 0 ? daysAgo(index * 2 + position, 9 + position, 0) : undefined,
                },
              ],
          preDeployApprovals: [prodApproval],
          postDeployApprovals: [],
          rank: 3,
        },
      ];

      const release: Release = {
        id: releaseId,
        name: releaseName,
        status: prodApproval.status === "pending" ? "active" : "active",
        createdBy: pickIdentity(index),
        createdOn,
        modifiedOn: createdOn,
        releaseDefinition: { id: definition.id, name: definition.name },
        environments,
        description: position === 0 ? "Regulaerer Release-Run mit abgestimmten Gates." : "Nachlauf fuer Hotfixes und Smoke Tests.",
      };
      releases.push(release);
      approvals.push(prodApproval);
    });
  });

  return {
    repositories,
    branches,
    commits,
    trees,
    files,
    pullRequests,
    threads,
    iterations,
    changes,
    pipelines,
    builds: builds.sort((left, right) => new Date(right.queueTime).getTime() - new Date(left.queueTime).getTime()),
    timelines,
    logs,
    artifacts,
    releaseDefinitions,
    releases: releases.sort((left, right) => new Date(right.createdOn).getTime() - new Date(left.createdOn).getTime()),
    approvals,
    counters: {
      nextPrId,
      nextThreadId,
      nextCommentId,
      nextBuildId,
      nextReleaseId,
      nextApprovalId,
      nextIterationId,
    },
  };
}

/** Prueft, ob der gespeicherte Demo-Zustand die Beispiel-Markdown- und Bild-Dateien enthaelt.
 * Wird fuer die Migration aelterer Demo-Datensaetze verwendet. */
function hasRichExampleFiles(state: DemoState): boolean {
  const repo = state.repositories[0];
  if (!repo) return false;

  const candidateBranches = state.branches[repo.id] || [];
  const branch = candidateBranches.find((entry) => entry.name === "main")?.name || candidateBranches[0]?.name;
  if (!branch) return false;

  const requiredFilePaths = [
    "/docs/architecture.md",
    "/docs/release-notes.md",
    "/assets/system-overview.svg",
    "/assets/mobile-preview.png",
  ];

  const hasRequiredFiles = requiredFilePaths.every((path) =>
    Boolean(state.files[fileKey(repo.id, branch, path)])
  );
  const rootTree = state.trees[treeKey(repo.id, branch, "/")] || [];
  const hasRequiredFolders = rootTree.some((entry) => entry.path === "/docs") &&
    rootTree.some((entry) => entry.path === "/assets");

  return hasRequiredFiles && hasRequiredFolders;
}

/** Laedt den Demo-Zustand aus localStorage (Browser) oder dem In-Memory-Cache (SSR).
 * Fuehrt bei veralteten Daten automatisch eine Migration auf den aktuellen Seedstand durch. */
function loadDemoState(): DemoState {
  if (typeof window === "undefined") {
    if (!memoryState) memoryState = seedDemoState();
    return memoryState;
  }

  try {
    // Demo-Mutationen bleiben im Browser erhalten, bis der lokale Zustand geloescht wird.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (hasRichExampleFiles(parsed)) {
        return parsed;
      }

      // Upgrade bestehender Demo-Daten auf den aktuellen Beispielsatz (Markdown + Bilder).
      const migrated = seedDemoState();
      saveDemoState(migrated);
      return migrated;
    }
  } catch {
    // Lokaler Zustand wird in diesem Fall neu aufgebaut.
  }

  const seeded = seedDemoState();
  saveDemoState(seeded);
  return seeded;
}

/** Speichert den Demo-Zustand im In-Memory-Cache und (sofern verfuegbar) im localStorage. */
function saveDemoState(state: DemoState) {
  memoryState = state;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Laedt den aktuellen Demo-Zustand, fuehrt eine Mutation durch und speichert ihn zurueck. */
function withDemoState<T>(mutate: (state: DemoState) => T): T {
  const state = loadDemoState();
  const result = mutate(state);
  // Jede Mutation schreibt den kompletten Demo-Zustand zurueck, damit Folgeansichten konsistent bleiben.
  saveDemoState(state);
  return result;
}

/** Gibt alle PRs fuer ein bestimmtes Repository zurueck. */
function listPrsForRepo(state: DemoState, repoId: string) {
  return state.pullRequests[repoId] || [];
}

/** Sucht einen einzelnen PR anhand von Repository-ID und PR-ID. */
function findPullRequest(state: DemoState, repoId: string, prId: number) {
  return listPrsForRepo(state, repoId).find((pr) => pr.pullRequestId === prId);
}

/** Findet den Branch-Namen fuer einen bestimmten Commit-Hash. */
function findBranchForCommit(state: DemoState, repoId: string, commitId: string): string | null {
  for (const [key, commits] of Object.entries(state.commits)) {
    const [candidateRepoId, branch] = key.split("::");
    if (candidateRepoId !== repoId) continue;
    if (commits.some((commit) => commit.commitId === commitId)) {
      return branch;
    }
  }
  return null;
}

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

function listKnownPathsForRepoBranch(state: DemoState, repoId: string, branch: string): string[] {
  const prefix = `${repoId}::${branch}::`;
  return Object.keys(state.files)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .sort();
}

function findBranchByObjectId(state: DemoState, repoId: string, objectId: string): string | null {
  return (state.branches[repoId] || []).find((branch) => branch.objectId === objectId)?.name || null;
}

function buildTreeObjectId(repoId: string, branch: string, path: string): string {
  return `${repoId}-${branch}-${hashText(path).toString(36)}`.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
}

function buildTreeUrl(repoId: string, path: string): string {
  return `https://demo.local/repos/${repoId}${path}`;
}

function rebuildTreesForRepoBranch(state: DemoState, repoId: string, branch: string) {
  const filesForBranch = listKnownPathsForRepoBranch(state, repoId, branch);
  const treeEntries = new Map<string, Map<string, TreeEntry>>();

  const ensureTreeBucket = (path: string) => {
    if (!treeEntries.has(path)) {
      treeEntries.set(path, new Map());
    }
    return treeEntries.get(path)!;
  };

  ensureTreeBucket("/");

  for (const path of filesForBranch) {
    const segments = path.split("/").filter(Boolean);
    let currentParent = "/";

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const nextPath = currentParent === "/" ? `/${segment}` : `${currentParent}/${segment}`;
      ensureTreeBucket(currentParent).set(
        nextPath,
        {
          objectId: buildTreeObjectId(repoId, branch, nextPath),
          gitObjectType: "tree",
          path: nextPath,
          url: buildTreeUrl(repoId, nextPath),
        }
      );
      ensureTreeBucket(nextPath);
      currentParent = nextPath;
    }

    const content = state.files[fileKey(repoId, branch, path)] || "";
    ensureTreeBucket(currentParent).set(
      path,
      {
        objectId: buildTreeObjectId(repoId, branch, path),
        gitObjectType: "blob",
        path,
        size: content.length,
        url: buildTreeUrl(repoId, path),
      }
    );
  }

  for (const key of Object.keys(state.trees)) {
    if (key.startsWith(`${repoId}::${branch}::`)) {
      delete state.trees[key];
    }
  }

  for (const [path, entries] of treeEntries.entries()) {
    state.trees[treeKey(repoId, branch, path)] = Array.from(entries.values()).sort((a, b) => {
      if (a.gitObjectType !== b.gitObjectType) {
        return a.gitObjectType === "tree" ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });
  }
}

function copyBranchState(state: DemoState, repoId: string, sourceBranch: string, targetBranch: string) {
  const sourcePrefix = `${repoId}::${sourceBranch}::`;
  for (const [key, value] of Object.entries(state.files)) {
    if (!key.startsWith(sourcePrefix)) continue;
    const path = key.slice(sourcePrefix.length);
    state.files[fileKey(repoId, targetBranch, path)] = value;
  }

  state.commits[repoKey(repoId, targetBranch)] = clone(state.commits[repoKey(repoId, sourceBranch)] || []);
  rebuildTreesForRepoBranch(state, repoId, targetBranch);
}

function buildDemoWriteCommit(
  repoId: string,
  branch: string,
  filePath: string,
  commitMessage: string,
  changeType: "edit" | "add"
): Commit {
  const author = pickIdentity(hashText(`${repoId}:${branch}:${filePath}:${commitMessage}`));
  const timestamp = new Date().toISOString();
  const commitId = `${repoId}-${branch}-${hashText(`${filePath}:${timestamp}`)}`
    .replace(/[^a-zA-Z0-9]/g, "")
    .padEnd(40, "0")
    .slice(0, 40);

  return {
    commitId,
    author: {
      name: author.displayName,
      email: author.uniqueName || `${author.id}@demo.local`,
      date: timestamp,
    },
    committer: {
      name: author.displayName,
      email: author.uniqueName || `${author.id}@demo.local`,
      date: timestamp,
    },
    comment: commitMessage,
    changeCounts: {
      Add: changeType === "add" ? 1 : 0,
      Edit: changeType === "edit" ? 1 : 0,
      Delete: 0,
    },
    url: `https://demo.local/repos/${repoId}/commits/${commitId}`,
    remoteUrl: `https://demo.local/repos/${repoId}/commit/${commitId}`,
  };
}

function listPipelineFoldersFromPipelines(pipelines: Pipeline[]): string[] {
  const folders = new Set<string>(["\\"]);

  for (const pipeline of pipelines) {
    const folder = pipeline.folder || "\\";
    const parts = folder.split("\\").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}\\${part}` : `\\${part}`;
      folders.add(current);
    }
  }

  return Array.from(folders).sort((a, b) => {
    if (a === "\\") return -1;
    if (b === "\\") return 1;
    return a.localeCompare(b);
  });
}

function buildDemoCommitChanges(
  state: DemoState,
  repoId: string,
  commitId: string
): Array<{ changeType: string; item: { path: string; gitObjectType: "blob" }; originalPath?: string }> {
  const branch = findBranchForCommit(state, repoId, commitId) || "main";
  const knownPaths = listKnownPathsForRepoBranch(state, repoId, branch);
  if (knownPaths.length === 0) return [];

  const preferredPaths = [
    "/README.md",
    "/src/main.ts",
    "/docs/architecture.md",
    "/docs/release-notes.md",
  ].filter((path) => knownPaths.includes(path));
  const candidatePaths = preferredPaths.length > 0 ? preferredPaths : knownPaths;
  const seed = hashText(commitId);
  const count = Math.min(candidatePaths.length, 1 + (seed % 3));
  const result: Array<{ changeType: string; item: { path: string; gitObjectType: "blob" }; originalPath?: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; result.length < count && i < candidatePaths.length * 2; i++) {
    const path = candidatePaths[(seed + i * 7) % candidatePaths.length];
    if (seen.has(path)) continue;
    seen.add(path);
    result.push({ changeType: "edit", item: { path, gitObjectType: "blob" } });
  }

  return result;
}

function buildDemoCommitFileContent(baseContent: string, commitId: string, path: string, previous: boolean): string {
  const normalizedBase = baseContent || `// Demo-Datei ${path}\n`;
  if (previous) return normalizedBase;

  const short = commitId.slice(0, 8);
  if (path.endsWith(".md")) {
    return `${normalizedBase}\n\n- Geaendert in Commit ${short}\n`;
  }

  const lines = normalizedBase.replace(/\r/g, "").split("\n");
  const insertionIndex = Math.min(2, Math.max(lines.length, 1));
  lines.splice(insertionIndex, 0, `// commit ${short}: Demo-Aenderung`);
  if (lines.length > 18) {
    lines.splice(18, lines.length - 18);
  }
  return lines.join("\n");
}

function updateApprovalState(
  state: DemoState,
  approvalId: number,
  status: ReleaseApproval["status"],
  comments?: string
) {
  const approval = state.approvals.find((candidate) => candidate.id === approvalId);
  if (!approval) {
    throw new Error("Approval nicht gefunden");
  }

  approval.status = status;
  approval.comments = comments || "";
  approval.modifiedOn = new Date().toISOString();
  approval.approvedBy = status === "approved" ? approval.approver : undefined;

  const release = state.releases.find((candidate) => candidate.id === approval.releaseReference.id);
  if (release) {
    const environment = release.environments.find(
      (candidate) => candidate.id === approval.releaseEnvironmentReference.id
    );
    if (environment) {
      environment.preDeployApprovals = environment.preDeployApprovals.map((entry) =>
        entry.id === approvalId ? clone(approval) : entry
      );
      if (status === "approved") {
        environment.status = "inProgress";
        environment.deploySteps = [
          {
            id: approval.id * 10,
            deploymentId: approval.id * 100,
            status: "inProgress",
            operationStatus: "QueuedForAgent",
            requestedBy: approval.approver,
            queuedOn: new Date().toISOString(),
            startedOn: new Date().toISOString(),
          },
        ];
      } else if (status === "rejected") {
        environment.status = "rejected";
        environment.deploySteps = [
          {
            id: approval.id * 10,
            deploymentId: approval.id * 100,
            status: "rejected",
            operationStatus: "PhaseFailed",
            requestedBy: approval.approver,
            queuedOn: approval.createdOn,
            completedOn: new Date().toISOString(),
          },
        ];
      }
    }
  }

  return clone(approval);
}

export const demoSettings = {
  organization: ORGANIZATION_NAME,
  project: PROJECT_NAME,
};

/**
 * Vollstaendige Demo-API, die alle Azure-DevOps-Serviceaufrufe mit lokalen Daten
 * simuliert. Wird aktiviert, wenn `isDemoClient(client)` true ergibt.
 */
export const demoApi = {
  repositories: {
    listRepositories(): Repository[] {
      return clone(loadDemoState().repositories);
    },

    getBranches(repoId: string): Branch[] {
      return clone(loadDemoState().branches[repoId] || []);
    },

    getTags(repoId: string): Branch[] {
      const state = loadDemoState();
      const branches = state.branches[repoId] || [];
      // Generiere Demo-Tags aus den ersten Commits einer Branch
      return branches.slice(0, 3).map((b, i) => ({
        name: `v1.${i}.0`,
        objectId: b.objectId,
        creator: b.creator,
        url: b.url,
      }));
    },

    createBranch(repoId: string, branchName: string, sourceObjectId: string): void {
      withDemoState((state) => {
        const existing = state.branches[repoId] || [];
        if (existing.some((b) => b.name === branchName)) {
          throw new Error(`Branch "${branchName}" existiert bereits.`);
        }
        const sourceBranchName =
          findBranchByObjectId(state, repoId, sourceObjectId) ||
          findBranchForCommit(state, repoId, sourceObjectId);
        if (sourceBranchName) {
          copyBranchState(state, repoId, sourceBranchName, branchName);
        } else {
          state.commits[repoKey(repoId, branchName)] = [];
          rebuildTreesForRepoBranch(state, repoId, branchName);
        }
        state.branches[repoId] = [
          {
            name: branchName,
            objectId: sourceObjectId,
            creator: existing[0]?.creator ?? { displayName: "Demo", uniqueName: "demo", id: "0" },
            url: `https://demo.local/repos/${repoId}/branches/${branchName}`,
          },
          ...existing,
        ];
      });
    },

    getCommits(repoId: string, branch: string, top = 30, filePath?: string): Commit[] {
      const all = loadDemoState().commits[repoKey(repoId, branch)] || [];
      // Bei Dateihistorie nur jeden 3. Commit zurueckgeben (simuliert gezielte Aenderungen)
      const filtered = filePath ? all.filter((_, i) => i % 3 === 0) : all;
      return clone(filtered.slice(0, top));
    },

    getBranchDiff(repoId: string, baseBranch: string, targetBranch: string): {
      commits: Commit[];
      changes: Array<{ changeType: string; item: { path: string; gitObjectType: "blob" }; originalPath?: string }>;
      commonCommit: string;
    } {
      const state = loadDemoState();
      const targetCommits = (state.commits[repoKey(repoId, targetBranch)] || []).slice(0, 5);
      const baseCommit = (state.commits[repoKey(repoId, baseBranch)] || [])[0];
      return {
        commits: clone(targetCommits),
        changes: targetCommits.length > 0
          ? clone(buildDemoCommitChanges(state, repoId, targetCommits[0]?.commitId || ""))
          : [],
        commonCommit: baseCommit?.commitId || "",
      };
    },

    getTree(repoId: string, branch: string, path = "/"): TreeEntry[] {
      return clone(loadDemoState().trees[treeKey(repoId, branch, path)] || []);
    },

    getFileContent(repoId: string, branch: string, path: string): string {
      return loadDemoState().files[fileKey(repoId, branch, path)] || "// Keine Datei gefunden\n";
    },

    getFileContentAtVersion(
      repoId: string,
      path: string,
      version: string,
      versionType: "branch" | "commit",
      versionOptions?: "previous"
    ): string {
      const state = loadDemoState();
      if (versionType === "branch") {
        return state.files[fileKey(repoId, version, path)] || "// Keine Datei gefunden\n";
      }

      const branch = findBranchForCommit(state, repoId, version) || "main";
      const baseContent = state.files[fileKey(repoId, branch, path)] || "";
      return buildDemoCommitFileContent(baseContent, version, path, versionOptions === "previous");
    },

    getFileBinaryDataUrlAtVersion(
      repoId: string,
      path: string,
      version: string,
      versionType: "branch" | "commit",
      versionOptions?: "previous"
    ): string {
      const extension = path.split(".").pop()?.toLowerCase() || "";
      if (extension === "svg") {
        const svgText = demoApi.repositories.getFileContentAtVersion(
          repoId,
          path,
          version,
          versionType,
          versionOptions
        );
        return `data:image/svg+xml;base64,${encodeToBase64(svgText)}`;
      }

      const short = path.split("/").pop() || path;
      const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="50%" fill="#cbd5e1" font-size="32" text-anchor="middle" dominant-baseline="middle">${short}</text></svg>`;
      return `data:image/svg+xml;base64,${encodeToBase64(placeholder)}`;
    },

    getCommitChanges(
      repoId: string,
      commitId: string
    ): Array<{ changeType: string; item: { path: string; gitObjectType: "blob" }; originalPath?: string }> {
      return clone(buildDemoCommitChanges(loadDemoState(), repoId, commitId));
    },

    pushFileChange(
      repoId: string,
      branchName: string,
      oldObjectId: string,
      filePath: string,
      newContent: string,
      commitMessage: string,
      parentCommitId?: string,
      changeType: "edit" | "add" = "edit"
    ): void {
      withDemoState((state) => {
        const existingBranches = state.branches[repoId] || [];
        let branch = existingBranches.find((candidate) => candidate.name === branchName);

        if (!branch) {
          const sourceBranchName =
            (parentCommitId && (
              findBranchByObjectId(state, repoId, parentCommitId) ||
              findBranchForCommit(state, repoId, parentCommitId)
            )) ||
            null;
          if (sourceBranchName) {
            copyBranchState(state, repoId, sourceBranchName, branchName);
          } else {
            state.commits[repoKey(repoId, branchName)] = [];
            rebuildTreesForRepoBranch(state, repoId, branchName);
          }

          branch = {
            name: branchName,
            objectId: oldObjectId,
            creator: existingBranches[0]?.creator ?? pickIdentity(0),
            url: `https://demo.local/repos/${repoId}/branches/${branchName}`,
          };
          state.branches[repoId] = [branch, ...existingBranches];
        }

        state.files[fileKey(repoId, branchName, filePath)] = newContent;
        rebuildTreesForRepoBranch(state, repoId, branchName);

        const commit = buildDemoWriteCommit(repoId, branchName, filePath, commitMessage, changeType);
        state.commits[repoKey(repoId, branchName)] = [
          commit,
          ...(state.commits[repoKey(repoId, branchName)] || []),
        ];
        branch.objectId = commit.commitId;
      });
    },
  },

  pullRequests: {
    listPullRequests(repoId: string, status: PullRequest["status"] | "all", top = 50): PullRequest[] {
      const prs = listPrsForRepo(loadDemoState(), repoId);
      const filtered = status === "all" ? prs : prs.filter((pr) => pr.status === status);
      return clone(filtered.slice(0, top));
    },

    getPullRequest(repoId: string, prId: number): PullRequest {
      const pr = findPullRequest(loadDemoState(), repoId, prId);
      if (!pr) throw new Error("Pull Request nicht gefunden");
      return clone(pr);
    },

    getThreads(repoId: string, prId: number): PRThread[] {
      return clone(loadDemoState().threads[prKey(repoId, prId)] || []);
    },

    addComment(repoId: string, prId: number, content: string): PRThread {
      return withDemoState((state) => {
        const key = prKey(repoId, prId);
        const author = pickIdentity(0);
        const threadList = state.threads[key] || [];
        // Neue Kommentare werden als eigener Thread gespeichert, passend zur bestehenden UI.
        const thread: PRThread = {
          id: state.counters.nextThreadId++,
          status: "active",
          publishedDate: new Date().toISOString(),
          lastUpdatedDate: new Date().toISOString(),
          comments: [
            {
              id: state.counters.nextCommentId++,
              content,
              author,
              publishedDate: new Date().toISOString(),
              lastUpdatedDate: new Date().toISOString(),
              commentType: "text",
            },
          ],
        };
        state.threads[key] = [thread, ...threadList];
        return clone(thread);
      });
    },

    vote(repoId: string, prId: number, reviewerId: string, vote: number): void {
      withDemoState((state) => {
        const pr = findPullRequest(state, repoId, prId);
        if (!pr) throw new Error("Pull Request nicht gefunden");
        const reviewer = pr.reviewers.find((candidate) => candidate.id === reviewerId) || pr.reviewers[0];
        if (!reviewer) throw new Error("Reviewer nicht gefunden");
        reviewer.vote = vote as Reviewer["vote"];
      });
    },

    complete(repoId: string, prId: number, _lastMergeSourceCommitId: string, deleteSourceBranch = false): PullRequest {
      return withDemoState((state) => {
        const pr = findPullRequest(state, repoId, prId);
        if (!pr) throw new Error("Pull Request nicht gefunden");
        pr.status = "completed";
        pr.closedDate = new Date().toISOString();
        pr.completionOptions = {
          deleteSourceBranch,
          mergeStrategy: "noFastForward",
        };
        return clone(pr);
      });
    },

    create(
      repoId: string,
      payload: {
        title: string;
        description?: string;
        sourceRefName: string;
        targetRefName: string;
        isDraft?: boolean;
      }
    ): PullRequest {
      return withDemoState((state) => {
        const repo = state.repositories.find((candidate) => candidate.id === repoId);
        if (!repo) throw new Error("Repository nicht gefunden");

        const pr: PullRequest = {
          pullRequestId: state.counters.nextPrId++,
          title: payload.title,
          description: payload.description,
          status: "active",
          createdBy: pickIdentity(0),
          creationDate: new Date().toISOString(),
          sourceRefName: payload.sourceRefName,
          targetRefName: payload.targetRefName,
          mergeStatus: "queued",
          isDraft: payload.isDraft,
          reviewers: [toReviewer(1, 0), toReviewer(2, 0, false)],
          repository: { id: repo.id, name: repo.name, project: { name: PROJECT_NAME } },
          url: `https://demo.local/repos/${repo.id}/pullrequests/${state.counters.nextPrId - 1}`,
        };

        const key = prKey(repoId, pr.pullRequestId);
        state.pullRequests[repoId] = [pr, ...(state.pullRequests[repoId] || [])];
        state.iterations[key] = [
          {
            id: state.counters.nextIterationId++,
            description: "Initiale Demo-Iteration",
            author: pickIdentity(0),
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            sourceRefCommit: { commitId: `${repo.id}${pr.pullRequestId}`.padEnd(40, "1").slice(0, 40) },
            targetRefCommit: { commitId: `${repo.id}${pr.pullRequestId}`.padEnd(40, "2").slice(0, 40) },
          },
        ];
        state.changes[changeKey(repoId, pr.pullRequestId, state.iterations[key][0].id)] = {
          changeEntries: [
            { item: { path: "/src/domain/service.ts" }, changeType: "edit" },
            { item: { path: "/README.md" }, changeType: "edit" },
            { item: { path: "/docs/architecture.md" }, changeType: "edit" },
            { item: { path: "/assets/system-overview.svg" }, changeType: "edit" },
          ],
        };
        state.threads[key] = [];
        return clone(pr);
      });
    },

    getIterations(repoId: string, prId: number): PRIteration[] {
      return clone(loadDemoState().iterations[prKey(repoId, prId)] || []);
    },

    getIterationChanges(repoId: string, prId: number, iterationId: number): IterationChanges {
      const state = loadDemoState();
      const key = changeKey(repoId, prId, iterationId);
      const iteration = (state.iterations[prKey(repoId, prId)] || []).find((candidate) => candidate.id === iterationId);

      if (iteration?.sourceRefCommit?.commitId) {
        return {
          changeEntries: clone(buildDemoCommitChanges(state, repoId, iteration.sourceRefCommit.commitId)),
        };
      }

      return clone(state.changes[key] || { changeEntries: [] });
    },

    getPolicies(prId: number): Array<{ id: string; status: string; displayName: string; isRequired: boolean }> {
      return [
        { id: `policy-${prId}-1`, status: "approved", displayName: "Mindestanzahl Reviewer", isRequired: true },
        { id: `policy-${prId}-2`, status: "approved", displayName: "Build-Validierung erfolgreich", isRequired: true },
        { id: `policy-${prId}-3`, status: "queued", displayName: "Code Coverage >= 80%", isRequired: false },
        { id: `policy-${prId}-4`, status: "rejected", displayName: "Kein aktiver Merge-Konflikt", isRequired: true },
      ];
    },
  },

  pipelines: {
    listPipelines(): Pipeline[] {
      return clone(loadDemoState().pipelines);
    },

    createPipeline(payload: {
      name: string;
      folder?: string;
      yamlPath: string;
      repositoryId: string;
      repositoryName: string;
    }): Pipeline {
      return withDemoState((state) => {
        const nextId = Math.max(0, ...state.pipelines.map((pipeline) => pipeline.id)) + 1;
        const pipeline: Pipeline = {
          id: nextId,
          name: payload.name,
          folder: payload.folder || "\\",
          project: projectRef(),
        };
        state.pipelines.unshift(pipeline);
        return clone(pipeline);
      });
    },

    listBuilds(definitionIds?: number[], top = 20, repositoryId?: string): Build[] {
      const state = loadDemoState();
      let buildList = [...state.builds];
      if (definitionIds?.length) {
        buildList = buildList.filter((build) => definitionIds.includes(build.definition.id));
      }
      if (repositoryId) {
        buildList = buildList.filter((build) => build.repository.id === repositoryId);
      }
      return clone(buildList.slice(0, top));
    },

    getBuild(buildId: number): Build {
      const build = loadDemoState().builds.find((candidate) => candidate.id === buildId);
      if (!build) throw new Error("Build nicht gefunden");
      return clone(build);
    },

    getBuildTimeline(buildId: number): BuildTimeline {
      return clone(loadDemoState().timelines[String(buildId)] || { records: [] });
    },

    getBuildLog(buildId: number, logId: number): string {
      return loadDemoState().logs[logKey(buildId, logId)] || "Kein Demo-Log vorhanden.\n";
    },

    getArtifacts(buildId: number): BuildArtifact[] {
      return clone(loadDemoState().artifacts[String(buildId)] || []);
    },

    queueBuild(definitionId: number, sourceBranch?: string): Build {
      return withDemoState((state) => {
        const pipeline = state.pipelines.find((candidate) => candidate.id === definitionId);
        if (!pipeline) throw new Error("Pipeline nicht gefunden");
        const namespace = pipeline.folder?.split("\\").filter(Boolean)[0]?.toLowerCase();
        const repo = state.repositories.find((candidate) =>
          namespace ? candidate.name.startsWith(`${namespace}/`) : true
        ) || state.repositories[0];

        const buildId = state.counters.nextBuildId++;
        const build: Build = {
          id: buildId,
          buildNumber: `2026.${state.counters.nextBuildId % 100}.${definitionId}`,
          status: "inProgress",
          queueTime: new Date().toISOString(),
          startTime: new Date().toISOString(),
          requestedBy: pickIdentity(0),
          requestedFor: pickIdentity(1),
          definition: { id: pipeline.id, name: pipeline.name, path: pipeline.folder || "\\" },
          sourceBranch: sourceBranch || "refs/heads/main",
          sourceVersion: `${buildId}${definitionId}`.padEnd(40, "3").slice(0, 40),
          repository: { id: repo.id, name: repo.name },
          logs: { url: `https://demo.local/builds/${buildId}/logs` },
          url: `https://demo.local/builds/${buildId}`,
          _links: { timeline: { href: `https://demo.local/builds/${buildId}/timeline` } },
        };
        state.builds.unshift(build);
        // Neue Demo-Builds starten immer "inProgress", damit die Detailansicht Live-Zustand zeigen kann.
        const timelineData = createBuildTimeline(buildId, 0, true);
        state.timelines[String(buildId)] = timelineData.timeline;
        Object.assign(state.logs, timelineData.logs);
        state.artifacts[String(buildId)] = [];
        return clone(build);
      });
    },

    cancelBuild(buildId: number): void {
      withDemoState((state) => {
        const build = state.builds.find((candidate) => candidate.id === buildId);
        if (!build) throw new Error("Build nicht gefunden");
        build.status = "completed";
        build.result = "canceled";
        build.finishTime = new Date().toISOString();
        const timeline = state.timelines[String(buildId)];
        if (timeline) {
          timeline.records = timeline.records.map((record) => ({
            ...record,
            state: "completed",
            result: record.result || "canceled",
            finishTime: record.finishTime || new Date().toISOString(),
          }));
        }
      });
    },

    listPipelineFolders(): string[] {
      return listPipelineFoldersFromPipelines(loadDemoState().pipelines);
    },
  },

  releases: {
    listDefinitions(): ReleaseDefinition[] {
      return clone(loadDemoState().releaseDefinitions);
    },

    getDefinition(definitionId: number): ReleaseDefinition {
      const definition = loadDemoState().releaseDefinitions.find((candidate) => candidate.id === definitionId);
      if (!definition) throw new Error("Release-Definition nicht gefunden");
      return clone(definition);
    },

    listReleases(definitionId?: number, top = 20): Release[] {
      const releases = loadDemoState().releases;
      const filtered = definitionId
        ? releases.filter((release) => release.releaseDefinition.id === definitionId)
        : releases;
      return clone(filtered.slice(0, top));
    },

    getRelease(releaseId: number): Release {
      const release = loadDemoState().releases.find((candidate) => candidate.id === releaseId);
      if (!release) throw new Error("Release nicht gefunden");
      return clone(release);
    },

    createRelease(definitionId: number, description?: string): Release {
      return withDemoState((state) => {
        const definition = state.releaseDefinitions.find((candidate) => candidate.id === definitionId);
        if (!definition) throw new Error("Release-Definition nicht gefunden");

        const releaseId = state.counters.nextReleaseId++;
        const releaseName = `${definition.name} Release-${releaseId}`;
        const prodApprovalId = state.counters.nextApprovalId++;
        // Neue Releases starten mit offenem Prod-Approval, damit der Approval-Tab direkt Inhalt hat.
        const prodApproval: ReleaseApproval = {
          id: prodApprovalId,
          status: "pending",
          approver: pickIdentity(2),
          comments: "",
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString(),
          releaseEnvironmentReference: { id: definition.environments?.[2].id || 0, name: "Prod" },
          releaseReference: { id: releaseId, name: releaseName },
        };

        const release: Release = {
          id: releaseId,
          name: releaseName,
          status: "active",
          createdBy: pickIdentity(0),
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString(),
          releaseDefinition: { id: definition.id, name: definition.name },
          description,
          environments: [
            {
              id: definition.environments?.[0].id || 0,
              name: "Dev",
              status: "succeeded",
              deploySteps: [],
              preDeployApprovals: [],
              postDeployApprovals: [],
              rank: 1,
            },
            {
              id: definition.environments?.[1].id || 0,
              name: "Test",
              status: "inProgress",
              deploySteps: [],
              preDeployApprovals: [],
              postDeployApprovals: [],
              rank: 2,
            },
            {
              id: definition.environments?.[2].id || 0,
              name: "Prod",
              status: "queued",
              deploySteps: [],
              preDeployApprovals: [prodApproval],
              postDeployApprovals: [],
              rank: 3,
            },
          ],
        };
        state.releases.unshift(release);
        state.approvals.unshift(prodApproval);
        return clone(release);
      });
    },

    getPendingApprovals(): ReleaseApproval[] {
      return clone(loadDemoState().approvals.filter((approval) => approval.status === "pending"));
    },

    approveRelease(approvalId: number, comments?: string): ReleaseApproval {
      return withDemoState((state) => updateApprovalState(state, approvalId, "approved", comments));
    },

    rejectApproval(approvalId: number, comments?: string): ReleaseApproval {
      return withDemoState((state) => updateApprovalState(state, approvalId, "rejected", comments));
    },

    getEnvironmentLogs(releaseId: number, environmentId: number): string {
      return [
        `[2025-03-06T10:00:00Z] Deploy-Agent: Initialisierung gestartet`,
        `[2025-03-06T10:00:01Z] Artifact heruntergeladen: api-gateway-${releaseId}.zip`,
        `[2025-03-06T10:00:05Z] Environment ${environmentId}: Vorbedingungen geprueft`,
        `[2025-03-06T10:00:10Z] Task: Build-Artefakt entpacken – Erfolg`,
        `[2025-03-06T10:00:15Z] Task: Docker-Image taggen – Erfolg`,
        `[2025-03-06T10:00:22Z] Task: Registry-Push – Erfolg`,
        `[2025-03-06T10:00:35Z] Task: Kubernetes-Deployment anwenden – Erfolg`,
        `[2025-03-06T10:00:40Z] Health-Check: 3/3 Pods laufen`,
        `[2025-03-06T10:00:42Z] Task: Smoke-Test (HTTP 200) – Erfolg`,
        `[2025-03-06T10:00:43Z] Deployment abgeschlossen – Status: Succeeded`,
      ].join("\n");
    },
  },

  workItems: {
    listMyWorkItems(): WorkItem[] {
      const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
      return [
        {
          id: 1001,
          rev: 3,
          fields: {
            "System.Title": "Login-Seite: Token-Refresh-Fehler bei langem Inaktivitaets-Timeout",
            "System.State": "Active",
            "System.WorkItemType": "Bug",
            "System.AssignedTo": identityPool[0],
            "System.CreatedDate": ago(10),
            "System.ChangedDate": ago(1),
            "Microsoft.VSTS.Common.Priority": 1,
          },
          url: "https://demo.local/workitems/1001",
        },
        {
          id: 1002,
          rev: 2,
          fields: {
            "System.Title": "Dashboard: Schnellzugriff-Kacheln auch fuer Releases konfigurierbar machen",
            "System.State": "Active",
            "System.WorkItemType": "User Story",
            "System.AssignedTo": identityPool[0],
            "System.CreatedDate": ago(7),
            "System.ChangedDate": ago(2),
            "Microsoft.VSTS.Common.Priority": 2,
          },
          url: "https://demo.local/workitems/1002",
        },
        {
          id: 1003,
          rev: 1,
          fields: {
            "System.Title": "Pull Request Detail: Reviewer-Liste auch in der Mobil-Ansicht sortierbar",
            "System.State": "New",
            "System.WorkItemType": "Task",
            "System.AssignedTo": identityPool[0],
            "System.CreatedDate": ago(3),
            "System.ChangedDate": ago(3),
            "Microsoft.VSTS.Common.Priority": 3,
          },
          url: "https://demo.local/workitems/1003",
        },
        {
          id: 1004,
          rev: 5,
          fields: {
            "System.Title": "CI/CD: Pipeline-Laufzeiten in Analytics-Bericht exportieren",
            "System.State": "Resolved",
            "System.WorkItemType": "Feature",
            "System.AssignedTo": identityPool[1],
            "System.CreatedDate": ago(20),
            "System.ChangedDate": ago(0),
            "Microsoft.VSTS.Common.Priority": 2,
          },
          url: "https://demo.local/workitems/1004",
        },
        {
          id: 1005,
          rev: 2,
          fields: {
            "System.Title": "API-Gateway: Rate-Limit konfigurierbar per Service machen",
            "System.State": "Active",
            "System.WorkItemType": "User Story",
            "System.AssignedTo": identityPool[2],
            "System.CreatedDate": ago(5),
            "System.ChangedDate": ago(1),
            "Microsoft.VSTS.Common.Priority": 2,
          },
          url: "https://demo.local/workitems/1005",
        },
        {
          id: 1006,
          rev: 1,
          fields: {
            "System.Title": "Billing-Service: Rechnungs-PDF als ZIP-Archiv zum Download anbieten",
            "System.State": "New",
            "System.WorkItemType": "User Story",
            "System.AssignedTo": identityPool[0],
            "System.CreatedDate": ago(1),
            "System.ChangedDate": ago(1),
            "Microsoft.VSTS.Common.Priority": 3,
          },
          url: "https://demo.local/workitems/1006",
        },
      ] as WorkItem[];
    },
  },
};
