/** Herkunft einer Zeile im Unified-Diff. */
export type UnifiedDiffOrigin = "context" | "add" | "delete";

/** Einzelne Zeile im berechneten Diff mit Zeilennummern. */
export interface UnifiedDiffLine {
  origin: UnifiedDiffOrigin;
  line: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// Schwellenwert: LCS-Matrix ueberschreitet diese Zellen-Anzahl → Fallback-Diff
const MAX_MATRIX_CELLS = 120_000;

/** Normalisiert einen Textinhalt zu einer Zeilenliste ohne abschliessende Leerzeile. */
function toLines(text: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\r/g, "");
  const split = normalized.split("\n");
  if (split.length > 0 && split[split.length - 1] === "") {
    split.pop();
  }
  return split;
}

/**
 * Einfacher Fallback-Diff fuer sehr grosse Dateien (zeilenweiser Vergleich ohne LCS).
 * Wird verwendet wenn die LCS-Matrix {@link MAX_MATRIX_CELLS} Eintraege ueberschreiten wuerde.
 */
function buildFallbackDiff(oldLines: string[], newLines: string[]): UnifiedDiffLine[] {
  const rows: UnifiedDiffLine[] = [];
  let oldLineNumber = 1;
  let newLineNumber = 1;
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine && oldLine !== undefined) {
      rows.push({ origin: "context", line: oldLine, oldLineNumber, newLineNumber });
      oldLineNumber++;
      newLineNumber++;
      continue;
    }
    if (oldLine !== undefined) {
      rows.push({ origin: "delete", line: oldLine, oldLineNumber });
      oldLineNumber++;
    }
    if (newLine !== undefined) {
      rows.push({ origin: "add", line: newLine, newLineNumber });
      newLineNumber++;
    }
  }
  return rows;
}

/**
 * Berechnet einen Unified-Diff zwischen zwei Textinhalten mithilfe des
 * Longest-Common-Subsequence (LCS)-Algorithmus.
 *
 * - Bei leeren Inhalten wird ein leeres Array zurueckgegeben.
 * - Bei sehr grossen Dateien greift ein vereinfachter Fallback-Diff.
 * - Gibt eine flache Liste aller Zeilen mit Origin (context/add/delete)
 *   und Zeilennummern zurueck.
 */
export function buildUnifiedDiff(oldContent: string, newContent: string): UnifiedDiffLine[] {
  const oldLines = toLines(oldContent);
  const newLines = toLines(newContent);

  if (oldLines.length === 0 && newLines.length === 0) {
    return [];
  }

  if (oldLines.length * newLines.length > MAX_MATRIX_CELLS) {
    return buildFallbackDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: oldLines.length + 1 }, () =>
    Array.from({ length: newLines.length + 1 }, () => 0)
  );

  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: Array<{ origin: UnifiedDiffOrigin; line: string }> = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ origin: "context", line: oldLines[i - 1] });
      i--;
      j--;
      continue;
    }

    if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      ops.push({ origin: "delete", line: oldLines[i - 1] });
      i--;
      continue;
    }

    if (j > 0) {
      ops.push({ origin: "add", line: newLines[j - 1] });
      j--;
    }
  }

  ops.reverse();

  const rows: UnifiedDiffLine[] = [];
  let oldLineNumber = 1;
  let newLineNumber = 1;

  for (const op of ops) {
    if (op.origin === "context") {
      rows.push({ origin: "context", line: op.line, oldLineNumber, newLineNumber });
      oldLineNumber++;
      newLineNumber++;
      continue;
    }

    if (op.origin === "delete") {
      rows.push({ origin: "delete", line: op.line, oldLineNumber });
      oldLineNumber++;
      continue;
    }

    rows.push({ origin: "add", line: op.line, newLineNumber });
    newLineNumber++;
  }

  return rows;
}
