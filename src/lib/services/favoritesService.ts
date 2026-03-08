/**
 * Browser-seitiger Service zum Verwalten von Favoriten-Repositories.
 * Speichert die Favoriten-IDs als JSON-Array im localStorage.
 */
// Schluessel fuer Favoriten im lokalen Speicher
const FAVORITES_KEY = "azdevops_favorites";

export const favoritesService = {
  /** Laedt alle gespeicherten Favoriten-IDs aus dem localStorage. */
  load(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Speichert eine vollstaendige neue Favoriten-ID-Liste im localStorage. */
  save(ids: string[]): void {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  },

  /** Loescht alle Favoriten-Eintraege aus dem localStorage. */
  clear(): void {
    localStorage.removeItem(FAVORITES_KEY);
  },

  /** Fuegt ein Repository zur Favoritenliste hinzu, falls noch nicht vorhanden. */
  add(id: string): void {
    const current = this.load();
    if (!current.includes(id)) {
      this.save([...current, id]);
    }
  },

  /** Entfernt ein Repository aus der Favoritenliste. */
  remove(id: string): void {
    this.save(this.load().filter((f) => f !== id));
  },

  /** Prueft, ob ein Repository als Favorit markiert ist. */
  isFavorite(id: string): boolean {
    return this.load().includes(id);
  },
};
