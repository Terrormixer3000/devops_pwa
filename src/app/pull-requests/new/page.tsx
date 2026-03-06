"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewPRPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { selectedRepositories } = useRepositoryStore();
  const { client } = useAzureClient();

  // Erstes ausgewaehltes Repository als Standard
  const repo = selectedRepositories[0];

  const [form, setForm] = useState({
    title: "",
    description: "",
    sourceRefName: "",
    targetRefName: "",
    isDraft: false,
  });

  // Branches laden
  const { data: branches } = useQuery({
    queryKey: ["branches", repo?.id],
    queryFn: () => client && settings && repo
      ? repositoriesService.getBranches(client, settings.project, repo.id)
      : Promise.resolve([]),
    enabled: !!client && !!settings && !!repo,
  });

  // Standard-Zielbranch setzen
  useEffect(() => {
    if (repo?.defaultBranch && !form.targetRefName) {
      const branch = repo.defaultBranch.replace("refs/heads/", "");
      setForm((f) => ({ ...f, targetRefName: branch }));
    }
  }, [repo, form.targetRefName]);

  // PR erstellen
  const createMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !repo) throw new Error("Kein Client");
      return pullRequestsService.create(client, settings.project, repo.id, {
        title: form.title,
        description: form.description,
        sourceRefName: `refs/heads/${form.sourceRefName}`,
        targetRefName: `refs/heads/${form.targetRefName}`,
        isDraft: form.isDraft,
      });
    },
    onSuccess: (pr) => {
      router.push(`/pull-requests/${repo.id}/${pr.pullRequestId}`);
    },
  });

  const isValid = form.title && form.sourceRefName && form.targetRefName;

  return (
    <div className="min-h-screen">
      <AppBar title="Neuer Pull Request" />

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
        {/* Zurueck-Link */}
        <Link href="/pull-requests" className="flex items-center gap-1 text-sm text-blue-400">
          <ChevronLeft size={16} /> Zurueck
        </Link>

        {/* Repository-Hinweis */}
        {!repo ? (
          <p className="text-sm text-yellow-400">Bitte zuerst ein Repository auswaehlen</p>
        ) : (
          <p className="text-xs text-slate-500">Repository: <span className="text-slate-300">{repo.name}</span></p>
        )}

        {/* Titel */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Titel *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="PR-Titel eingeben"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {/* Quell-Branch */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Von Branch *</label>
          <select
            value={form.sourceRefName}
            onChange={(e) => setForm((f) => ({ ...f, sourceRefName: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm"
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
            value={form.targetRefName}
            onChange={(e) => setForm((f) => ({ ...f, targetRefName: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm"
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
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
          />
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
