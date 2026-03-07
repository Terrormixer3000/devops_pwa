// Schluessel fuer Favoriten im lokalen Speicher
const FAVORITES_KEY = "azdevops_favorites";

export const favoritesService = {
  // Alle gespeicherten Favoriten-IDs laden
  load(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Gesamte Favoriten-Liste speichern
  save(ids: string[]): void {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  },

  clear(): void {
    localStorage.removeItem(FAVORITES_KEY);
  },

  // Ein Repository zu den Favoriten hinzufuegen
  add(id: string): void {
    const current = this.load();
    if (!current.includes(id)) {
      this.save([...current, id]);
    }
  },

  // Ein Repository aus den Favoriten entfernen
  remove(id: string): void {
    this.save(this.load().filter((f) => f !== id));
  },

  // Prueft ob ein Repository als Favorit markiert ist
  isFavorite(id: string): boolean {
    return this.load().includes(id);
  },
};
