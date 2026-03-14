// ─── Einstellungen ───────────────────────────────────────────────────────────

/** Hell- oder Dunkel-Theme der App. */
export type ThemeMode = "dark" | "light";

/** Sprache der App-Oberflaeche. */
export type Locale = "de" | "en";

/** Gesamte App-Konfiguration, die im localStorage gespeichert wird. */
export interface AppSettings {
  organization: string;
  project: string;
  pat: string;
  demoMode: boolean;
  theme: ThemeMode;
  locale?: Locale;
}

// ─── Repository ─────────────────────────────────────────────────────────────

/** Azure DevOps Git-Repository. */
export interface Repository {
  id: string;
  name: string;
  project: { id: string; name: string };
  defaultBranch?: string;
  remoteUrl?: string;
  size?: number;
}

// ─── Pull Request ────────────────────────────────────────────────────────────

/** Filterstatus fuer PR-Abfragen. */
export type PRStatus = "active" | "abandoned" | "completed" | "all";

/** Numerischer Vote-Wert eines PR-Reviewers (negativ = ablehnen, positiv = zustimmen). */
export type PRVote = -10 | -5 | 0 | 5 | 10;

/** Vollstaendige PR-Daten wie von der Azure DevOps API geliefert. */
export interface PullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  status: PRStatus;
  createdBy: IdentityRef;
  creationDate: string;
  closedDate?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus?: string;
  isDraft?: boolean;
  reviewers: Reviewer[];
  repository: { id: string; name: string; project: { name: string } };
  url: string;
  completionOptions?: {
    mergeStrategy?: string;
    deleteSourceBranch?: boolean;
  };
}

/** PR-Reviewer inklusive seinem Abstimmungsstatus. */
export interface Reviewer {
  id: string;
  displayName: string;
  imageUrl?: string;
  vote: PRVote;
  isRequired?: boolean;
}

/** Minimales Identitaets-Objekt fuer Azure DevOps Benutzer. */
export interface IdentityRef {
  id: string;
  displayName: string;
  imageUrl?: string;
  uniqueName?: string;
}

/** Kommentar-Thread in einem PR (kann Datei-Kontext haben). */
export interface PRThread {
  id: number;
  comments: PRComment[];
  status: "active" | "fixed" | "wontFix" | "closed" | "byDesign" | "pending";
  threadContext?: {
    filePath: string;
    leftFileStart?: { line: number; offset: number };
    leftFileEnd?: { line: number; offset: number };
    rightFileStart?: { line: number; offset: number };
    rightFileEnd?: { line: number; offset: number };
  };
  publishedDate: string;
  lastUpdatedDate: string;
}

/** Einzelner Kommentar innerhalb eines Thread. */
export interface PRComment {
  id: number;
  content: string;
  author: IdentityRef;
  publishedDate: string;
  lastUpdatedDate: string;
  commentType: "text" | "codeChange" | "system";
}

/** Eine PR-Iteration (entspricht einem Push auf den Source-Branch). */
export interface PRIteration {
  id: number;
  description?: string;
  author: IdentityRef;
  createdDate: string;
  updatedDate: string;
  sourceRefCommit: { commitId: string };
  targetRefCommit: { commitId: string };
}

/** Diff-Daten fuer eine einzelne geaenderte Datei. */
export interface FileDiff {
  path: string;
  originalPath?: string;
  changeType: "add" | "edit" | "delete" | "rename";
  hunks: DiffHunk[];
}

/** Zusammenhaengender Aenderungsblock innerhalb eines Datei-Diffs. */
export interface DiffHunk {
  oldLineNumberStart: number;
  oldLinesCount: number;
  newLineNumberStart: number;
  newLinesCount: number;
  diffLines: DiffLine[];
}

