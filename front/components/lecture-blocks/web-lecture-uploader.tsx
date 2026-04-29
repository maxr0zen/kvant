"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileArchive, CheckCircle2 } from "lucide-react";
import { uploadWebLecture } from "@/lib/api/web-lectures";
import { useToast } from "@/components/ui/use-toast";

interface WebLectureUploaderProps {
  onUploaded: (url: string) => void;
}

export function WebLectureUploader({ onUploaded }: WebLectureUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".zip")) {
      setFile(dropped);
      setDone(false);
    } else {
      toast({ title: "Неверный файл", description: "Пожалуйста, загрузите ZIP-архив.", variant: "destructive" });
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setDone(false);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadWebLecture(file, setProgress);
      onUploaded(res.url);
      setDone(true);
      toast({ title: "Успешно загружено", description: `URL: ${res.url}` });
    } catch (err) {
      toast({
        title: "Ошибка загрузки",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [file, onUploaded, toast]);

  const clear = useCallback(() => {
    setFile(null);
    setProgress(0);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={
            "cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors " +
            (isDragging
              ? "border-primary bg-primary/5"
              : "border-border/70 bg-muted/20 hover:bg-muted/30")
          }
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Перетащите ZIP-архив сюда или нажмите для выбора
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Максимальный размер: 50 МБ. Архив должен содержать index.html.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <FileArchive className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
            </div>
            {!uploading && !done && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clear}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {done && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {!uploading && !done && (
            <Button type="button" size="sm" className="w-full" onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Загрузить
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
