import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { workItemsService } from "@/lib/services/workItemsService";

/** Alle State, Queries und Mutations fuer die Work-Item-Detailseite. */
export function useWorkItemDetail(workItemId: number) {
  const [activeTab, setActiveTab] = useState<"overview" | "comments">("overview");
  const [commentText, setCommentText] = useState("");
  const [stateSheetOpen, setStateSheetOpen] = useState(false);
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();

  // Work-Item-Query
  const { data: workItem, isLoading, error } = useQuery({
    queryKey: ["workItem", workItemId, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? workItemsService.getWorkItem(client, settings.project, workItemId)
        : Promise.reject(new Error("Kein Client")),
    enabled: !!client && !!settings,
  });

  // Kommentar-Query
  const { data: comments } = useQuery({
    queryKey: ["workItemComments", workItemId, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? workItemsService.getWorkItemComments(client, settings.project, workItemId)
        : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Status-Update-Mutation
  const updateStateMutation = useMutation({
    mutationFn: (newState: string) => {
      if (!client || !settings) throw new Error("Kein Client");
      return workItemsService.updateWorkItem(client, settings.project, workItemId, [
        { op: "replace", path: "/fields/System.State", value: newState },
      ]);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workItem", workItemId] });
      void qc.invalidateQueries({ queryKey: ["work-items"] });
      setStateSheetOpen(false);
    },
  });

  // Kommentar-Hinzufuegen-Mutation
  const addCommentMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) throw new Error("Kein Client");
      return workItemsService.addWorkItemComment(client, settings.project, workItemId, commentText);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workItemComments", workItemId] });
      setCommentText("");
    },
  });

  return {
    // State
    activeTab, setActiveTab,
    commentText, setCommentText,
    stateSheetOpen, setStateSheetOpen,
    assigneeSheetOpen, setAssigneeSheetOpen,
    // Queries
    workItem, isLoading, error,
    comments,
    // Mutations
    updateStateMutation,
    addCommentMutation,
  };
}
