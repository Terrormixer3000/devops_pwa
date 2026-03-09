"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Plus, UserPlus, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { identityService } from "@/lib/services/identityService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import type { IdentityRef } from "@/types";

const EMPTY_FORM = {
  title: "",
  description: "",
  sourceRefName: "",
  targetRefName: "",
  isDraft: false,
};

export interface CreatePullRequestPayload {
  repoId: string;
  title: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
  isDraft?: boolean;
  reviewers?: { id: string }[];
}

interface CreatePullRequestModalProps {
  open: boolean;
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: CreatePullRequestPayload) => void;
}

/** Drawer zum Erstellen eines neuen Pull Requests mit Repo-, Branch- und Reviewer-Auswahl. */
export function CreatePullRequestModal({
  open,
  isPending,
  error,
  onClose,
  onSubmit,
}: CreatePullRequestModalProps) {
  const { settings } = useSettingsStore();
  const { repositories, selectedRepositories } = useRepositoryStore();
  const { client } = useAzureClient();

  const defaultRepo = useMemo(
    () => selectedRepositories[0] ?? repositories[0] ?? null,
    [repositories, selectedRepositories]
  );

  const [selectedRepoId, setSelectedRepoId] = useState(defaultRepo?.id ?? "");
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedReviewers, setSelectedReviewers] = useState<IdentityRef[]>([]);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [showReviewerPicker, setShowReviewerPicker] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);

  const repo = useMemo(
    () => repositories.find((entry) => entry.id === selectedRepoId) ?? defaultRepo,
    [defaultRepo, repositories, selectedRepoId]
  );
  const defaultTargetBranch = repo?.defaultBranch?.replace("refs/heads/", "") || "";

  const resetState = (nextRepoId = defaultRepo?.id ?? "") => {
    setSelectedRepoId(nextRepoId);
    setForm(EMPTY_FORM);
    setSelectedReviewers([]);
    setReviewerSearch("");
    setShowReviewerPicker(false);
    setAutoFilling(false);
    setAutoFillError(null);
  };

  useEffect(() => {
    if (open) return;
    setSelectedRepoId(defaultRepo?.id ?? "");
    setForm(EMPTY_FORM);
    setSelectedReviewers([]);
    setReviewerSearch("");
    setShowReviewerPicker(false);
    setAutoFilling(false);
    setAutoFillError(null);
  }, [defaultRepo?.id, open]);

  useEffect(() => {
    if (!open || selectedRepoId || !defaultRepo?.id) return;
    setSelectedRepoId(defaultRepo.id);
  }, [defaultRepo?.id, open, selectedRepoId]);

  const { data: branches } = useQuery({
    queryKey: ["branches", repo?.id, settings?.project, settings?.demoMode, "create-pr-modal"],
    queryFn: () =>
      client && settings && repo
        ? repositoriesService.getBranches(client, settings.project, repo.id)
        : Promise.resolve([]),
    enabled: open && !!client && !!settings && !!repo,
  });

  const { refetch: fetchLatestCommit, isFetching: commitFetching } = useQuery({
    queryKey: ["new-pr-latest-commit", repo?.id, form.sourceRefName, settings?.project],
    queryFn: () =>
      client && settings && repo && form.sourceRefName
        ? repositoriesService.getCommits(client, settings.project, repo.id, form.sourceRefName, 1)
        : Promise.resolve([]),
    enabled: false,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", settings?.project, settings?.demoMode, "create-pr-modal"],
    queryFn: () =>
      client && settings
        ? identityService.listTeamMembers(client, settings.project)
        : Promise.resolve([]),
    enabled: open && !!client && !!settings,
    staleTime: 5 * 60 * 1000,
  });

  const filteredMembers = (teamMembers || []).filter((member) => {
    if (selectedReviewers.some((reviewer) => reviewer.id === member.id)) return false;
    if (!reviewerSearch) return true;
    const search = reviewerSearch.toLowerCase();
    return (
      member.displayName.toLowerCase().includes(search) ||
      (member.uniqueName?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleClose = () => {
    if (isPending) return;
    resetState(defaultRepo?.id ?? "");
    onClose();
  };

  const handleAutoFill = async () => {
    if (!form.sourceRefName) return;
    setAutoFilling(true);
    setAutoFillError(null);

    try {
      const result = await fetchLatestCommit();
      const commit = result.data?.[0];

      if (commit?.comment) {
        const lines = commit.comment.trim().split("\n");
        const title = lines[0].trim();
        const description = lines.slice(1).filter(Boolean).join("\n").trim();

        setForm((current) => ({
          ...current,
          title: title || current.title,
          description: description || current.description,
        }));
      }
    } catch (err) {
      setAutoFillError(
        (err instanceof Error ? err.message : null) || "Commit konnte nicht geladen werden."
      );
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = () => {
    if (!repo || !form.title || !form.sourceRefName || !(form.targetRefName || defaultTargetBranch)) {
      return;
    }

    onSubmit({
      repoId: repo.id,
      title: form.title,
      description: form.description,
      sourceRefName: `refs/heads/${form.sourceRefName}`,
      targetRefName: `refs/heads/${form.targetRefName || defaultTargetBranch}`,
      isDraft: form.isDraft,
      reviewers:
        selectedReviewers.length > 0
          ? selectedReviewers.map((reviewer) => ({ id: reviewer.id }))
          : undefined,
    });
  };

  const isValid = !!(repo && form.title && form.sourceRefName && (form.targetRefName || defaultTargetBranch));

  return (
    <Modal open={open} onClose={handleClose} title="Neuen Pull Request erstellen">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Repository *</label>
          {repositories.length === 0 ? (
            <p className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2.5 text-sm text-yellow-300">
              Kein Repository verfügbar – Einstellungen prüfen
            </p>
          ) : (
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <GitBranch size={15} className="text-slate-500" />
              </div>
              <select
                value={selectedRepoId}
                onChange={(e) => {
                  setSelectedRepoId(e.target.value);
                  setForm((current) => ({
                    ...current,
                    sourceRefName: "",
                    targetRefName: "",
                  }));
                }}
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 py-3 pl-9 pr-4 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                {repositories.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-300">Titel *</label>
            {form.sourceRefName && (
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={autoFilling || commitFetching}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-900/30 hover:text-blue-300 disabled:opacity-50"
              >
                <Wand2 size={12} />
                {autoFilling || commitFetching ? "Lade..." : "Aus Commit befuellen"}
              </button>
            )}
          </div>
          {autoFillError && <p className="text-xs text-red-400">{autoFillError}</p>}
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="PR-Titel eingeben"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Von Branch *</label>
          <select
            value={form.sourceRefName}
            onChange={(e) => setForm((current) => ({ ...current, sourceRefName: e.target.value }))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Branch auswaehlen...</option>
            {branches?.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">In Branch *</label>
          <select
            value={form.targetRefName || defaultTargetBranch}
            onChange={(e) => setForm((current) => ({ ...current, targetRefName: e.target.value }))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Branch auswaehlen...</option>
            {branches?.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Beschreibung</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="Optional: Was aendert dieser PR?"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Reviewer</label>

          {selectedReviewers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedReviewers.map((reviewer) => (
                <span
                  key={reviewer.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-700/50 text-[10px] font-semibold">
                    {reviewer.displayName.charAt(0).toUpperCase()}
                  </span>
                  {reviewer.displayName}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedReviewers((current) =>
                        current.filter((entry) => entry.id !== reviewer.id)
                      )
                    }
                    className="ml-0.5 transition-colors hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {showReviewerPicker ? (
            <div className="overflow-hidden rounded-xl border border-slate-700">
              <input
                type="text"
                value={reviewerSearch}
                onChange={(e) => setReviewerSearch(e.target.value)}
                placeholder="Name suchen..."
                autoFocus
                className="w-full border-b border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <div className="max-h-40 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500">Keine Ergebnisse</p>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedReviewers((current) => [...current, member]);
                        setReviewerSearch("");
                        setShowReviewerPicker(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-800/70"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-200">{member.displayName}</p>
                        {member.uniqueName && (
                          <p className="truncate text-xs text-slate-500">{member.uniqueName}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowReviewerPicker(false);
                  setReviewerSearch("");
                }}
                className="w-full border-t border-slate-700 px-4 py-2 text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                Schliessen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReviewerPicker(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              <UserPlus size={14} />
              Reviewer hinzufügen
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 py-3">
          <div>
            <p className="text-sm font-medium text-slate-300">Als Draft erstellen</p>
            <p className="text-xs text-slate-500">Draft PRs sind noch nicht bereit fuer Review</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, isDraft: !current.isDraft }))}
            className={`relative h-6 w-12 rounded-full transition-colors ${
              form.isDraft ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                form.isDraft ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button className="flex-1" loading={isPending} disabled={!isValid || isPending} onClick={handleSubmit}>
            <Plus size={16} />
            Erstellen
          </Button>
        </div>
      </div>
    </Modal>
  );
}
