import type { WorkflowTask, ReleaseStageConfig } from "@/types";

// ─── Task-Definitionen ────────────────────────────────────────────────────────

/** Vordefinierter Bash-Task. */
const BASH_TASK: WorkflowTask = {
  taskId: "6c731c3c-3c68-459a-a5c9-bde6e6595b5b",
  version: "3.*",
  name: "Bash-Skript",
  enabled: true,
  inputs: {
    targetType: "inline",
    script: "echo 'Hallo von Azure Pipelines'",
    workingDirectory: "",
  },
};

/** Vordefinierter PowerShell-Task. */
const POWERSHELL_TASK: WorkflowTask = {
  taskId: "e213ff0f-5d5c-4791-802d-52ea3e7be1f1",
  version: "2.*",
  name: "PowerShell-Skript",
  enabled: true,
  inputs: {
    targetType: "inline",
    script: "Write-Host 'Hallo von Azure Pipelines'",
    workingDirectory: "",
  },
};

/** Vordefinierter Befehlszeilen-Task. */
const CMD_TASK: WorkflowTask = {
  taskId: "d9bafed4-0b18-4f58-968d-86655b4d2ce9",
  version: "2.*",
  name: "Befehlszeile",
  enabled: true,
  inputs: {
    script: "echo Hallo",
    workingDirectory: "",
  },
};

/** Vordefinierter Azure App Service-Task. */
const AZURE_WEBAPP_TASK: WorkflowTask = {
  taskId: "497d490f-eea7-4f2b-ab94-48d9c1acdcb1",
  version: "4.*",
  name: "Azure App Service-Bereitstellung",
  enabled: true,
  inputs: {
    azureSubscription: "",
    appType: "webApp",
    WebAppName: "",
    package: "$(System.DefaultWorkingDirectory)/**/*.zip",
  },
};

/** Vordefinierter Azure CLI-Task. */
const AZURE_CLI_TASK: WorkflowTask = {
  taskId: "46e4be58-730b-4389-8a2f-ea10b3e5d1ca",
  version: "2.*",
  name: "Azure CLI",
  enabled: true,
  inputs: {
    azureSubscription: "",
    scriptType: "bash",
    scriptLocation: "inlineScript",
    inlineScript: "az --version",
  },
};

/** Vordefinierter kubectl-Task fuer Kubernetes-Deployments. */
const KUBECTL_TASK: WorkflowTask = {
  taskId: "8d3b2b7b-62d0-4f6f-8f98-eba1d06f2b14",
  version: "1.*",
  name: "kubectl",
  enabled: true,
  inputs: {
    connectionType: "Kubernetes Service Connection",
    command: "apply",
    useConfigurationFile: "false",
    inline: "# kubectl apply -f deployment.yaml",
  },
};

/** Vordefinierter Dateien-Kopieren-Task. */
const COPY_FILES_TASK: WorkflowTask = {
  taskId: "5bfb729a-a7c8-4a78-a7c3-8d717bb7c13c",
  version: "2.*",
  name: "Dateien kopieren",
  enabled: true,
  inputs: {
    SourceFolder: "$(Build.SourcesDirectory)",
    Contents: "**",
    TargetFolder: "$(Build.ArtifactStagingDirectory)",
  },
};

// ─── Task-Katalog ─────────────────────────────────────────────────────────────

export interface TaskDefinition {
  id: string;
  label: string;
  description: string;
  defaultTask: WorkflowTask;
}

/** Alle verfuegbaren Task-Typen fuer den Task-Picker. */
export const AVAILABLE_TASKS: TaskDefinition[] = [
  {
    id: "bash",
    label: "Bash",
    description: "Shell-Skript ausfuehren",
    defaultTask: BASH_TASK,
  },
  {
    id: "powershell",
    label: "PowerShell",
    description: "PowerShell-Skript ausfuehren",
    defaultTask: POWERSHELL_TASK,
  },
  {
    id: "cmd",
    label: "Befehlszeile",
    description: "Kommandozeilen-Skript ausfuehren",
    defaultTask: CMD_TASK,
  },
  {
    id: "azure-webapp",
    label: "Azure App Service",
    description: "App auf Azure Web App bereitstellen",
    defaultTask: AZURE_WEBAPP_TASK,
  },
  {
    id: "azure-cli",
    label: "Azure CLI",
    description: "Azure-Befehle ausfuehren",
    defaultTask: AZURE_CLI_TASK,
  },
  {
    id: "kubectl",
    label: "kubectl",
    description: "Kubernetes-Deployment anwenden",
    defaultTask: KUBECTL_TASK,
  },
  {
    id: "copy-files",
    label: "Dateien kopieren",
    description: "Dateien in Zielordner kopieren",
    defaultTask: COPY_FILES_TASK,
  },
];

// ─── Stage-Templates ──────────────────────────────────────────────────────────

/** Standard-Approval-Konfiguration (automatisch). */
const AUTO_APPROVALS = { isAutomated: true, approvers: [] };

export interface StageTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  stage: Omit<ReleaseStageConfig, "name">;
}

/** Verfuegbare Stage-Templates fuer den Template-Picker. */
export const STAGE_TEMPLATES: StageTemplate[] = [
  {
    id: "empty",
    label: "Leerer Job",
    description: "Ohne vorkonfigurierte Tasks starten",
    icon: "□",
    stage: {
      agentSpec: "ubuntu-latest",
      tasks: [],
      preApprovals: AUTO_APPROVALS,
      postApprovals: AUTO_APPROVALS,
    },
  },
  {
    id: "bash",
    label: "Bash-Skript",
    description: "Einfaches Shell-Skript ausfuehren",
    icon: "$",
    stage: {
      agentSpec: "ubuntu-latest",
      tasks: [BASH_TASK],
      preApprovals: AUTO_APPROVALS,
      postApprovals: AUTO_APPROVALS,
    },
  },
  {
    id: "azure-webapp",
    label: "Azure App Service",
    description: "Deployment auf Azure Web App",
    icon: "☁",
    stage: {
      agentSpec: "windows-latest",
      tasks: [AZURE_WEBAPP_TASK],
      preApprovals: AUTO_APPROVALS,
      postApprovals: AUTO_APPROVALS,
    },
  },
  {
    id: "azure-cli",
    label: "Azure CLI",
    description: "Azure-Befehle per Skript ausfuehren",
    icon: ">",
    stage: {
      agentSpec: "ubuntu-latest",
      tasks: [AZURE_CLI_TASK],
      preApprovals: AUTO_APPROVALS,
      postApprovals: AUTO_APPROVALS,
    },
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    description: "Deployment auf Kubernetes-Cluster",
    icon: "⎈",
    stage: {
      agentSpec: "ubuntu-latest",
      tasks: [KUBECTL_TASK],
      preApprovals: AUTO_APPROVALS,
      postApprovals: AUTO_APPROVALS,
    },
  },
];
