"use client";

/**
 * Stage-Konfigurationsseite fuer Release-Pipelines.
 * Drei Tabs: Tasks (alle Azure DevOps Tasks durchsuchbar, konfigurierbar, sortierbar),
 * Approvals (Pre/Post-Deployment), Agent (Pool-Auswahl + Stage-Name).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AppBar } from "@/components/layout/AppBar";
import { BackActionButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { TabBar } from "@/components/ui/TabBar";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { tasksService } from "@/lib/services/tasksService";
import { useReleaseCreationStore } from "@/lib/stores/releaseCreationStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import type { AzureTaskDefinition, ReleaseStageConfig, StageApprovalConfig, WorkflowTask } from "@/types";

type Tab = "tasks" | "approvals" | "agent";

/** Vordefinierte Agent-Spezifikationen. */
const AGENT_SPECS = [
  { id: "ubuntu-latest", label: "Ubuntu (Neueste)" },
  { id: "windows-latest", label: "Windows (Neueste)" },
  { id: "macOS-latest", label: "macOS (Neueste)" },
  { id: "self-hosted", label: "Self-hosted" },
];

/** Erstellt einen leeren WorkflowTask aus einer AzureTaskDefinition. */
function buildWorkflowTask(def: AzureTaskDefinition): WorkflowTask {
  const inputs: Record<string, string> = {};
  for (const input of def.inputs ?? []) {
    inputs[input.name] = input.defaultValue ?? "";
  }
  return {
    taskId: def.id,
    version: `${def.version.major}.*`,
    name: def.friendlyName || def.name,
    enabled: true,
    inputs,
  };
}

