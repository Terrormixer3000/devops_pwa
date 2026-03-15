"use client";

import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, FileCode2, GitBranch, Save } from "lucide-react";
import { AppBar } from "@/components/layout/AppBar";
import { YamlEditor } from "@/components/pipelines/YamlEditor";
import {
  PipelineYamlCommitModal,
  type PipelineYamlCommitRequest,
} from "@/components/pipelines/PipelineYamlCommitModal";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { usePipelineCreationStore } from "@/lib/stores/pipelineCreationStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { extractErrorMessage } from "@/lib/utils/errorUtils";

interface ExistingYamlState {
  content: string;
  exists: boolean;
}

type RetryActionState =
  | {
      kind: "pipeline";
      message: string;
      error: string | null;
      payload: {
        name: string;
        folder: string;
        yamlPath: string;
        repositoryId: string;
        repositoryName: string;
      };
    }
  | {
      kind: "pr";
      message: string;
      error: string | null;
      payload: {
        repoId: string;
        sourceBranch: string;
        targetBranch: string;
        title: string;
      };
    };

const NEW_BRANCH_OLD_OBJECT_ID = "0000000000000000000000000000000000000000";

function buildStarterYaml(defaultBranch: string): string {
  return [
    "trigger:",
    "  branches:",
    "    include:",
    `      - ${defaultBranch}`,
    "pool:",
    "  vmImage: ubuntu-latest",
    "steps:",
    '  - script: echo "Hello from Azure Pipelines"',
    '    displayName: "Starter step"',
    "",
  ].join("\n");
}

