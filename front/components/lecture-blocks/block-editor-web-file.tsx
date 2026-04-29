"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, FileCode, Upload } from "lucide-react";
import type { LectureBlock } from "@/lib/types";
import { WebLectureUploader } from "./web-lecture-uploader";
import { getStoredRole } from "@/lib/api/auth";

type WebFileBlock = Extract<LectureBlock, { type: "web_file" }>;

interface BlockEditorWebFileProps {
  block: WebFileBlock;
  onChange: (block: WebFileBlock) => void;
  onRemove: () => void;
}

export function BlockEditorWebFile({ block, onChange, onRemove }: BlockEditorWebFileProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [canUpload, setCanUpload] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    setCanUpload(role === "teacher" || role === "superuser");
  }, []);

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
          <FileCode className="h-4 w-4" /> Блок: Веб-файл
        </Label>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Удалить блок">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">URL файла</Label>
        <Input
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="/web-lection-files/lesson/index.html"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Путь относительно корня сайта, например: /web-lection-files/lesson/index.html
        </p>
      </div>

      {canUpload && (
        <div className="space-y-2">
          {!showUploader ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowUploader(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Загрузить ZIP-архив
            </Button>
          ) : (
            <WebLectureUploader
              onUploaded={(url) => {
                onChange({ ...block, url });
                setShowUploader(false);
              }}
            />
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Заголовок (необязательно)</Label>
        <Input
          value={block.title || ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Заголовок (необязательно)"
          className="text-sm"
        />
      </div>
    </div>
  );
}
