"use client";

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
          <pre
            key={i}
            className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
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
      <pre
        key="final"
        className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono"
      >
        <code>{codeBuffer.join("\n")}</code>
      </pre>
    );
  }
  return blocks;
}

export function LegacyLectureContent({ content }: { content: string }) {
  return <div className="space-y-2">{renderContent(content)}</div>;
}