/** Einzelne Zeile im Diff (Kontext, Hinzufuegung oder Loeschung). */
export interface DiffLine {
  lineOrigin: "context" | "add" | "delete";
  line: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ─── Branch & Commit ─────────────────────────────────────────────────────────

/** Git-Branch oder -Tag wie er von der Azure DevOps Refs-API geliefert wird. */
export interface Branch {
  name: string;
  objectId: string;
  creator: IdentityRef;
  url: string;
  statuses?: BranchStatus[];
  aheadCount?: number;
  behindCount?: number;
}

/** CI/CD-Status eines Branches (z.B. Build-Status). */
export interface BranchStatus {
  state: "error" | "failed" | "notApplicable" | "pending" | "succeeded";
  description: string;
  context: { name: string; genre: string };
}

/** Git-Commit-Daten. */
export interface Commit {
  commitId: string;
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  comment: string;
  changeCounts?: { Add: number; Edit: number; Delete: number };
  url: string;
  remoteUrl?: string;
}

// ─── Tree / Dateisystem ──────────────────────────────────────────────────────

/** Eintrag im Git-Verzeichnisbaum (Datei oder Verzeichnis). */
export interface TreeEntry {
  objectId: string;
  gitObjectType: "blob" | "tree";
  path: string;
  size?: number;
  url: string;
}

// ─── Pipeline / Build ────────────────────────────────────────────────────────

/** Laufzustand eines Builds. */
export type BuildStatus = "none" | "inProgress" | "completed" | "cancelling" | "postponed" | "notStarted" | "all";
export type BuildResult = "none" | "succeeded" | "partiallySucceeded" | "failed" | "canceled";

/** Pipeline-Definition (ohne Build-Instanzen). */
export interface Pipeline {
  id: number;
  name: string;
  folder?: string;
  project?: { id: string; name: string };
}

/** Konkrete Build-Instanz einer Pipeline. */
export interface Build {
  id: number;
  buildNumber: string;
  status: BuildStatus;
  result?: BuildResult;
  queueTime: string;
  startTime?: string;
  finishTime?: string;
  requestedBy: IdentityRef;
  requestedFor?: IdentityRef;
  definition: { id: number; name: string; path: string };
  sourceBranch: string;
  sourceVersion: string;
  repository: { id: string; name: string };
  logs?: { url: string };
  url: string;
  _links?: { timeline?: { href: string } };
}

/** Timeline-Objekt mit allen Stage/Job/Step-Eintraegen eines Builds. */
export interface BuildTimeline {
  records: TimelineRecord[];
}

/** Einzelner Eintrag in der Build-Timeline (Stage, Phase, Job oder Step). */
export interface TimelineRecord {
  id: string;
  type: string;
  name: string;
  state: string;
  result?: string;
  percentComplete?: number;
  startTime?: string;
  finishTime?: string;
  log?: { url: string };
  parentId?: string;
  order?: number;
}

/** Build-Artefakt (z.B. Deployment-Paket oder Testergebnisse). */
export interface BuildArtifact {
  id: number;
  name: string;
  resource: {
    type: string;
    downloadUrl: string;
    url: string;
  };
}

// ─── Release Pipeline ────────────────────────────────────────────────────────

/** Release-Pipeline-Definition (Vorlage fuer Releases). */
export interface ReleaseDefinition {
  id: number;
  name: string;
  description?: string;
  createdBy: IdentityRef;
  modifiedOn: string;
  environments?: ReleaseEnvironmentDefinition[];
}

/** Umgebungs-Stufendefinition innerhalb einer Release-Pipeline. */
export interface ReleaseEnvironmentDefinition {
  id: number;
  name: string;
  rank: number;
}

/** Konkrete Release-Instanz einer Release-Pipeline. */
export interface Release {
  id: number;
  name: string;
  status: "active" | "abandoned" | "draft" | "undefined";
  createdBy: IdentityRef;
  createdOn: string;
  modifiedOn: string;
  releaseDefinition: { id: number; name: string };
  environments: ReleaseEnvironment[];
  description?: string;
}

/** Umgebungsstufe innerhalb eines konkreten Releases (z.B. Dev, Staging, Prod). */
export interface ReleaseEnvironment {
  id: number;
  name: string;
  status: "notStarted" | "inProgress" | "succeeded" | "canceled" | "rejected" | "queued" | "scheduled" | "partiallySucceeded";
  deploySteps: DeployStep[];
  preDeployApprovals: ReleaseApproval[];
  postDeployApprovals: ReleaseApproval[];
  rank: number;
}

/** Einzelner Deployment-Schritt innerhalb einer Release-Umgebung. */
export interface DeployStep {
  id: number;
  deploymentId: number;
  status: string;
  operationStatus: string;
  requestedBy?: IdentityRef;
  queuedOn?: string;
  startedOn?: string;
  completedOn?: string;
  lastModifiedBy?: IdentityRef;
}

/** Ausstehende oder abgeschlossene Freigabe-Approval fuer eine Release-Umgebung. */
export interface ReleaseApproval {
  id: number;
  status: "approved" | "canceled" | "pending" | "reassigned" | "rejected" | "skipped" | "undefined";
  approver: IdentityRef;
  approvedBy?: IdentityRef;
  comments?: string;
  createdOn: string;
  modifiedOn: string;
  releaseEnvironmentReference: { id: number; name: string };
  releaseReference: { id: number; name: string };
}

// ─── API-Antwortwrapper ────────────────────────────────────────────────────

/** Standardantwort der Azure DevOps List-Endpunkte mit Anzahl und Elementen. */
export interface AzureListResponse<T> {
  count: number;
  value: T[];
}

// ─── App-Status ──────────────────────────────────────────────────────────────

/** Ausgewaehlte Repositories fuer Einzel- oder Mehrfachauswahl. */
export interface SelectedRepositories {
  repositories: Repository[];
  mode: "single" | "multi";
}

// Web Push Notifications
export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  org: string;
  project: string;
  /** Stabile Azure DevOps User-GUID des PAT-Inhabers. Wird genutzt um Notifications
   *  nur an den User zu senden, der das jeweilige Event betrifft. */
  azureUserId: string;
  /** Anzeigename — nur fuer Debugging/Admin, hat keinen Einfluss auf die Filterung. */
  displayName: string;
  createdAt: string;
  /** Zufaelliger 64-stelliger Hex-Token (256 Bit Entropie) — wird als ?t=<token> in der
   *  Webhook-URL verwendet. Authentifiziert eingehende Azure DevOps Service Hooks. */
  webhookToken: string;
}

