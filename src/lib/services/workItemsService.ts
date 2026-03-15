import { AxiosInstance } from "axios";
import { WorkItem, WorkItemComment, WorkItemIteration, JsonPatchOperation, AzureListResponse } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";

/** Typdefinition fuer das Ergebnis einer WIQL-Abfrage (nur IDs und URLs). */
interface WiqlResult {
  workItems: Array<{ id: number; url: string }>;
}

export const workItemsService = {
  /**
   * Laed Work Items per WIQL – standardmaessig die dem aktuellen Benutzer zugewiesenen.
   * Optionaler Parameter iterationPath filtert auf einen bestimmten Sprint.
   */
  async queryMyWorkItems(
    client: AxiosInstance,
    project: string,
    top = 50,
    iterationPath?: string
  ): Promise<WorkItem[]> {
    if (isDemoClient(client)) {
      return demoApi.workItems.listMyWorkItems();
    }

    // Optionale Sprint-Filter-Bedingung
    const iterationClause = iterationPath
      ? ` AND [System.IterationPath] = '${iterationPath}'`
      : "";

    // WIQL-Abfrage: alle mir zugewiesenen, nicht abgeschlossenen Work Items
    const wiqlRes = await client.post<WiqlResult>(
      `/${project}/_apis/wit/wiql?$top=${top}&api-version=7.1`,
      {
        query: `SELECT [System.Id],[System.Title],[System.State],[System.WorkItemType],[System.AssignedTo],[System.ChangedDate]
                FROM WorkItems
                WHERE [System.AssignedTo] = @Me
                  AND [System.State] NOT IN ('Closed','Removed')${iterationClause}
                ORDER BY [System.ChangedDate] DESC`,
      }
    );

    const ids = wiqlRes.data.workItems.map((w) => w.id).slice(0, top);
    if (ids.length === 0) return [];

    return workItemsService.getWorkItemsBatch(client, project, ids);
  },

  /**
   * Laedt mehrere Work Items anhand ihrer IDs in einem Batch-Request.
   * Effizienter als einzelne Get-Aufrufe bei mehr als einem Work Item.
   */
  async getWorkItemsBatch(
    client: AxiosInstance,
    project: string,
    ids: number[]
  ): Promise<WorkItem[]> {
    if (isDemoClient(client)) {
      return demoApi.workItems.listMyWorkItems();
    }

    const fields = [
      "System.Id",
      "System.Title",
      "System.State",
      "System.WorkItemType",
      "System.AssignedTo",
      "System.CreatedDate",
      "System.ChangedDate",
      "System.AreaPath",
      "System.IterationPath",
      "Microsoft.VSTS.Common.Priority",
      "System.Description",
    ].join(",");

    const res = await client.get<AzureListResponse<WorkItem>>(
      `/${project}/_apis/wit/workitems?ids=${ids.join(",")}&fields=${fields}&api-version=7.1`
    );
    return res.data.value;
  },

  /** Gibt ein einzelnes Work Item vollstaendig zurueck (inkl. allen Feldern). */
  async getWorkItem(
    client: AxiosInstance,
    project: string,
    id: number
  ): Promise<WorkItem> {
    if (isDemoClient(client)) {
      const all = demoApi.workItems.listMyWorkItems();
      const item = all.find((w) => w.id === id);
      if (!item) throw new Error("Work Item nicht gefunden");
      return item;
    }

    const res = await client.get<WorkItem>(
      `/${project}/_apis/wit/workitems/${id}?api-version=7.1&$expand=all`
    );
    return res.data;
  },

  /**
   * Aktualisiert Felder eines Work Items per JSON-Patch.
   * Content-Type muss application/json-patch+json sein.
   */
  async updateWorkItem(
    client: AxiosInstance,
    project: string,
    id: number,
    patch: JsonPatchOperation[]
  ): Promise<WorkItem> {
    if (isDemoClient(client)) {
      const all = demoApi.workItems.listMyWorkItems();
      const item = all.find((w) => w.id === id);
      if (!item) throw new Error("Work Item nicht gefunden");
      // Demo: Felder aus Patch-Operationen uebernehmen
      const updated = { ...item, fields: { ...item.fields } };
      for (const op of patch) {
        if ((op.op === "add" || op.op === "replace") && op.path.startsWith("/fields/")) {
          const fieldName = op.path.slice("/fields/".length);
          (updated.fields as Record<string, unknown>)[fieldName] = op.value;
        }
      }
      return updated;
    }

    const res = await client.patch<WorkItem>(
      `/${project}/_apis/wit/workitems/${id}?api-version=7.1`,
      patch,
      { headers: { "Content-Type": "application/json-patch+json" } }
    );
    return res.data;
  },

  /** Laedt alle Kommentare zu einem Work Item. */
  async getWorkItemComments(
    client: AxiosInstance,
    project: string,
    id: number
  ): Promise<WorkItemComment[]> {
    if (isDemoClient(client)) {
      return [];
    }

    const res = await client.get<{ comments: WorkItemComment[] }>(
      `/${project}/_apis/wit/workitems/${id}/comments?api-version=7.1`
    );
    return res.data.comments;
  },

  /** Fuegt einen neuen Kommentar zu einem Work Item hinzu. */
  async addWorkItemComment(
    client: AxiosInstance,
    project: string,
    id: number,
    text: string
  ): Promise<WorkItemComment> {
    if (isDemoClient(client)) {
      return {
        id: Date.now(),
        text,
        createdBy: { displayName: "Demo User", uniqueName: "demo@demo.local" },
        createdDate: new Date().toISOString(),
      };
    }

    const res = await client.post<WorkItemComment>(
      `/${project}/_apis/wit/workitems/${id}/comments?api-version=7.1`,
      { text }
    );
    return res.data;
  },

  /**
   * Erstellt ein neues Work Item vom angegebenen Typ.
   * Content-Type muss application/json-patch+json sein.
   */
  async createWorkItem(
    client: AxiosInstance,
    project: string,
    type: string,
    title: string,
    description?: string
  ): Promise<WorkItem> {
    if (isDemoClient(client)) {
      const newId = Date.now();
      return {
        id: newId,
        rev: 1,
        fields: {
          "System.Title": title,
          "System.State": "New",
          "System.WorkItemType": type,
          "System.CreatedDate": new Date().toISOString(),
          "System.ChangedDate": new Date().toISOString(),
          "System.Description": description,
        },
        url: `https://demo.local/workitems/${newId}`,
      };
    }

    const patch: JsonPatchOperation[] = [
      { op: "add", path: "/fields/System.Title", value: title },
    ];
    if (description) {
      patch.push({ op: "add", path: "/fields/System.Description", value: description });
    }

    const res = await client.post<WorkItem>(
      `/${project}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=7.1`,
      patch,
      { headers: { "Content-Type": "application/json-patch+json" } }
    );
    return res.data;
  },

  /** Laedt alle Sprints/Iterationen des Teams. */
  async listIterations(
    client: AxiosInstance,
    project: string
  ): Promise<WorkItemIteration[]> {
    if (isDemoClient(client)) {
      const now = new Date();
      const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
      const future = (days: number) => new Date(now.getTime() + days * 86400000).toISOString().split("T")[0];
      return [
        {
          id: "sprint-1",
          name: "Sprint 1",
          path: `${project}\\Sprint 1`,
          attributes: { startDate: ago(28), finishDate: ago(14), timeFrame: "past" },
        },
        {
          id: "sprint-2",
          name: "Sprint 2",
          path: `${project}\\Sprint 2`,
          attributes: { startDate: ago(14), finishDate: future(0), timeFrame: "current" },
        },
        {
          id: "sprint-3",
          name: "Sprint 3",
          path: `${project}\\Sprint 3`,
          attributes: { startDate: future(1), finishDate: future(14), timeFrame: "future" },
        },
      ];
    }

    const res = await client.get<AzureListResponse<WorkItemIteration>>(
      `/${project}/_apis/work/teamsettings/iterations?api-version=7.1`
    );
    return res.data.value;
  },
};
