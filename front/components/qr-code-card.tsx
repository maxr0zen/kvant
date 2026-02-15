"use client";

import { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Check } from "lucide-react";

interface QrCodeCardProps {
  title: string;
  url: string;
}

export function QrCodeCard({ title, url }: QrCodeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(160);
  const [revealed, setRevealed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? {};
      if (width) setSize(Math.max(120, Math.floor(width - 32)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url);
      setRevealed(true);
      toast({ title: "Ссылка скопирована" });
    } catch {
      setRevealed(true);
      toast({ title: "Не удалось скопировать", variant: "destructive" });
    }
  }

  if (!url?.trim()) return null;

  return (
    <div ref={containerRef} className="h-full min-h-[200px]">
      <Card className="overflow-hidden flex flex-col h-full rounded-xl border-border/50 bg-card shadow-sm hover:shadow-xl hover:bg-muted/60 hover:border-primary/40 transition-all duration-200">
        <CardHeader className="pb-0 pt-4 px-4 shrink-0">
          <CardTitle className="text-sm font-semibold text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center pt-2 pb-4 px-4 min-h-0">
          <div
            role="button"
            tabIndex={0}
            onClick={revealed ? () => setRevealed(false) : handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                revealed ? setRevealed(false) : handleClick();
              }
            }}
            className="flex-1 flex items-center justify-center min-h-0 w-full cursor-pointer"
          >
            {revealed ? (
              <div className="text-sm text-muted-foreground break-all w-full text-center font-mono flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                {url}
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-background dark:bg-zinc-100 p-2.5 shadow-inner hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <QRCodeSVG value={url} size={size} level="M" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
