"use client";

import { useTranslations } from "next-intl";
import { AppBar } from "@/components/layout/AppBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { CodeRepoSelector } from "@/components/layout/selectors/CodeRepoSelector";
import { RepoExplorer } from "@/components/explorer/RepoExplorer";
import { FolderGit2 } from "lucide-react";

export default function ExplorerPage() {
  const t = useTranslations("explorer");
  const { settings } = useSettingsStore();
  const { selectedRepositories } = useRepositoryStore();
  const { client } = useAzureClient();
  const repo = selectedRepositories[0];

  return (
    <div className="min-h-screen">
      <AppBar title={t("title")} rightSlot={<CodeRepoSelector />} />
      {!repo ? (
        <EmptyState
          icon={FolderGit2}
          title={t("noRepoSelected")}
          description={t("repoHint")}
        />
      ) : null}
      {repo && settings && client ? (
        <RepoExplorer key={repo.id} repo={repo} settings={settings} />
      ) : null}
    </div>
  );
}
