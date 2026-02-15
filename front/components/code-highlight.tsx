"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import { cn } from "@/components/lib/utils";
import { useTheme } from "@/components/theme-provider";

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
  const { theme } = useTheme();
  const style = theme === "dark" ? oneDark : oneLight;

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
