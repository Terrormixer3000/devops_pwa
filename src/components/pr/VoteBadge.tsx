"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

/** Badge mit farbigem Hintergrund für den Vote-Status eines Reviewers. */
export function VoteBadge({ vote }: { vote: number }) {
  const t = useTranslations("voteBadge");
  if (vote === 10) return <Badge variant="success">{t("approved")}</Badge>;
  if (vote === 5) return <Badge variant="warning">{t("withSuggestions")}</Badge>;
  if (vote === -5) return <Badge variant="warning">{t("waiting")}</Badge>;
  if (vote === -10) return <Badge variant="danger">{t("rejected")}</Badge>;
  return <Badge variant="muted">{t("pending")}</Badge>;
}