/** Stage-Editor mit Tabs fuer Tasks, Approvals und Agent. */
export default function StageEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const { draft, updateStage } = useReleaseCreationStore();

  const stageIndex = parseInt(searchParams.get("index") ?? "0", 10);
  const originalStage = draft?.stages[stageIndex] ?? null;

  const [stage, setStage] = useState<ReleaseStageConfig | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);
  const [selfHostedPool, setSelfHostedPool] = useState("");

  // Stage aus Store laden
  useEffect(() => {
    if (!originalStage) {
      router.replace("/releases/new");
      return;
    }
    setStage(structuredClone(originalStage));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alle Task-Definitionen laden (gecacht fuer 30 min)
  const { data: allTaskDefs = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["azure-task-catalog", settings?.demoMode],
    queryFn: () => (client ? tasksService.listTasks(client) : Promise.resolve([])),
    enabled: !!client,
    staleTime: 30 * 60 * 1000,
  });

  if (!stage) return null;

  // ─── Hilfsfunktionen ──────────────────────────────────────────────────────

  const patchStage = (patch: Partial<ReleaseStageConfig>) =>
    setStage((current) => (current ? { ...current, ...patch } : current));

  const saveAndGoBack = () => {
    if (stage) updateStage(stageIndex, stage);
    router.push("/releases/new");
  };

  // ─── Tasks ────────────────────────────────────────────────────────────────

  const handleAddTask = (def: AzureTaskDefinition) => {
    const newTask = buildWorkflowTask(def);
    patchStage({ tasks: [...stage.tasks, newTask] });
    setTaskPickerOpen(false);
    setExpandedTaskIndex(stage.tasks.length);
  };

  const handleRemoveTask = (index: number) => {
    patchStage({ tasks: stage.tasks.filter((_, i) => i !== index) });
    if (expandedTaskIndex === index) setExpandedTaskIndex(null);
  };

  const handleMoveTask = (index: number, direction: "up" | "down") => {
    const tasks = [...stage.tasks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= tasks.length) return;
    [tasks[index], tasks[swapIndex]] = [tasks[swapIndex], tasks[index]];
    patchStage({ tasks });
  };

  const handleTaskInput = (taskIndex: number, key: string, value: string) => {
    const tasks = stage.tasks.map((t, i) =>
      i === taskIndex ? { ...t, inputs: { ...t.inputs, [key]: value } } : t
    );
    patchStage({ tasks });
  };

  const handleTaskNameChange = (taskIndex: number, name: string) => {
    const tasks = stage.tasks.map((t, i) => (i === taskIndex ? { ...t, name } : t));
    patchStage({ tasks });
  };

  const handleToggleTask = (taskIndex: number) => {
    const tasks = stage.tasks.map((t, i) =>
      i === taskIndex ? { ...t, enabled: !t.enabled } : t
    );
    patchStage({ tasks });
  };

  // ─── Approvals ────────────────────────────────────────────────────────────

  const handleApprovalToggle = (kind: "pre" | "post", isAutomated: boolean) => {
    const key = kind === "pre" ? "preApprovals" : "postApprovals";
    patchStage({ [key]: { ...stage[key], isAutomated, approvers: [] } });
  };

  const handleAddApprover = (kind: "pre" | "post") => {
    const key = kind === "pre" ? "preApprovals" : "postApprovals";
    patchStage({ [key]: { ...stage[key], approvers: [...stage[key].approvers, ""] } });
  };

  const handleApproverChange = (kind: "pre" | "post", index: number, value: string) => {
    const key = kind === "pre" ? "preApprovals" : "postApprovals";
    const approvers = stage[key].approvers.map((a, i) => (i === index ? value : a));
    patchStage({ [key]: { ...stage[key], approvers } });
  };

  const handleRemoveApprover = (kind: "pre" | "post", index: number) => {
    const key = kind === "pre" ? "preApprovals" : "postApprovals";
    const approvers = stage[key].approvers.filter((_, i) => i !== index);
    patchStage({ [key]: { ...stage[key], approvers } });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <AppBar title={stage.name || "Stage konfigurieren"} />

      <TabBar
        tabs={[
          { key: "tasks", label: "Tasks" },
          { key: "approvals", label: "Approvals" },
          { key: "agent", label: "Agent" },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as Tab)}
        variant="underline"
      />

      <div className="mx-auto max-w-2xl px-4 pb-8 pt-[calc(var(--app-bar-height)+4rem)]">
        <div className="mb-4 flex items-center justify-between">
          <BackActionButton onClick={saveAndGoBack} label="Zurück" />
          <Button onClick={saveAndGoBack}>
            <Check size={16} />
            Übernehmen
          </Button>
        </div>

        {/* ── Tasks-Tab ── */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            {stage.tasks.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                Noch keine Tasks. Füge Tasks über den Button unten hinzu.
              </p>
            )}

            {stage.tasks.map((task, taskIdx) => {
              // Task-Definition finden um Input-Labels zu ermitteln
              const taskDef = allTaskDefs.find((d) => d.id === task.taskId);

              return (
                <div
                  key={taskIdx}
                  className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40"
                >
                  {/* Task-Header */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(taskIdx)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        task.enabled
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-600 bg-transparent"
                      }`}
                    >
                      {task.enabled && <Check size={12} />}
                    </button>

                    <span
                      className={`min-w-0 flex-1 truncate text-sm font-medium ${
                        task.enabled ? "text-slate-100" : "text-slate-500 line-through"
                      }`}
                    >
                      {task.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleMoveTask(taskIdx, "up")}
                      disabled={taskIdx === 0}
                      className="rounded-lg p-1 text-slate-500 hover:text-slate-300 disabled:opacity-25"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTask(taskIdx, "down")}
                      disabled={taskIdx === stage.tasks.length - 1}
                      className="rounded-lg p-1 text-slate-500 hover:text-slate-300 disabled:opacity-25"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTaskIndex(expandedTaskIndex === taskIdx ? null : taskIdx)
                      }
                      className="rounded-lg p-1 text-slate-500 hover:text-slate-300"
                    >
                      {expandedTaskIndex === taskIdx ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(taskIdx)}
                      className="rounded-lg p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Task-Konfiguration */}
                  {expandedTaskIndex === taskIdx && (
                    <div className="space-y-3 border-t border-slate-700/50 px-4 py-3">
                      {/* Anzeigename */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400">Anzeigename</label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => handleTaskNameChange(taskIdx, e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Dynamische Inputs aus der Task-Definition */}
                      {taskDef
                        ? taskDef.inputs
                            .filter((input) => input.type !== "section" && input.type !== "radio")
                            .map((inputDef) => (
                              <TaskInputField
                                key={inputDef.name}
                                inputDef={inputDef}
                                value={task.inputs[inputDef.name] ?? inputDef.defaultValue ?? ""}
                                onChange={(val) => handleTaskInput(taskIdx, inputDef.name, val)}
                              />
                            ))
                        : // Fallback: alle gespeicherten Inputs als Freitext
                          Object.entries(task.inputs).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                              <label className="text-xs text-slate-400">{key}</label>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleTaskInput(taskIdx, key, e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Task hinzufügen */}
            <button
              type="button"
              onClick={() => setTaskPickerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-600 py-3 text-sm text-slate-400 transition-colors hover:border-blue-500/60 hover:text-blue-400"
            >
              <Plus size={15} />
              Task hinzufügen
            </button>
          </div>
        )}

        {/* ── Approvals-Tab ── */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            <ApprovalSection
              title="Pre-Deployment"
              subtitle="Vor dem Deployment dieser Stage"
              config={stage.preApprovals}
              onToggle={(isAuto) => handleApprovalToggle("pre", isAuto)}
              onAddApprover={() => handleAddApprover("pre")}
              onChangeApprover={(i, v) => handleApproverChange("pre", i, v)}
              onRemoveApprover={(i) => handleRemoveApprover("pre", i)}
            />
            <ApprovalSection
              title="Post-Deployment"
              subtitle="Nach dem Deployment dieser Stage"
              config={stage.postApprovals}
              onToggle={(isAuto) => handleApprovalToggle("post", isAuto)}
              onAddApprover={() => handleAddApprover("post")}
              onChangeApprover={(i, v) => handleApproverChange("post", i, v)}
              onRemoveApprover={(i) => handleRemoveApprover("post", i)}
            />
          </div>
        )}

        {/* ── Agent-Tab ── */}
        {activeTab === "agent" && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Stage</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Name</label>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => patchStage({ name: e.target.value })}
                  placeholder="Stage-Name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Agent-Pool</p>
              <div className="divide-y divide-slate-700/50 overflow-hidden rounded-xl border border-slate-700">
                {AGENT_SPECS.map((spec) => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => patchStage({ agentSpec: spec.id })}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${
                      stage.agentSpec === spec.id
                        ? "bg-blue-600/20 text-blue-300"
                        : "text-slate-300 hover:bg-slate-700/40"
                    }`}
                  >
                    <span className="w-3.5 shrink-0">
                      {stage.agentSpec === spec.id && (
                        <Check size={14} className="text-blue-400" />
                      )}
                    </span>
                    {spec.label}
                  </button>
                ))}
              </div>

              {stage.agentSpec === "self-hosted" && (
                <div className="mt-2 space-y-1">
                  <label className="text-xs text-slate-500">Pool-Name</label>
                  <input
                    type="text"
                    value={selfHostedPool}
                    onChange={(e) => {
                      setSelfHostedPool(e.target.value);
                      patchStage({ agentSpec: e.target.value || "self-hosted" });
                    }}
                    placeholder="z.B. MeinPool"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task-Picker Modal */}
      {taskPickerOpen && (
        <TaskPickerModal
          taskDefs={allTaskDefs}
          isLoading={tasksLoading}
          onSelect={handleAddTask}
          onClose={() => setTaskPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Task-Picker Modal ────────────────────────────────────────────────────────

interface TaskPickerModalProps {
  taskDefs: AzureTaskDefinition[];
  isLoading: boolean;
  onSelect: (def: AzureTaskDefinition) => void;
  onClose: () => void;
}

/** Durchsuchbarer Task-Katalog mit Kategorie-Filter. */
function TaskPickerModal({ taskDefs, isLoading, onSelect, onClose }: TaskPickerModalProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Alle");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(taskDefs.map((d) => d.category))).sort();
    return ["Alle", ...cats];
  }, [taskDefs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return taskDefs.filter((d) => {
      const matchesSearch =
        !q ||
        (d.friendlyName || d.name).toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q);
      const matchesCategory = category === "Alle" || d.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [taskDefs, search, category]);

  return (
    <Modal open onClose={onClose} title="Task hinzufügen">
      <div className="space-y-3">
        {/* Suche */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Task suchen..."
            autoFocus
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-9 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Kategorie-Filter */}
        <div className="-mx-1 flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-blue-600/30 text-blue-300"
                  : "bg-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Task-Liste */}
        <div className="max-h-80 divide-y divide-slate-800/60 overflow-y-auto rounded-xl border border-slate-700/60">
          {isLoading && <PageLoader />}

          {!isLoading && filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Keine Tasks gefunden.
            </p>
          )}

          {filtered.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => onSelect(def)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-700/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">
                  {def.friendlyName || def.name}
                </p>
                {def.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{def.description}</p>
                )}
                <p className="mt-1 text-[10px] text-slate-600">
                  {def.category} · v{def.version.major}
                </p>
              </div>
              <Plus size={14} className="mt-0.5 shrink-0 text-slate-500" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600">
          {filtered.length} von {taskDefs.length} Tasks
        </p>
      </div>
    </Modal>
  );
}

// ─── Dynamisches Task-Input-Feld ──────────────────────────────────────────────

interface TaskInputFieldProps {
  inputDef: import("@/types").TaskInputDefinition;
  value: string;
  onChange: (value: string) => void;
}

/** Rendert ein Task-Input-Feld dynamisch anhand des Input-Typs. */
function TaskInputField({ inputDef, value, onChange }: TaskInputFieldProps) {
  const label = (
    <label className="text-xs font-medium text-slate-400">
      {inputDef.label || inputDef.name}
      {inputDef.required && <span className="ml-1 text-red-400">*</span>}
    </label>
  );

  if (inputDef.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value === "true" ? "false" : "true")}
          className={`flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
            value === "true"
              ? "border-blue-500 bg-blue-600"
              : "border-slate-600 bg-slate-700"
          }`}
        >
          <span
            className={`mx-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              value === "true" ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        {label}
      </div>
    );
  }

  if (inputDef.type === "pickList" && inputDef.options) {
    return (
      <div className="space-y-1">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(inputDef.options).map(([optKey, optLabel]) => (
            <option key={optKey} value={optKey}>
              {optLabel}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (inputDef.type === "multiLine" || inputDef.type === "string" && inputDef.name.toLowerCase().includes("script")) {
    return (
      <div className="space-y-1">
        {label}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          spellCheck={false}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      </div>
    );
  }

  // Standard: Text-Input
  return (
    <div className="space-y-1">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={inputDef.defaultValue || inputDef.name}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
      />
      {inputDef.helpMarkDown && (
        <p className="text-[10px] text-slate-600">{inputDef.helpMarkDown.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}</p>
      )}
    </div>
  );
}

// ─── Approval-Section ─────────────────────────────────────────────────────────

interface ApprovalSectionProps {
  title: string;
  subtitle: string;
  config: StageApprovalConfig;
  onToggle: (isAutomated: boolean) => void;
  onAddApprover: () => void;
  onChangeApprover: (index: number, value: string) => void;
  onRemoveApprover: (index: number) => void;
}

function ApprovalSection({
  title,
  subtitle,
  config,
  onToggle,
  onAddApprover,
  onChangeApprover,
  onRemoveApprover,
}: ApprovalSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
            config.isAutomated
              ? "border-blue-500/40 bg-blue-600/20 text-blue-300"
              : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Automatisch
        </button>
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
            !config.isAutomated
              ? "border-purple-500/40 bg-purple-600/20 text-purple-300"
              : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Manuell
        </button>
      </div>

      {!config.isAutomated && (
        <div className="space-y-2">
          {config.approvers.length === 0 && (
            <p className="text-xs text-slate-500">Füge mindestens einen Approver hinzu.</p>
          )}
          {config.approvers.map((approver, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="email"
                value={approver}
                onChange={(e) => onChangeApprover(idx, e.target.value)}
                placeholder="approver@beispiel.de"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onRemoveApprover(idx)}
                className="rounded-lg p-2 text-slate-500 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddApprover}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <Plus size={14} />
            Approver hinzufügen
          </button>
        </div>
      )}

      {config.isAutomated && (
        <p className="text-xs text-slate-500">
          Das Deployment startet automatisch ohne manuelle Freigabe.
        </p>
      )}
    </div>
  );
}
