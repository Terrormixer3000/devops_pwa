"use client";

import Prism from "prismjs";
import "prismjs/components/prism-yaml";
import React from "react";

/** YAML-Code mit Prism hervorheben (gibt HTML-String zurueck). */
function highlightYaml(code: string): string {
  return Prism.highlight(code, Prism.languages.yaml, "yaml");
}

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  minHeight?: string;
}

/**
 * YAML-Editor mit Syntax Highlighting.
 * Transparentes Textarea liegt ueber einem highlighted Pre-Block –
 * Touch und Cursor funktionieren wie bei einer normalen Textarea.
 */
export function YamlEditor({ value, onChange, readOnly = false, minHeight = "65vh" }: YamlEditorProps) {
  // Leerzeile am Ende damit Cursor in der letzten Zeile korrekt positioniert wird
  const highlighted = highlightYaml(value) + "\n";

  const sharedStyle: React.CSSProperties = {
    fontFamily: "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
    fontSize: 12,
    lineHeight: "1.6",
    padding: 16,
    margin: 0,
    border: "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    tabSize: 2,
    minHeight,
  };

  return (
    <div className="relative w-full" style={{ minHeight }}>
      {/* Highlighted-Hintergrund */}
      <pre
        aria-hidden
        className="prism-yaml absolute inset-0 overflow-auto pointer-events-none text-slate-200 bg-transparent"
        style={sharedStyle}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      {/* Eingabe-Textarea (transparenter Text, sichtbarer Cursor) */}
      <textarea
        className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-white focus:outline-none"
        style={sharedStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  );
}
