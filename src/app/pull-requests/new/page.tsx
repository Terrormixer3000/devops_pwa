"use client";

/**
 * Neuer-PR-Seite: Formular zum Erstellen eines neuen Pull Requests
 * mit Repository-, Quell- und Ziel-Branch-Auswahl sowie Titel und Beschreibung.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { identityService } from "@/lib/services/identityService";
import { BackLink } from "@/components/ui/BackButton";
import { IdentityRef } from "@/types";
import { X, UserPlus, Wand2, GitBranch } from "lucide-react";

/** Formular zum Erstellen eines neuen Pull Requests. */
export default function NewPRPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { repositories, selectedRepositories } = useRepositoryStore();
  const { client } = useAzureClient();

  // Repository-Auswahl (Standard: erstes ausgewaehltes Repository)
  const [selectedRepoId, setSelectedRepoId] = useState(
    () => selectedRepositories[0]?.id || repositories[0]?.id || ""
  );
  const repo = repositories.find((r) => r.id === selectedRepoId) || selectedRepositories[0] || null;

  const [form, setForm] = useState({
    title: "",
    description: "",
    sourceRefName: "",
    targetRefName: "",
    isDraft: false,
  });
  const [selectedReviewers, setSelectedReviewers] = useState<IdentityRef[]>([]);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [showReviewerPicker, setShowReviewerPicker] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);

  // Branches laden (abhaengig vom ausgewaehlten Repo)
  const { data: branches } = useQuery({
    queryKey: ["branches", repo?.id, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && repo
      ? repositoriesService.getBranches(client, settings.project, repo.id)
      : Promise.resolve([]),
    enabled: !!client && !!settings && !!repo,
  });
  const defaultTargetBranch = repo?.defaultBranch?.replace("refs/heads/", "") || "";

  // Letzten Commit des Quell-Branch laden (fuer Auto-Fill)
  const { refetch: fetchLatestCommit, isFetching: commitFetching } = useQuery({
    queryKey: ["new-pr-latest-commit", repo?.id, form.sourceRefName, settings?.project],
    queryFn: () =>
      client && settings && repo && form.sourceRefName
        ? repositoriesService.getCommits(client, settings.project, repo.id, form.sourceRefName, 1)
        : Promise.resolve([]),
    enabled: false, // nur auf expliziten Aufruf hin laden
  });

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
        setForm((f) => ({
          ...f,
          title: title || f.title,
          description: description || f.description,
        }));
      }
    } catch (err) {
      setAutoFillError((err instanceof Error ? err.message : null) || "Commit konnte nicht geladen werden.");
    } finally {
      setAutoFilling(false);
    }
  };

  // Team-Mitglieder laden (fuer Reviewer-Auswahl)
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? identityService.listTeamMembers(client, settings.project)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
    staleTime: 5 * 60 * 1000,
  });

  const filteredMembers = (teamMembers || []).filter((m) => {
    if (selectedReviewers.some((r) => r.id === m.id)) return false;
    if (!reviewerSearch) return true;
    const search = reviewerSearch.toLowerCase();
    return m.displayName.toLowerCase().includes(search) || (m.uniqueName?.toLowerCase().includes(search) ?? false);
  });

  const addReviewer = (member: IdentityRef) => {
    setSelectedReviewers((prev) => [...prev, member]);
    setReviewerSearch("");
    setShowReviewerPicker(false);
  };

  const removeReviewer = (id: string) => {
    setSelectedReviewers((prev) => prev.filter((r) => r.id !== id));
  };

  // PR erstellen
  const createMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !repo) throw new Error("Kein Client");
      return pullRequestsService.create(client, settings.project, repo.id, {
        title: form.title,
        description: form.description,
        sourceRefName: `refs/heads/${form.sourceRefName}`,
        targetRefName: `refs/heads/${form.targetRefName || defaultTargetBranch}`,
        isDraft: form.isDraft,
        reviewers: selectedReviewers.length > 0 ? selectedReviewers.map((r) => ({ id: r.id })) : undefined,
      });
    },
    onSuccess: (pr) => {
      router.push(`/pull-requests/${repo.id}/${pr.pullRequestId}`);
    },
  });

  const isValid = form.title && form.sourceRefName && (form.targetRefName || defaultTargetBranch);

  return (
    <div className="min-h-screen">
      <AppBar title="Neuer Pull Request" />

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
        {/* Zurueck-Link */}
        <BackLink href="/pull-requests" size="default" />

        {/* Repository-Auswahl */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Repository *</label>
          {repositories.length === 0 ? (
            <p className="text-sm text-yellow-400">Kein Repository verfuegbar – Einstellungen pruefen</p>
          ) : (
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <GitBranch size={15} className="text-slate-500" />
              </div>
              <select
                value={selectedRepoId}
                onChange={(e) => {
                  setSelectedRepoId(e.target.value);
                  // Branch-Auswahl zuruecksetzen wenn Repo wechselt
                  setForm((f) => ({ ...f, sourceRefName: "", targetRefName: "" }));
                }}
                className="w-full pl-9 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 text-sm appearance-none"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Titel */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Titel *</label>
            {form.sourceRefName && (
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={autoFilling || commitFetching}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 transition-colors disabled:opacity-50"
              >
                <Wand2 size={12} />
                {autoFilling || commitFetching ? "Lade..." : "Aus Commit befuellen"}
              </button>
            )}
          </div>
          {autoFillError && (
            <p className="text-xs text-red-400">{autoFillError}</p>
          )}
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="PR-Titel eingeben"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {/* Quell-Branch */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Von Branch *</label>
          <select
            value={form.sourceRefName}
            onChange={(e) => setForm((f) => ({ ...f, sourceRefName: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="">Branch auswaehlen...</option>
            {branches?.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Ziel-Branch */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">In Branch *</label>
          <select
            value={form.targetRefName || defaultTargetBranch}
            onChange={(e) => setForm((f) => ({ ...f, targetRefName: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="">Branch auswaehlen...</option>
            {branches?.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Beschreibung */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Beschreibung</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional: Was aendert dieser PR?"
            rows={4}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
          />
        </div>

        {/* Reviewer-Auswahl */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Reviewer</label>

          {/* Ausgewaehlte Reviewer */}
          {selectedReviewers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedReviewers.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-xs font-medium text-blue-300"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-700/50 flex items-center justify-center text-[10px] font-semibold">
                    {r.displayName.charAt(0).toUpperCase()}
                  </span>
                  {r.displayName}
                  <button onClick={() => removeReviewer(r.id)} className="ml-0.5 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Reviewer hinzufuegen */}
          {showReviewerPicker ? (
            <div className="border border-slate-700 rounded-xl overflow-hidden">
              <input
                type="text"
                value={reviewerSearch}
                onChange={(e) => setReviewerSearch(e.target.value)}
                placeholder="Name suchen..."
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none border-b border-slate-700"
              />
              <div className="max-h-40 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500">Keine Ergebnisse</p>
                ) : (
                  filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addReviewer(m)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-slate-800/70 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                        {m.displayName.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{m.displayName}</p>
                        {m.uniqueName && <p className="text-xs text-slate-500 truncate">{m.uniqueName}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => { setShowReviewerPicker(false); setReviewerSearch(""); }}
                className="w-full px-4 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-slate-700 transition-colors"
              >
                Schliessen
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReviewerPicker(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            >
              <UserPlus size={14} />
              Reviewer hinzufuegen
            </button>
          )}
        </div>

        {/* Draft-Schalter */}
        <div className="flex items-center justify-between py-3 border-t border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-300">Als Draft erstellen</p>
            <p className="text-xs text-slate-500">Draft PRs sind noch nicht bereit fuer Review</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, isDraft: !f.isDraft }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.isDraft ? "bg-blue-600" : "bg-slate-700"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isDraft ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Fehlermeldung */}
        {createMutation.isError && (
          <p className="text-sm text-red-400">{(createMutation.error as Error).message}</p>
        )}

        {/* Erstellen-Knopf */}
        <Button
          fullWidth
          disabled={!isValid || !repo}
          loading={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Pull Request erstellen
        </Button>
      </div>
    </div>
  );
}