// Payload der vom Service Worker als Notification angezeigt wird
export interface WebhookNotificationPayload {
  title: string;
  body: string;
  /** Verhindert doppelte Notifications fuer denselben Event (z.B. "build-123") */
  tag: string;
  /** Deep-Link in die App beim Tippen auf die Notification */
  url: string;
}

/** Identitaets-Objekt wie es Azure DevOps in Service Hook Payloads sendet */
export interface AzureIdentityRef {
  id: string;
  displayName: string;
  uniqueName?: string;
}

// ─── Work Items ───────────────────────────────────────────────────────────────

/** Bekannte Work-Item-Typen in Azure DevOps. */
export type WorkItemType = "Bug" | "Task" | "User Story" | "Feature" | "Epic" | "Issue";

/** Workflow-Status eines Work Items (erweiterbar durch prozessspezifische States). */
export type WorkItemState = "Active" | "New" | "Resolved" | "Closed" | "Removed" | string;

/** Vollstaendiges Work-Item-Objekt mit allen zentralen Feldern. */
export interface WorkItem {
  id: number;
  rev: number;
  fields: {
    "System.Title": string;
    "System.State": WorkItemState;
    "System.WorkItemType": WorkItemType | string;
    "System.AssignedTo"?: IdentityRef | null;
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
    "System.Description"?: string;
  };
  url: string;
}

// ─── Service-Hook-Payloads ────────────────────────────────────────────────────

/** Eingehender Webhook-Payload von einem Azure DevOps Service Hook (relevante Felder). */
export interface AzureServiceHookPayload {
  eventType: string;
  resource: {
    id?: number;
    buildNumber?: string;
    result?: string;
    status?: string;
    definition?: { id: number; name: string };
    repository?: { id?: string; name?: string; project?: { name?: string } };
    project?: { name: string };
    pullRequestId?: number;
    title?: string;
    /** User der den PR erstellt hat */
    createdBy?: AzureIdentityRef;
    comment?: { content: string; author?: AzureIdentityRef };
    /** Alle aktuellen Reviewer des PRs — enthaelt den neu hinzugefuegten User */
    reviewers?: AzureIdentityRef[];
    /** Neu hinzugefuegter Reviewer (nur bei reviewersUpdated Event) */
    reviewer?: AzureIdentityRef;
    approval?: {
      approver?: AzureIdentityRef;
      release?: { id?: number; name: string };
      releaseEnvironment?: { name: string };
    };
    release?: { id?: number; name: string };
    releaseEnvironment?: { name: string };
    /** User fuer den der Build angefordert wurde */
    requestedFor?: AzureIdentityRef;
    /** User der den Build angefordert hat */
    requestedBy?: AzureIdentityRef;
  };
  resourceContainers?: {
    project?: { baseUrl?: string; id?: string };
    account?: { baseUrl?: string };
    collection?: { baseUrl?: string };
  };
  message?: { text?: string };
}
