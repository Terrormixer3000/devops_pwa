import { AxiosInstance } from "axios";
import { WorkItem, AzureListResponse } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";

/** Typdefinition fuer das Ergebnis einer WIQL-Abfrage (nur IDs und URLs). */
interface WiqlResult {
  workItems: Array<{ id: number; url: string }>;
}

export const workItemsService = {
  /**
   * Laed Work Items per WIQL – standardmaessig die dem aktuellen Benutzer zugewiesenen.
   */
  async queryMyWorkItems(
    client: AxiosInstance,
    project: string,
    top = 50
  ): Promise<WorkItem[]> {
    if (isDemoClient(client)) {
      return demoApi.workItems.listMyWorkItems();
    }

    // WIQL-Abfrage: alle mir zugewiesenen, nicht abgeschlossenen Work Items
    const wiqlRes = await client.post<WiqlResult>(
      `/${project}/_apis/wit/wiql?$top=${top}&api-version=7.1`,
      {
        query: `SELECT [System.Id],[System.Title],[System.State],[System.WorkItemType],[System.AssignedTo],[System.ChangedDate]
                FROM WorkItems
                WHERE [System.AssignedTo] = @Me
                  AND [System.State] NOT IN ('Closed','Removed')
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
    ].join(",");

    const res = await client.get<AzureListResponse<WorkItem>>(
      `/${project}/_apis/wit/workitems?ids=${ids.join(",")}&fields=${fields}&api-version=7.1`
    );
    return res.data.value;
  },

  /** Gibt ein einzelnes Work Item vollstaendig (inkl. Relations) zurueck. */
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
      `/${project}/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`
    );
    return res.data;
  },
};
