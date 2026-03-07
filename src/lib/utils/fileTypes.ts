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

export function getFileExtension(path: string): string {
  const clean = path.split("?")[0].split("#")[0];
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return clean.slice(dotIndex + 1).toLowerCase();
}

export function isMarkdownPath(path: string): boolean {
  return MARKDOWN_EXTENSIONS.has(getFileExtension(path));
}

export function getImageMimeType(path: string): string | null {
  const extension = getFileExtension(path);
  return IMAGE_MIME_BY_EXTENSION[extension] || null;
}

export function isImagePath(path: string): boolean {
  return Boolean(getImageMimeType(path));
}
