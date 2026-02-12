"use client";

import { CodeHighlight } from "@/components/code-highlight";

function renderContent(content: string) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(
          <CodeHighlight
            key={i}
            code={codeBuffer.join("\n")}
            language="python"
            className="my-2"
          />
        );
        codeBuffer = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={i} className="text-xl font-semibold mt-6 mb-2">
          {line.slice(3)}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={i} className="text-2xl font-bold mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
      continue;
    }
    if (line.trim()) {
      blocks.push(
        <p key={i} className="text-muted-foreground mb-2">
          {line}
        </p>
      );
    } else {
      blocks.push(<div key={i} className="h-2" />);
    }
  }
  if (codeBuffer.length > 0) {
    blocks.push(
      <CodeHighlight
        key="final"
        code={codeBuffer.join("\n")}
        language="python"
        className="my-2"
      />
    );
  }
  return blocks;
}

export function LegacyLectureContent({ content }: { content: string }) {
  return <div className="space-y-2">{renderContent(content)}</div>;
}
