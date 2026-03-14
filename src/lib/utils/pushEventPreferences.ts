import type { PushEventPreferences, PushEventType } from "@/types";

export const PUSH_EVENT_TYPES: PushEventType[] = [
  "pr.reviewer",
  "pr.comment",
  "build.failed",
  "build.succeeded",
  "release.approval",
];

export const DEFAULT_PUSH_EVENT_PREFERENCES: PushEventPreferences = {
  "build.failed": true,
  "build.succeeded": true,
  "pr.reviewer": true,
  "pr.comment": true,
  "release.approval": true,
};

export function normalizePushEventPreferences(
  preferences?: Partial<PushEventPreferences> | null
): PushEventPreferences {
  return {
    ...DEFAULT_PUSH_EVENT_PREFERENCES,
    ...(preferences ?? {}),
  };
}
