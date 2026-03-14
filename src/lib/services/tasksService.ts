import { AxiosInstance } from "axios";
import { AzureTaskDefinition } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { AVAILABLE_TASKS } from "@/lib/constants/releaseTasks";

interface RawTasksResponse {
  value: AzureTaskDefinition[];
  count: number;
}

/**
 * Gibt fuer jede Task-ID (GUID) nur die Version mit der hoechsten Major-Nummer zurueck.
 * Die API liefert jede Aufgabe mehrfach (eine Zeile pro Version).
 */
function deduplicateByLatestVersion(tasks: AzureTaskDefinition[]): AzureTaskDefinition[] {
  const map = new Map<string, AzureTaskDefinition>();
  for (const task of tasks) {
    const existing = map.get(task.id);
    if (!existing || task.version.major > existing.version.major) {
      map.set(task.id, task);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.friendlyName || a.name).localeCompare(b.friendlyName || b.name)
  );
}

export const tasksService = {
  /**
   * Ladet alle verfuegbaren Task-Definitionen aus dem Azure DevOps Distributed Task Catalog.
   * Das Ergebnis enthaelt nur die jeweils neueste Major-Version jeder Aufgabe.
   * Im Demo-Modus werden die lokal definierten Beispiel-Tasks zurueckgegeben.
   */
  async listTasks(client: AxiosInstance): Promise<AzureTaskDefinition[]> {
    if (isDemoClient(client)) {
      // Demo-Modus: Umwandlung der lokalen Task-Definitionen in das API-Format
      return AVAILABLE_TASKS.map((def) => ({
        id: def.defaultTask.taskId,
        name: def.defaultTask.taskId,
        friendlyName: def.label,
        description: def.description,
        category: "Utility",
        version: { major: parseInt(def.defaultTask.version, 10) || 1, minor: 0, patch: 0 },
        inputs: Object.entries(def.defaultTask.inputs).map(([key, defaultValue]) => ({
          name: key,
          label: key,
          type: key === "script" || key === "inlineScript" || key === "inline" ? "multiLine" : "string",
          defaultValue,
          required: false,
        })),
      }));
    }

    const res = await client.get<RawTasksResponse>(
      `/_apis/distributedtask/tasks?api-version=7.1`
    );
    const allTasks = res.data.value ?? [];

    // Veraltete und Preview-Tasks herausfiltern, dann deduplizieren
    const activeTasks = allTasks.filter((t) => !t.deprecated);
    return deduplicateByLatestVersion(activeTasks);
  },
};
