"use client";

import { CodeHighlight } from "@/components/code-highlight";
import { Fragment } from "react";

function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function renderInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let rest = text;
  let key = 0;

  const pushText = (value: string) => {
    if (!value) return;
    result.push(<Fragment key={`t-${key++}`}>{value}</Fragment>);
  };

  while (rest.length > 0) {
    const codeMatch = rest.match(/`([^`]+)`/);
    const boldMatch = rest.match(/\*\*([^*]+)\*\*/);
    const italicMatch = rest.match(/\*([^*]+)\*/);
    const linkMatch = rest.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);

    const candidates = [codeMatch, boldMatch, italicMatch, linkMatch]
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    if (candidates.length === 0) {
      pushText(rest);
      break;
    }

    const m = candidates[0];
    const idx = m.index ?? 0;
    pushText(rest.slice(0, idx));
    const token = m[0];

    if (m === codeMatch) {
      result.push(
        <code key={`c-${key++}`} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
          {m[1]}
        </code>
      );
    } else if (m === boldMatch) {
      result.push(
        <strong key={`b-${key++}`} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      );
    } else if (m === italicMatch) {
      result.push(
        <em key={`i-${key++}`} className="italic">
          {m[1]}
        </em>
      );
    } else if (m === linkMatch) {
      result.push(
        <a
          key={`l-${key++}`}
          href={m[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {m[1]}
        </a>
      );
    }

    rest = rest.slice(idx + token.length);
  }

  return result;
}

function renderMarkdownContent(content: string) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let inCode = false;
  let codeLang = "python";
  let codeBuffer: string[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (keyBase: string) => {
    if (!listBuffer || listBuffer.items.length === 0) return;
    if (listBuffer.type === "ul") {
      blocks.push(
        <ul key={`ul-${keyBase}`} className="list-disc pl-6 my-2 space-y-1 text-muted-foreground">
          {listBuffer.items.map((item, i) => (
            <li key={`uli-${keyBase}-${i}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${keyBase}`} className="list-decimal pl-6 my-2 space-y-1 text-muted-foreground">
          {listBuffer.items.map((item, i) => (
            <li key={`oli-${keyBase}-${i}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    }
    listBuffer = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushList(String(i));
      if (inCode) {
        blocks.push(
          <CodeHighlight
            key={i}
            code={codeBuffer.join("\n")}
            language={codeLang}
            className="my-2"
          />
        );
        codeBuffer = [];
        codeLang = "python";
      } else {
        codeLang = trimmed.slice(3).trim() || "python";
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList(`switch-${i}`);
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList(`switch-${i}`);
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(olMatch[1]);
      continue;
    }
    flushList(String(i));

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={i} className="text-lg font-medium mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={i} className="text-xl font-semibold mt-6 mb-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={i} className="text-2xl font-bold mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (trimmed) {
      blocks.push(
        <p key={i} className="text-muted-foreground mb-2">
          {renderInline(line)}
        </p>
      );
    } else {
      blocks.push(<div key={i} className="h-2" />);
    }
  }
  flushList("final");
  if (codeBuffer.length > 0) {
    blocks.push(
      <CodeHighlight
        key="final"
        code={codeBuffer.join("\n")}
        language={codeLang}
        className="my-2"
      />
    );
  }
  return blocks;
}

export function LegacyLectureContent({ content }: { content: string }) {
  if (looksLikeHtml(content)) {
    return (
      <div
        className="[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:first:mt-0 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-0.5 [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <div className="space-y-2">{renderMarkdownContent(content)}</div>;
}
