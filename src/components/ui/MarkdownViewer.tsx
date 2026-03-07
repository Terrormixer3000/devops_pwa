"use client";

import { ReactNode } from "react";

interface Props {
  content: string;
}

function isBlockStart(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^```/.test(trimmed) ||
    /^\s*#{1,6}\s+/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(---|\*\*\*|___)\s*$/.test(trimmed)
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(tokenRegex)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const safeHref = /^(https?:\/\/|mailto:|\/)/.test(href) ? href : "#";
      const external = /^https?:\/\//.test(safeHref);
      nodes.push(
        <a
          key={`${keyPrefix}-link-${matchIndex}`}
          href={safeHref}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
          className="text-blue-400 underline decoration-blue-500/60 underline-offset-2 hover:text-blue-300"
        >
          {label}
        </a>
      );
      lastIndex = start + token.length;
      matchIndex += 1;
      continue;
    }

    if (/^`/.test(token)) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[0.85em] text-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
      lastIndex = start + token.length;
      matchIndex += 1;
      continue;
    }

    if (/^\*\*/.test(token) || /^__/.test(token)) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${matchIndex}`} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
      lastIndex = start + token.length;
      matchIndex += 1;
      continue;
    }

    nodes.push(
      <em key={`${keyPrefix}-em-${matchIndex}`} className="italic text-slate-200">
        {token.slice(1, -1)}
      </em>
    );
    lastIndex = start + token.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export function MarkdownViewer({ content }: Props) {
  const normalized = content.replace(/\r/g, "");
  if (!normalized.trim()) {
    return <p className="text-sm text-slate-500">Keine Markdown-Inhalte vorhanden.</p>;
  }

  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockIndex = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      const language = trimmed.slice(3).trim();
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <div key={`code-${blockIndex}`} className="overflow-hidden rounded-lg border border-slate-700/70 bg-slate-900/80">
          {language ? (
            <div className="border-b border-slate-700/80 px-3 py-1.5 text-[11px] font-mono text-slate-400">{language}</div>
          ) : null}
          <pre className="overflow-auto px-3 py-2 text-xs text-slate-200">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      blockIndex += 1;
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizeClass =
        level === 1
          ? "text-2xl"
          : level === 2
          ? "text-xl"
          : level === 3
          ? "text-lg"
          : level === 4
          ? "text-base"
          : "text-sm";
      blocks.push(
        <h3 key={`h-${blockIndex}`} className={`font-semibold text-slate-100 ${sizeClass}`}>
          {renderInline(text, `h-${blockIndex}`)}
        </h3>
      );
      i += 1;
      blockIndex += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${blockIndex}`} className="border-slate-700/80" />);
      i += 1;
      blockIndex += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote key={`q-${blockIndex}`} className="border-l-2 border-blue-500/70 pl-3 text-sm text-slate-300">
          {renderInline(quoteLines.join(" "), `q-${blockIndex}`)}
        </blockquote>
      );
      blockIndex += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${blockIndex}`} className="list-disc space-y-1 pl-5 text-sm text-slate-200">
          {items.map((item, itemIndex) => (
            <li key={`uli-${blockIndex}-${itemIndex}`}>{renderInline(item, `uli-${blockIndex}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
      blockIndex += 1;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${blockIndex}`} className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
          {items.map((item, itemIndex) => (
            <li key={`oli-${blockIndex}-${itemIndex}`}>{renderInline(item, `oli-${blockIndex}-${itemIndex}`)}</li>
          ))}
        </ol>
      );
      blockIndex += 1;
      continue;
    }

    const paragraph: string[] = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }

    blocks.push(
      <p key={`p-${blockIndex}`} className="text-sm leading-6 text-slate-200">
        {renderInline(paragraph.join(" "), `p-${blockIndex}`)}
      </p>
    );
    blockIndex += 1;
  }

  return <div className="space-y-3">{blocks}</div>;
}
