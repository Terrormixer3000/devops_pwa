export function buildImageTextRepresentation(
  dataUrl: string | null | undefined,
  label?: string
): string {
  const heading = label ? `# ${label}\n` : "";
  if (!dataUrl) {
    return `${heading}Keine Bilddaten vorhanden.`;
  }

  const commaIndex = dataUrl.indexOf(",");
  const header = commaIndex >= 0 ? dataUrl.slice(0, commaIndex) : dataUrl;
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : "";
  const previewLength = Math.min(payload.length, 2400);
  const preview = payload.slice(0, previewLength);
  const chunks = preview.match(/.{1,120}/g) || [];
  const truncated = payload.length > previewLength ? "\n...(gekuerzt)" : "";

  return `${heading}${header}\nbase64_length=${payload.length}\n\n${chunks.join("\n")}${truncated}`;
}
