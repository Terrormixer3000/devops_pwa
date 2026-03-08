const MARKDOWN_EXTENSIONS = new Set([
  "md",
  "markdown",
  "mdown",
  "mkd",
  "mkdn",
  "mdx",
]);

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
};

/** Extrahiert die Dateiendung aus einem Pfad (ohne Query- oder Hash-Anteil, lowercase). */
export function getFileExtension(path: string): string {
  const clean = path.split("?")[0].split("#")[0];
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return clean.slice(dotIndex + 1).toLowerCase();
}

/** Prueft ob der Pfad auf eine Markdown-Datei zeigt. */
export function isMarkdownPath(path: string): boolean {
  return MARKDOWN_EXTENSIONS.has(getFileExtension(path));
}

/** Gibt den MIME-Typ eines Bildpfades zurueck oder null wenn es kein Bild ist. */
export function getImageMimeType(path: string): string | null {
  const extension = getFileExtension(path);
  return IMAGE_MIME_BY_EXTENSION[extension] || null;
}

/** Prueft ob der Pfad auf eine Bilddatei zeigt. */
export function isImagePath(path: string): boolean {
  return Boolean(getImageMimeType(path));
}
