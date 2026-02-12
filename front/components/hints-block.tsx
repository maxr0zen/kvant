"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface HintsBlockProps {
  hints: string[];
  className?: string;
}

export function HintsBlock({ hints, className }: HintsBlockProps) {
  const [shownCount, setShownCount] = useState(0);

  if (!hints?.length) return null;

  const visible = hints.slice(0, shownCount);
  const hasMore = shownCount < hints.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Подсказки
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((text, i) => (
          <p key={i} className="text-sm text-muted-foreground border-l-2 border-amber-500 pl-3 py-1">
            {text}
          </p>
        ))}
        {hasMore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShownCount((c) => c + 1)}
            className="gap-1"
          >
            <Lightbulb className="h-3 w-3" />
            Показать подсказку {shownCount + 1}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