function getParentPath(path: string): string {
  const lastSlashIndex = path.lastIndexOf("/");
  if (lastSlashIndex <= 0) return "/";
  return path.slice(0, lastSlashIndex);
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

/** Dedizierter Editor fuer neue YAML-Pipelines mit Commit- und PR-Flow. */
export default function PipelineYamlEditorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const { clearDraft, draft, patchDraft, setFlashMessage } = usePipelineCreationStore();

  const [editorContent, setEditorContent] = useState("");
  const [editorHydrated, setEditorHydrated] = useState(false);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryActionState | null>(null);
  const [retryPending, setRetryPending] = useState(false);

  const normalizedYamlPath = useMemo(() => {
    const rawPath = draft?.yamlPath || "/azure-pipelines.yml";
    return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  }, [draft?.yamlPath]);
  const draftKey = draft ? `${draft.repositoryId}:${draft.yamlPath}` : null;

  useEffect(() => {
    if (draft) return;
    router.replace("/pipelines");
  }, [draft, router]);

  useEffect(() => {
    if (!draftKey) return;
    setEditorHydrated(false);
    setCommitError(null);
    setRetryAction(null);
  }, [draftKey]);

  const {
    data: branches,
    isLoading: branchesLoading,
    error: branchesError,
    refetch: refetchBranches,
  } = useQuery({
    queryKey: ["pipeline-editor-branches", draft?.repositoryId, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings && draft
        ? repositoriesService.getBranches(client, settings.project, draft.repositoryId)
        : Promise.resolve([]),
    enabled: !!client && !!settings && !!draft,
  });

  const defaultBranchRef = branches?.find((branch) => branch.name === draft?.defaultBranch) || null;
  const existingBranchNames = useMemo(() => {
    const branchNames = Array.from(new Set((branches || []).map((branch) => branch.name)));
    return branchNames.sort((left, right) => {
      if (left === draft?.defaultBranch) return -1;
      if (right === draft?.defaultBranch) return 1;
      return left.localeCompare(right);
    });
  }, [branches, draft?.defaultBranch]);

  const {
    data: existingYaml,
    isLoading: existingYamlLoading,
    error: existingYamlError,
    refetch: refetchExistingYaml,
  } = useQuery({
    queryKey: [
      "pipeline-editor-yaml",
      draft?.repositoryId,
      draft?.defaultBranch,
      normalizedYamlPath,
      settings?.project,
      settings?.demoMode,
    ],
    queryFn: async (): Promise<ExistingYamlState> => {
      if (!client || !settings || !draft) {
        return { content: "", exists: false };
      }

      const parentPath = getParentPath(normalizedYamlPath);
      let items;
      try {
        items = await repositoriesService.getTree(
          client,
          settings.project,
          draft.repositoryId,
          draft.defaultBranch,
          parentPath
        );
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        return {
          exists: false,
          content: buildStarterYaml(draft.defaultBranch),
        };
      }

      const fileExists = items.some(
        (item) => item.gitObjectType === "blob" && item.path === normalizedYamlPath
      );
      if (!fileExists) {
        return {
          exists: false,
          content: buildStarterYaml(draft.defaultBranch),
        };
      }

      const content = await repositoriesService.getFileContent(
        client,
        settings.project,
        draft.repositoryId,
        normalizedYamlPath,
        draft.defaultBranch
      );
      return { content, exists: true };
    },
    enabled: !!client && !!settings && !!draft && !!defaultBranchRef,
  });

  useEffect(() => {
    if (!draft || !existingYaml || editorHydrated) return;
    const nextContent = draft.editorContent || existingYaml.content;
    setEditorContent(nextContent);
    patchDraft({
      editorContent: nextContent,
      fileExistsOnDefaultBranch: existingYaml.exists,
      yamlPath: normalizedYamlPath,
    });
    setEditorHydrated(true);
  }, [draft, editorHydrated, existingYaml, normalizedYamlPath, patchDraft]);

  const navigateBackToPipelines = () => {
    clearDraft();
    router.push("/pipelines");
  };

  const appBarTitle = draft ? (
    <button
      type="button"
      onClick={navigateBackToPipelines}
      disabled={commitPending}
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 transition-opacity active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      Pipelines
    </button>
  ) : (
    "Pipeline YAML"
  );

  const appBarCommitButton = draft ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setCommitError(null);
        setCommitModalOpen(true);
      }}
      loading={commitPending}
      disabled={commitPending || retryPending || !!retryAction}
      className="rounded-full border-blue-500/20 bg-blue-600/10 px-3 text-blue-100 shadow-none hover:bg-blue-600/15"
    >
      <Save size={16} />
      Committen
    </Button>
  ) : null;

  const finalizeToPipelines = async (tone: "success" | "info" | "warning", text: string) => {
    await queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    await queryClient.invalidateQueries({ queryKey: ["pipeline-folders"] });
    setFlashMessage({ tone, text });
    clearDraft();
    router.push("/pipelines");
  };

  const fileExistsOnBranch = async (branchName: string): Promise<boolean> => {
    if (!client || !settings || !draft) return false;
    if (branchName === draft.defaultBranch) {
      return existingYaml?.exists ?? false;
    }

    try {
      const items = await repositoriesService.getTree(
        client,
        settings.project,
        draft.repositoryId,
        branchName,
        getParentPath(normalizedYamlPath)
      );
      return items.some((item) => item.gitObjectType === "blob" && item.path === normalizedYamlPath);
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  };

  const handleRetryAction = async () => {
    if (!client || !settings || !retryAction) return;
    setRetryPending(true);
    setRetryAction((current) => (current ? { ...current, error: null } : current));

    try {
      if (retryAction.kind === "pipeline") {
        await pipelinesService.createPipeline(client, settings.project, retryAction.payload);
        await finalizeToPipelines("success", `Pipeline "${retryAction.payload.name}" wurde erstellt.`);
        return;
      }

      const pr = await pullRequestsService.create(client, settings.project, retryAction.payload.repoId, {
        title: retryAction.payload.title,
        sourceRefName: `refs/heads/${retryAction.payload.sourceBranch}`,
        targetRefName: `refs/heads/${retryAction.payload.targetBranch}`,
      });
      clearDraft();
      router.push(`/pull-requests/${retryAction.payload.repoId}/${pr.pullRequestId}`);
    } catch (error) {
      setRetryAction((current) =>
        current
          ? { ...current, error: extractErrorMessage(error, "Follow-up Aktion fehlgeschlagen.") }
          : current
      );
    } finally {
      setRetryPending(false);
    }
  };

  const handleCommit = async (request: PipelineYamlCommitRequest) => {
    if (!client || !settings || !draft || !defaultBranchRef) {
      setCommitError("Pipeline-Konfiguration ist unvollständig.");
      return;
    }

    setCommitPending(true);
    setCommitError(null);
    setRetryAction(null);

    const createPullRequest = request.createPR && request.branchName !== draft.defaultBranch;

    try {
      if (request.targetKind === "existing") {
        const targetBranchRef = branches?.find((branch) => branch.name === request.branchName);
        if (!targetBranchRef) {
          throw new Error(`Branch "${request.branchName}" wurde nicht gefunden.`);
        }

        const changeType = await fileExistsOnBranch(request.branchName) ? "edit" : "add";
        await repositoriesService.pushFileChange(
          client,
          settings.project,
          draft.repositoryId,
          request.branchName,
          targetBranchRef.objectId,
          normalizedYamlPath,
          editorContent,
          request.commitMessage,
          undefined,
          changeType
        );

        patchDraft(
          request.branchName === draft.defaultBranch
            ? { editorContent, fileExistsOnDefaultBranch: true }
            : { editorContent }
        );

        if (request.branchName === draft.defaultBranch) {
          try {
            await pipelinesService.createPipeline(client, settings.project, {
              name: draft.name,
              folder: draft.folder,
              yamlPath: normalizedYamlPath,
              repositoryId: draft.repositoryId,
              repositoryName: draft.repositoryName,
            });
            await finalizeToPipelines("success", `Pipeline "${draft.name}" wurde erstellt.`);
          } catch {
            setCommitModalOpen(false);
            setRetryAction({
              kind: "pipeline",
              message:
                "Die YAML-Datei wurde bereits auf dem Default-Branch committed. Die Pipeline-Definition konnte jedoch nicht erstellt werden.",
              error: null,
              payload: {
                name: draft.name,
                folder: draft.folder,
                yamlPath: normalizedYamlPath,
                repositoryId: draft.repositoryId,
                repositoryName: draft.repositoryName,
              },
            });
          }
          return;
        }

        if (!createPullRequest) {
          await finalizeToPipelines(
            "info",
            `YAML-Datei wurde auf Branch "${request.branchName}" committed. Eine Pipeline-Definition wurde noch nicht angelegt.`
          );
          return;
        }

        try {
          const pr = await pullRequestsService.create(client, settings.project, draft.repositoryId, {
            title: request.prTitle || request.commitMessage,
            sourceRefName: `refs/heads/${request.branchName}`,
            targetRefName: `refs/heads/${draft.defaultBranch}`,
          });
          clearDraft();
          router.push(`/pull-requests/${draft.repositoryId}/${pr.pullRequestId}`);
        } catch {
          setCommitModalOpen(false);
          setRetryAction({
            kind: "pr",
            message:
              `Die YAML-Datei wurde auf Branch "${request.branchName}" committed. Der Pull Request konnte nicht erstellt werden.`,
            error: null,
            payload: {
              repoId: draft.repositoryId,
              sourceBranch: request.branchName,
              targetBranch: draft.defaultBranch,
              title: request.prTitle || request.commitMessage,
            },
          });
        }
        return;
      }

      const changeType = draft.fileExistsOnDefaultBranch ? "edit" : "add";
      await repositoriesService.pushFileChange(
        client,
        settings.project,
        draft.repositoryId,
        request.branchName,
        NEW_BRANCH_OLD_OBJECT_ID,
        normalizedYamlPath,
        editorContent,
        request.commitMessage,
        defaultBranchRef.objectId,
        changeType
      );

      patchDraft({ editorContent });

      if (!createPullRequest) {
        await finalizeToPipelines(
          "info",
          `YAML-Datei wurde auf Branch "${request.branchName}" committed. Eine Pipeline-Definition wurde noch nicht angelegt.`
        );
        return;
      }

      try {
        const pr = await pullRequestsService.create(client, settings.project, draft.repositoryId, {
          title: request.prTitle || request.commitMessage,
          sourceRefName: `refs/heads/${request.branchName}`,
          targetRefName: `refs/heads/${draft.defaultBranch}`,
        });
        clearDraft();
        router.push(`/pull-requests/${draft.repositoryId}/${pr.pullRequestId}`);
      } catch {
        setCommitModalOpen(false);
        setRetryAction({
          kind: "pr",
          message:
            `Die YAML-Datei wurde auf Branch "${request.branchName}" committed. Der Pull Request konnte nicht erstellt werden.`,
          error: null,
          payload: {
            repoId: draft.repositoryId,
            sourceBranch: request.branchName,
            targetBranch: draft.defaultBranch,
            title: request.prTitle || request.commitMessage,
          },
        });
      }
    } catch (error) {
      setCommitError(extractErrorMessage(error, "Commit fehlgeschlagen."));
    } finally {
      setCommitPending(false);
    }
  };

  if (!draft) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />
        <PageLoader />
      </div>
    );
  }

  if (branchesLoading) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />
        <PageLoader />
      </div>
    );
  }

  if (branchesError || !defaultBranchRef) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />
        <div className="px-4 pt-4">
          <ErrorMessage
            message="Default-Branch konnte nicht geladen werden."
            error={branchesError || "Branch nicht gefunden"}
            onRetry={() => {
              void refetchBranches();
            }}
          />
        </div>
      </div>
    );
  }

  if (existingYamlLoading || !editorHydrated) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />
        <PageLoader />
      </div>
    );
  }

  if (existingYamlError) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />
        <div className="px-4 pt-4">
          <ErrorMessage
            message="YAML-Datei konnte nicht geladen werden."
            error={existingYamlError}
            onRetry={() => {
              void refetchExistingYaml();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppBar title={appBarTitle} rightSlot={appBarCommitButton} />

      <div className="mx-auto max-w-4xl space-y-4 px-4 pb-6 pt-4">
        {retryAction && (
          <div className="rounded-2xl border border-yellow-700/40 bg-yellow-900/20 p-4">
            <p className="text-sm text-yellow-200">{retryAction.message}</p>
            {retryAction.error && <p className="mt-2 text-sm text-red-300">{retryAction.error}</p>}
            <div className="mt-3 flex gap-2">
              <Button onClick={handleRetryAction} loading={retryPending} disabled={retryPending}>
                {retryAction.kind === "pipeline"
                  ? "Pipeline-Definition erneut anlegen"
                  : "Pull Request erneut anlegen"}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/45 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pipeline</p>
          <div className="mt-2 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p>{draft.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Repository</p>
              <p>{draft.repositoryName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ordner</p>
              <p className="font-mono">{draft.folder || "\\"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Default-Branch</p>
              <p className="inline-flex items-center gap-1.5">
                <GitBranch size={14} className="text-blue-400" />
                <span className="font-mono">{draft.defaultBranch}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/85">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">YAML-Datei</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-100">
                <FileCode2 size={15} className="text-blue-400" />
                <span className="font-mono">{normalizedYamlPath}</span>
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${
                existingYaml?.exists
                  ? "border-slate-600 bg-slate-800 text-slate-300"
                  : "border-blue-500/30 bg-blue-600/15 text-blue-300"
              }`}
            >
              {existingYaml?.exists ? "Bestehende Datei" : "Neue Datei"}
            </span>
          </div>
          <YamlEditor
            value={editorContent}
            onChange={(v) => { setEditorContent(v); patchDraft({ editorContent: v }); }}
            readOnly={!!retryAction}
          />
        </div>
      </div>

      {commitModalOpen && (
        <PipelineYamlCommitModal
          open={commitModalOpen}
          defaultBranchName={draft.defaultBranch}
          existingBranches={existingBranchNames}
          pending={commitPending}
          error={commitError}
          onClose={() => {
            if (commitPending) return;
            setCommitModalOpen(false);
            setCommitError(null);
          }}
          onSubmit={(request) => {
            void handleCommit(request);
          }}
        />
      )}
    </div>
  );
}
