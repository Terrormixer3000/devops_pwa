"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { CodeSearchResult } from "@/lib/services/searchService";

/** Code-Suche im Repository mit Ergebnisliste. */
export function SearchView({
  searchQuery,
  searchResults,
  isSearching,
  onSearch,
  onOpenFile,
}: {
  searchQuery: string;
  searchResults: CodeSearchResult[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const t = useTranslations("explorer");
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Eingabefeld beim Oeffnen automatisch fokussieren
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (value: string) => {
    setLocalQuery(value);
    onSearch(value);
  };

  return (
    <div>
      {/* Suchfeld */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <Search size={16} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoCapitalize="none"
          autoCorrect="off"
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
        />
      </div>

      {/* Zustand: Suche laeuft */}
      {isSearching && (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-400">
          <LoadingSpinner size="sm" />
          <span>{t("searching")}</span>
        </div>
      )}

      {/* Zustand: Keine Ergebnisse */}
      {!isSearching && localQuery.trim() && searchResults.length === 0 && (
        <div className="px-4 py-6 text-sm text-slate-500 text-center">
          {t("noSearchResults")}
        </div>
      )}

      {/* Ergebnisliste */}
      {!isSearching && searchResults.length > 0 && (
        <div>
          <p className="px-4 py-2 text-xs text-slate-500 border-b border-slate-800">
            {t("searchResults")} ({searchResults.length})
          </p>
          <ul>
            {searchResults.map((result, i) => (
              <li key={`${result.path}-${i}`}>
                <button
                  onClick={() => onOpenFile(result.path)}
                  className="w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                >
                  <p className="text-sm text-slate-200 font-medium truncate">{result.fileName}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{result.path}</p>
                  {result.repository?.name && (
                    <p className="text-xs text-slate-600 mt-0.5">{result.repository.name}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
