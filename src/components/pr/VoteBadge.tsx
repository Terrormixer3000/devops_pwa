import { Badge } from "@/components/ui/Badge";

/** Badge mit farbigem Hintergrund für den Vote-Status eines Reviewers. */
export function VoteBadge({ vote }: { vote: number }) {
  if (vote === 10) return <Badge variant="success">Approved</Badge>;
  if (vote === 5) return <Badge variant="warning">Mit Vorbehalten</Badge>;
  if (vote === -5) return <Badge variant="warning">Warten</Badge>;
  if (vote === -10) return <Badge variant="danger">Abgelehnt</Badge>;
  return <Badge variant="muted">Ausstehend</Badge>;
}
