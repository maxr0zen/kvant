"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTracks } from "@/lib/api/tracks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ListChecks } from "lucide-react";

export default function TracksPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const t = await fetchTracks();
        if (mounted) setTracks(t);
      } catch (e) {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Треки</h1>
        <p className="text-muted-foreground mt-1">
          Выберите трек и переходите к лекциям и задачам по порядку.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Загрузка...</div>
      ) : tracks.length === 0 ? (
        <div className="text-sm text-muted-foreground">Нет доступных треков. Выполните вход.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <Card key={track.id} className="flex flex-col border-primary/10 hover:border-primary/25 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {track.title}
                </CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2">
                <ul className="text-sm text-muted-foreground space-y-1">
                  {(track.lessons || []).slice(0, 4).map((lesson: any) => (
                    <li key={lesson.id} className="flex items-center gap-2">
                      {lesson.type === "lecture" ? (
                        <BookOpen className="h-3 w-3 shrink-0" />
                      ) : (
                        <ListChecks className="h-3 w-3 shrink-0" />
                      )}
                      {lesson.title}
                    </li>
                  ))}
                  {(track.lessons || []).length > 4 && (
                    <li className="text-muted-foreground/80">
                      и ещё {(track.lessons || []).length - 4}...
                    </li>
                  )}
                </ul>
                <Link href={`/tracks/${track.id}`} className="mt-auto pt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    Открыть трек
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
