"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, FileCode2, GitBranch, Save } from "lucide-react";
import Link from "next/link";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-yaml";
import { AppBar } from "@/components/layout/AppBar";
import { PipelineYamlCommitModal, type PipelineYamlCommitRequest } from "@/components/pipelines/PipelineYamlCommitModal";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { stripRefPrefix } from "@/lib/utils/gitUtils";
import { extractErrorMessage } from "@/lib/utils/errorUtils";
import { useTranslations } from "next-intl";

const NEW_BRANCH_OLD_OBJECT_ID = "0000000000000000000000000000000000000000";

/** YAML-Code mit Prism hervorheben. */
function highlightYaml(code: string): string {
  return Prism.highlight(code, Prism.languages.yaml, "yaml");
}

/** Editor-Seite zum Bearbeiten der YAML-Datei einer bestehenden Pipeline. */
export default function PipelineYamlEditPage({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = use(params);
  const buildIdNum = parseInt(buildId);
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();

  const [editorContent, setEditorContent] = useState("");
  const [editorHydrated, setEditorHydrated] = useState(false);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const t = useTranslations("pipelines");
  const tYaml = useTranslations("pipelines.yamlEditor");
  const tBd = useTranslations("pipelines.buildDetail");

  // Stufe 1: Build und Definition laden
  const { data: build, isLoading: buildLoading, error: buildError } = useQuery({
    queryKey: ["build", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.getBuild(client, settings.project, buildIdNum) : Promise.reject(new Error(tBd("loadError"))),
    enabled: !!client && !!settings,
  });

  const repoId = build?.repository.id ?? "";
  const defaultBranch = build ? stripRefPrefix(build.sourceBranch) : "";

  const { data: definition, isLoading: defLoading, error: defError } = useQuery({
    queryKey: ["build-definition", build?.definition.id, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && build ? pipelinesService.getBuildDefinition(client, settings.project, build.definition.id) : Promise.reject(new Error(tBd("loadError"))),
    enabled: !!client && !!settings && !!build,
  });

  const yamlFilename = definition?.process?.yamlFilename ?? null;

  // Stufe 2: Branches und Dateiinhalt (nur wenn yamlFilename bekannt)
  const { data: branches, isLoading: branchesLoading, error: branchesError } = useQuery({
    queryKey: ["repo-branches", repoId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && repoId ? repositoriesService.getBranches(client, settings.project, repoId) : Promise.resolve([]),
    enabled: !!client && !!settings && !!repoId && !!yamlFilename,
  });

  const { data: fileContent, isLoading: fileLoading, error: fileError } = useQuery({
    queryKey: ["yaml-file-content", repoId, yamlFilename, defaultBranch, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && repoId && yamlFilename
      ? repositoriesService.getFileContent(client, settings.project, repoId, yamlFilename, defaultBranch)
      : Promise.reject(new Error(tYaml("yamlLoadError"))),
    enabled: !!client && !!settings && !!repoId && !!yamlFilename && !!defaultBranch,
  });

  // Editor mit geladenem Inhalt befuellen (einmalig)
  useEffect(() => {
    if (editorHydrated || fileContent === undefined) return;
    setEditorContent(fileContent ?? "");
    setEditorHydrated(true);
  }, [editorHydrated, fileContent]);

  // Branches sortiert mit Default-Branch zuerst
  const sortedBranchNames = useMemo(() => {
    const names = (branches ?? []).map((b) => b.name);
    return names.sort((a, b) => {
      if (a === defaultBranch) return -1;
      if (b === defaultBranch) return 1;
      return a.localeCompare(b);
    });
  }, [branches, defaultBranch]);

  const handleCommit = async (request: PipelineYamlCommitRequest) => {
    if (!client || !settings || !repoId || !yamlFilename || !defaultBranch) {
      setCommitError("Konfiguration unvollständig.");
      return;
    }
    setCommitPending(true);
    setCommitError(null);
    try {
      if (request.targetKind === "existing") {
        const targetBranchRef = branches?.find((b) => b.name === request.branchName);
        if (!targetBranchRef) throw new Error(`Branch "${request.branchName}" nicht gefunden.`);
        await repositoriesService.pushFileChange(
          client, settings.project, repoId,
          request.branchName, targetBranchRef.objectId,
          yamlFilename, editorContent, request.commitMessage,
          undefined, "edit"
        );
      } else {
        const defaultBranchRef = branches?.find((b) => b.name === defaultBranch);
        await repositoriesService.pushFileChange(
          client, settings.project, repoId,
          request.branchName, NEW_BRANCH_OLD_OBJECT_ID,
          yamlFilename, editorContent, request.commitMessage,
          defaultBranchRef?.objectId, "edit"
        );
      }
      if (request.createPR && request.branchName !== defaultBranch) {
        const pr = await pullRequestsService.create(client, settings.project, repoId, {
          title: request.prTitle || request.commitMessage,
          sourceRefName: `refs/heads/${request.branchName}`,
          targetRefName: `refs/heads/${defaultBranch}`,
        });
        router.push(`/pull-requests/${repoId}/${pr.pullRequestId}`);
        return;
      }
      router.back();
    } catch (error) {
      setCommitError(extractErrorMessage(error, "Commit fehlgeschlagen."));
    } finally {
      setCommitPending(false);
    }
  };

  // AppBar-Titel mit Zurueck-Navigation
  const backLabel = build?.definition.name ?? t("title");
  const appBarTitle = (
    <Link
      href={`/pipelines/${buildId}`}
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      {backLabel}
    </Link>
  );

  const appBarCommitButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => { setCommitError(null); setCommitModalOpen(true); }}
      loading={commitPending}
      disabled={commitPending || !editorHydrated}
      className="rounded-full border-blue-500/20 bg-blue-600/10 px-3 text-blue-100 shadow-none hover:bg-blue-600/15"
    >
      <Save size={16} />
      Committen
    </Button>
  );

  // Stufe 1 laden
  if (buildLoading || defLoading) {
    return <div className="min-h-screen"><AppBar title={appBarTitle} hideProjectChip /><PageLoader /></div>;
  }

  // Stufe 1 Fehler
  if (buildError || defError) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} hideProjectChip />
        <div className="px-4 pt-4"><ErrorMessage message={tBd("loadError")} error={buildError ?? defError} /></div>
      </div>
    );
  }

  // Keine YAML-Datei (Classic-Pipeline)
  if (definition && !yamlFilename) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} hideProjectChip />
        <div className="px-4 pt-4"><ErrorMessage message={tYaml("notYamlPipeline")} /></div>
      </div>
    );
  }

  // Stufe 2 laden
  if (branchesLoading || fileLoading || !editorHydrated) {
    return <div className="min-h-screen"><AppBar title={appBarTitle} hideProjectChip /><PageLoader /></div>;
  }

  // Stufe 2 Fehler
  if (branchesError || fileError) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} hideProjectChip />
        <div className="px-4 pt-4"><ErrorMessage message={tYaml("yamlLoadError")} error={branchesError ?? fileError} /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppBar title={appBarTitle} rightSlot={appBarCommitButton} hideProjectChip />

      {/* Datei-Info-Leiste */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-3">
        <FileCode2 size={14} className="text-blue-400 flex-shrink-0" />
        <p className="text-xs font-mono text-slate-400 flex-1 truncate">{yamlFilename}</p>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <GitBranch size={11} />
          <span className="font-mono">{defaultBranch}</span>
        </span>
      </div>

      {/* YAML-Editor mit Syntax Highlighting */}
      <div className="flex-1 prism-yaml overflow-auto" style={{ minHeight: "65vh" }}>
        <Editor
          value={editorContent}
          onValueChange={setEditorContent}
          highlight={highlightYaml}
          padding={16}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace",
            fontSize: 12,
            lineHeight: 1.6,
            backgroundColor: "transparent",
            color: "#e2e8f0",
            minHeight: "100%",
          }}
          textareaClassName="focus:outline-none"
        />
      </div>

      {commitModalOpen && (
        <PipelineYamlCommitModal
          open={commitModalOpen}
          defaultBranchName={defaultBranch}
          existingBranches={sortedBranchNames}
          pending={commitPending}
          error={commitError}
          onClose={() => { if (!commitPending) { setCommitModalOpen(false); setCommitError(null); } }}
          onSubmit={(request) => { void handleCommit(request); }}
        />
      )}
    </div>
  );
}
