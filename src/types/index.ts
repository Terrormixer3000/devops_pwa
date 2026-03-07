// Settings
export type ThemeMode = "dark" | "light";

export interface AppSettings {
  organization: string;
  project: string;
  pat: string;
  demoMode: boolean;
  theme: ThemeMode;
}

// Repository
export interface Repository {
  id: string;
  name: string;
  project: { id: string; name: string };
  defaultBranch?: string;
  remoteUrl?: string;
  size?: number;
}

// Pull Request
export type PRStatus = "active" | "abandoned" | "completed" | "all";
export type PRVote = -10 | -5 | 0 | 5 | 10;

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

export interface Reviewer {
  id: string;
  displayName: string;
  imageUrl?: string;
  vote: PRVote;
  isRequired?: boolean;
}

export interface IdentityRef {
  id: string;
  displayName: string;
  imageUrl?: string;
  uniqueName?: string;
}

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

export interface PRComment {
  id: number;
  content: string;
  author: IdentityRef;
  publishedDate: string;
  lastUpdatedDate: string;
  commentType: "text" | "codeChange" | "system";
}

export interface PRIteration {
  id: number;
  description?: string;
  author: IdentityRef;
  createdDate: string;
  updatedDate: string;
  sourceRefCommit: { commitId: string };
  targetRefCommit: { commitId: string };
}

export interface FileDiff {
  path: string;
  originalPath?: string;
  changeType: "add" | "edit" | "delete" | "rename";
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldLineNumberStart: number;
  oldLinesCount: number;
  newLineNumberStart: number;
  newLinesCount: number;
  diffLines: DiffLine[];
}

export interface DiffLine {
  lineOrigin: "context" | "add" | "delete";
  line: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// Branch & Commit
export interface Branch {
  name: string;
  objectId: string;
  creator: IdentityRef;
  url: string;
  statuses?: BranchStatus[];
  aheadCount?: number;
  behindCount?: number;
}

export interface BranchStatus {
  state: "error" | "failed" | "notApplicable" | "pending" | "succeeded";
  description: string;
  context: { name: string; genre: string };
}

export interface Commit {
  commitId: string;
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  comment: string;
  changeCounts?: { Add: number; Edit: number; Delete: number };
  url: string;
  remoteUrl?: string;
}

// Tree / File
export interface TreeEntry {
  objectId: string;
  gitObjectType: "blob" | "tree";
  path: string;
  size?: number;
  url: string;
}

// Pipeline / Build
export type BuildStatus = "none" | "inProgress" | "completed" | "cancelling" | "postponed" | "notStarted" | "all";
export type BuildResult = "none" | "succeeded" | "partiallySucceeded" | "failed" | "canceled";

export interface Pipeline {
  id: number;
  name: string;
  folder?: string;
  project?: { id: string; name: string };
}

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

export interface BuildTimeline {
  records: TimelineRecord[];
}

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

export interface BuildArtifact {
  id: number;
  name: string;
  resource: {
    type: string;
    downloadUrl: string;
    url: string;
  };
}

// Release Pipeline
export interface ReleaseDefinition {
  id: number;
  name: string;
  description?: string;
  createdBy: IdentityRef;
  modifiedOn: string;
  environments?: ReleaseEnvironmentDefinition[];
}

export interface ReleaseEnvironmentDefinition {
  id: number;
  name: string;
  rank: number;
}

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

export interface ReleaseEnvironment {
  id: number;
  name: string;
  status: "notStarted" | "inProgress" | "succeeded" | "canceled" | "rejected" | "queued" | "scheduled" | "partiallySucceeded";
  deploySteps: DeployStep[];
  preDeployApprovals: ReleaseApproval[];
  postDeployApprovals: ReleaseApproval[];
  rank: number;
}

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

// API Response wrappers
export interface AzureListResponse<T> {
  count: number;
  value: T[];
}

// App state
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

// Azure DevOps Service Hook Payload (relevante Felder)
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
