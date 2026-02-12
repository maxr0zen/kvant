"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import { cn } from "@/components/lib/utils";

interface CodeHighlightProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeHighlight({
  code,
  language = "python",
  className,
  showLineNumbers = false,
}: CodeHighlightProps) {
  const style = oneDark;

  return (
    <div className={cn("code-font-mono", className)}>
      <SyntaxHighlighter
        language={language}
        style={style}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          background: undefined,
        }}
        lineNumberStyle={{
          minWidth: "2.25em",
          paddingRight: "1em",
          color: "var(--muted-foreground)",
          userSelect: "none",
        }}
        wrapLongLines
        className="!rounded-lg overflow-x-auto"
      >
        {code || " "}
      </SyntaxHighlighter>
    </div>
  );
}
