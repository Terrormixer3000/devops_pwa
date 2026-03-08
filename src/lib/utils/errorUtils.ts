/**
 * Extrahiert eine lesbare Fehlermeldung aus einem unbekannten Fehler-Objekt.
 * Gibt die .message-Eigenschaft zurueck, wenn es sich um eine Error-Instanz handelt,
 * andernfalls den angegebenen Fallback-Text.
 */
export function extractErrorMessage(error: unknown, fallback = "Unbekannter Fehler"): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
