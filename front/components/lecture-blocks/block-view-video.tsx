"use client";

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: { videoId: string; width?: string; height?: string; playerVars?: Record<string, number | string>; events?: { onReady?: () => void } }) => YTPlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  getCurrentTime: () => number;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { LectureBlock } from "@/lib/types";
import { checkLectureBlockAnswer } from "@/lib/api/lectures";

type VideoType = "native" | "youtube" | "vimeo" | "rutube" | "vk";

function isM3u8Url(url: string): boolean {
  const u = (url || "").trim().toLowerCase();
  return u.includes(".m3u8") || u.includes("m3u8");
}

interface ParsedVideo {
  type: VideoType;
  youtubeId?: string;
  vimeoId?: string;
  rutubeId?: string;
  embedUrl?: string;
}

function parseVideoUrl(url: string): ParsedVideo | null {
  const u = url.trim().toLowerCase();
  if (u.includes("youtube.com/watch?v=")) {
    const m = url.match(/[?&]v=([^&]+)/);
    return m ? { type: "youtube", youtubeId: m[1] } : null;
  }
  if (u.includes("youtu.be/")) {
    const m = url.match(/youtu\.be\/([^?/]+)/);
    return m ? { type: "youtube", youtubeId: m[1] } : null;
  }
  if (u.includes("youtube.com/embed/")) {
    const m = url.match(/embed\/([^?/]+)/);
    return m ? { type: "youtube", youtubeId: m[1] } : null;
  }
  if (u.includes("vimeo.com/")) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? { type: "vimeo", vimeoId: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` } : null;
  }
  if (u.includes("player.vimeo.com/video/")) {
    const m = url.match(/video\/(\d+)/);
    return m ? { type: "vimeo", vimeoId: m[1], embedUrl: url } : null;
  }
  // Rutube: rutube.ru/video/ID, rutube.ru/shorts/ID, rutube.ru/play/embed/ID
  if (u.includes("rutube.ru/video/") || u.includes("rutube.ru/shorts/")) {
    const m = url.match(/rutube\.ru\/(?:video|shorts)\/([a-zA-Z0-9]+)/i);
    return m ? { type: "rutube", rutubeId: m[1], embedUrl: `https://rutube.ru/play/embed/${m[1]}` } : null;
  }
  if (u.includes("rutube.ru/play/embed/")) {
    const m = url.match(/rutube\.ru\/play\/embed\/([a-zA-Z0-9]+)/i);
    return m ? { type: "rutube", rutubeId: m[1], embedUrl: `https://rutube.ru/play/embed/${m[1]}` } : null;
  }
  // VK Video: полная embed-ссылка (oid, id, hash)
  if ((u.includes("vkvideo.ru/video_ext.php") || u.includes("vk.com/video_ext.php")) && u.includes("oid=") && u.includes("id=") && u.includes("hash=")) {
    const embedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return { type: "vk", embedUrl };
  }
  // VK Video: обычная ссылка vk.com/video-XXX_YYY или vk.com/videoXXX_YYY
  if (u.includes("vk.com/video") || u.includes("vk.video/video") || u.includes("vkvideo.ru/video")) {
    const m = url.match(/video(-?\d+)_(\d+)/i);
    if (m) {
      const oid = m[1];
      const vid = m[2];
      return { type: "vk", embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}` };
    }
  }
  return null;
}

interface BlockViewVideoProps {
  block: Extract<LectureBlock, { type: "video" }>;
  lectureId: string;
  blockProgress?: Record<string, { status?: string; correct_ids?: string[] | null }>;
  /** Вызывается при верном ответе; blockId — для оптимистичного обновления прогресса (videoId::pausePointId). */
  onCorrectAnswer?: (blockId?: string) => void;
}

export function BlockViewVideo({ block, lectureId, blockProgress = {}, onCorrectAnswer }: BlockViewVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const embedPlayerRef = useRef<YTPlayer | { seekTo: (t: number) => void; play: () => void } | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [activePause, setActivePause] = useState<{ pp: (typeof block.pause_points)[number]; blockId: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; message: string } | null>(null);
  const [vkTimerStarted, setVkTimerStarted] = useState(false);
  const vkTimerStartRef = useRef<number | null>(null);
  const vkShowingQuestionRef = useRef(false);
  const blockProgressRef = useRef(blockProgress);
  blockProgressRef.current = blockProgress;

  const pausePoints = (block.pause_points ?? []).slice().sort((a, b) => a.timestamp - b.timestamp);
  const videoBlockId = block.id;
  // При просмотре используем прямую ссылку (direct_url), если бэкенд её подставил; иначе исходную url
  const playbackUrl = (block.direct_url ?? block.url) || "";
  const parsed = parseVideoUrl(playbackUrl);
  const isNativeDirect = parsed === null && playbackUrl.trim().length > 0;
  const isM3u8 = isNativeDirect && isM3u8Url(playbackUrl);

  // Воспроизведение m3u8 (HLS) через hls.js; Safari — нативно по src
  useEffect(() => {
    if (!isM3u8 || !playbackUrl.trim()) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [isM3u8, playbackUrl]);

  // Паузы для нативного видео (прямые ссылки .mp4 и m3u8)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || pausePoints.length === 0 || parsed !== null) return;

    function onTimeUpdate() {
      const t = video!.currentTime;
      const bp = blockProgressRef.current;
      for (const pp of pausePoints) {
        const blockId = `${videoBlockId}::${pp.id}`;
        const status = bp[blockId]?.status;
        if (status === "completed") continue;
        if (t >= pp.timestamp - 0.5) {
          video!.pause();
          setActivePause({ pp, blockId });
          return;
        }
      }
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [pausePoints, videoBlockId, parsed]);

  // Паузы для YouTube
  useEffect(() => {
    if (parsed?.type !== "youtube" || !parsed.youtubeId || pausePoints.length === 0) return;

    const container = embedContainerRef.current;
    if (!container) return;

    let player: YTPlayer | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const initPlayer = () => {
      const YT = typeof window !== "undefined" ? window.YT : undefined;
      if (!YT?.Player) return false;
      player = new YT.Player(container, {
        videoId: parsed!.youtubeId,
        width: "100%",
        height: "100%",
        playerVars: {
          enablejsapi: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => {
            embedPlayerRef.current = player;
            intervalId = setInterval(() => {
              const YT = typeof window !== "undefined" ? window.YT : undefined;
              if (!player || !YT || player.getPlayerState?.() !== YT.PlayerState.PLAYING) return;
              const t = player.getCurrentTime();
              const bp = blockProgressRef.current;
              for (const pp of pausePoints) {
                const blockId = `${videoBlockId}::${pp.id}`;
                if (bp[blockId]?.status === "completed") continue;
                if (t >= pp.timestamp - 0.5) {
                  if (intervalId) clearInterval(intervalId);
                  intervalId = null;
                  player.pauseVideo();
                  setActivePause({ pp, blockId });
                  return;
                }
              }
            }, 500);
          },
        },
      });
      return true;
    };

    if (typeof window !== "undefined" && window.YT?.Player) {
      initPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScript = document.getElementsByTagName("script")[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);
      (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (player?.destroy) player.destroy();
      embedPlayerRef.current = null;
    };
    // Зависимости: только type/youtubeId, не весь parsed (чтобы не пересоздавать плеер при каждом рендере)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- parsed?.type, parsed?.youtubeId достаточны для YouTube
  }, [parsed?.type, parsed?.youtubeId, pausePoints, videoBlockId]);

  // Rutube embed + паузы (postMessage API: player:currentTime, player:pause, player:play)
  useEffect(() => {
    if (parsed?.type !== "rutube" || !parsed.embedUrl) return;

    const container = embedContainerRef.current;
    if (!container) return;

    const iframe = document.createElement("iframe");
    iframe.src = parsed.embedUrl;
    iframe.allow = "autoplay; fullscreen";
    iframe.allowFullscreen = true;
    iframe.className = "absolute inset-0 w-full h-full";
    iframe.title = "Видео Rutube";
    container.innerHTML = "";
    container.appendChild(iframe);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let lastCurrentTime = 0;
    let isPlaying = false;

    const postToPlayer = (type: string, data: Record<string, unknown> = {}) => {
      iframe.contentWindow?.postMessage(JSON.stringify({ type, data }), "*");
    };

    embedPlayerRef.current = {
      seekTo: (t: number) => postToPlayer("player:setCurrentTime", { time: t }),
      play: () => postToPlayer("player:play"),
    };

    const handleMessage = (event: MessageEvent) => {
      if (!/^https:\/\/[\w.-]*rutube\.ru$/i.test(event.origin || "")) return;
      try {
        const raw = event.data;
        const msg = typeof raw === "string"
          ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
          : (typeof raw === "object" && raw ? raw : {});
        if (msg.type === "player:currentTime" && typeof msg.data?.time === "number") {
          lastCurrentTime = msg.data.time;
          isPlaying = true;
        }
        if (msg.type === "player:changeState") {
          isPlaying = msg.data?.state === "playing";
        }
        if (msg.type === "player:ready") {
          isPlaying = false;
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("message", handleMessage);

    if (pausePoints.length > 0) {
      intervalId = setInterval(() => {
        if (!isPlaying) return;
        const bp = blockProgressRef.current;
        for (const pp of pausePoints) {
          const blockId = `${videoBlockId}::${pp.id}`;
          if (bp[blockId]?.status === "completed") continue;
          if (lastCurrentTime >= pp.timestamp - 0.5) {
            if (intervalId) clearInterval(intervalId);
            intervalId = null;
            postToPlayer("player:pause");
            setActivePause({ pp, blockId });
            return;
          }
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("message", handleMessage);
      embedPlayerRef.current = null;
    };
  }, [parsed?.type, parsed?.embedUrl, pausePoints, videoBlockId]);

  // VK Video: embed + таймер (пользователь нажимает «Старт» при начале воспроизведения)
  useEffect(() => {
    if (parsed?.type !== "vk" || !parsed.embedUrl) return;

    const container = embedContainerRef.current;
    if (!container) return;

    const iframe = document.createElement("iframe");
    iframe.src = parsed.embedUrl;
    iframe.allow = "encrypted-media; fullscreen";
    iframe.allowFullscreen = true;
    iframe.className = "absolute inset-0 w-full h-full";
    iframe.title = "Видео VK";
    container.innerHTML = "";
    container.appendChild(iframe);

    embedPlayerRef.current = null;

    return () => {
      embedPlayerRef.current = null;
    };
  }, [parsed?.type, parsed?.embedUrl]);

  // VK Video: таймер для пауз (запускается при нажатии «Старт»)
  useEffect(() => {
    if (parsed?.type !== "vk" || pausePoints.length === 0 || !vkTimerStarted) return;

    const startTime = vkTimerStartRef.current ?? Date.now();
    vkTimerStartRef.current = startTime;

    const intervalId = setInterval(() => {
      if (vkShowingQuestionRef.current) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const bp = blockProgressRef.current;
      for (const pp of pausePoints) {
        const blockId = `${videoBlockId}::${pp.id}`;
        if (bp[blockId]?.status === "completed") continue;
        if (elapsed >= pp.timestamp - 0.5) {
          vkShowingQuestionRef.current = true;
          setActivePause({ pp, blockId });
          return;
        }
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [parsed?.type, pausePoints, videoBlockId, vkTimerStarted]);

  // Паузы для Vimeo
  useEffect(() => {
    if (parsed?.type !== "vimeo" || !parsed.embedUrl || pausePoints.length === 0) return;

    const container = embedContainerRef.current;
    if (!container) return;

    let player: { getCurrentTime: () => Promise<number>; pause: () => Promise<void>; setCurrentTime: (t: number) => Promise<void>; destroy: () => void } | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const iframe = document.createElement("iframe");
    iframe.src = parsed.embedUrl;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.className = "absolute inset-0 w-full h-full";
    iframe.title = "Видео";
    container.innerHTML = "";
    container.appendChild(iframe);

    function loadVimeoPlayer() {
      const Vimeo = (window as unknown as { Vimeo?: { Player: new (el: HTMLIFrameElement) => typeof player } }).Vimeo;
      if (!Vimeo) return;
      player = new Vimeo.Player(iframe) as typeof player & { play: () => Promise<void> };
      embedPlayerRef.current = {
        seekTo: (t: number) => player!.setCurrentTime(t),
        play: () => player!.play(),
      };
      player.on("play", () => {
        intervalId = setInterval(async () => {
          if (!player) return;
          try {
            const t = await player.getCurrentTime();
            const bp = blockProgressRef.current;
            for (const pp of pausePoints) {
              const blockId = `${videoBlockId}::${pp.id}`;
              if (bp[blockId]?.status === "completed") continue;
              if (t >= pp.timestamp - 0.5) {
                if (intervalId) clearInterval(intervalId);
                intervalId = null;
                await player.pause();
                setActivePause({ pp, blockId });
                return;
              }
            }
          } catch {
            // ignore
          }
        }, 500);
      });
    }

    if ((window as unknown as { Vimeo?: unknown }).Vimeo) {
      loadVimeoPlayer();
    } else {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.onload = loadVimeoPlayer;
      document.head.appendChild(script);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (player?.destroy) player.destroy();
      embedPlayerRef.current = null;
    };
  }, [parsed?.type, parsed?.embedUrl, pausePoints, videoBlockId]);

  function toggleChoice(id: string, multiple: boolean) {
    if (multiple) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSelected([id]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activePause) return;
    setLoading(true);
    try {
      const res = await checkLectureBlockAnswer(lectureId, activePause.blockId, selected);
      setResult(res);
      if (res.passed) {
        toast({ title: "Правильно!", description: res.message });
        onCorrectAnswer?.(activePause.blockId);
        if (parsed?.type === "vk" || parsed?.type === "rutube") {
          vkShowingQuestionRef.current = false;
        }
        if (parsed?.type !== "vk") {
          const seekTime = activePause.pp.timestamp + 1;
          const video = videoRef.current;
          const embedPlayer = embedPlayerRef.current;
          if (video) {
            video.currentTime = seekTime;
            video.play();
          } else if (embedPlayer) {
            if ("playVideo" in embedPlayer && typeof (embedPlayer as YTPlayer).playVideo === "function") {
              (embedPlayer as YTPlayer).seekTo(seekTime, true);
              (embedPlayer as YTPlayer).playVideo();
            } else if ("play" in embedPlayer && typeof (embedPlayer as { play: () => void }).play === "function") {
              (embedPlayer as { seekTo: (t: number) => void; play: () => void }).seekTo(seekTime);
              (embedPlayer as { seekTo: (t: number) => void; play: () => void }).play();
            }
          }
        }
        setActivePause(null);
        setSelected([]);
        setResult(null);
        router.refresh();
      }
    } catch (err) {
      toast({ title: "Ошибка", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!block.url?.trim()) return null;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Видео</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            {parsed?.type === "youtube" || parsed?.type === "vimeo" || parsed?.type === "rutube" || parsed?.type === "vk" ? (
              <div ref={embedContainerRef} className="absolute inset-0 w-full h-full" />
            ) : (
              <video
                ref={videoRef}
                src={isM3u8 ? undefined : playbackUrl}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
              />
            )}
            {parsed?.type === "vk" && pausePoints.length > 0 && !vkTimerStarted && !activePause && (
              <div className="absolute inset-0 flex items-start justify-center z-10 pointer-events-none">
                <div className="pointer-events-auto mt-4 mx-4 bg-background/95 rounded-xl px-6 py-4 flex flex-col items-center gap-3 border shadow-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Запустите видео, затем нажмите «Старт» (VK не поддерживает чтение времени)
                  </p>
                  <Button
                    size="lg"
                    onClick={() => {
                      vkTimerStartRef.current = Date.now();
                      setVkTimerStarted(true);
                    }}
                  >
                    Старт
                  </Button>
                </div>
              </div>
            )}
            {activePause && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
                <Card className="max-w-md w-full border-2 border-primary/30 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{activePause.pp.question.title}</CardTitle>
                    {activePause.pp.question.prompt?.trim() && (
                      <CardDescription>{activePause.pp.question.prompt}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Ответьте на вопрос, чтобы продолжить просмотр
                      </p>
                      <div className="space-y-2">
                        {activePause.pp.question.choices.map((c) => (
                          <div
                            key={c.id}
                            className={`rounded-lg p-3 border cursor-pointer select-none text-sm transition-colors ${
                              selected.includes(c.id)
                                ? "bg-accent text-accent-foreground border-transparent"
                                : "bg-muted/50 hover:bg-muted border-border/60"
                            }`}
                            onClick={() => toggleChoice(c.id, activePause.pp.question.multiple)}
                          >
                            {c.text}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button type="submit" size="sm" disabled={selected.length === 0 || loading}>
                          {loading ? "Проверка..." : "Проверить"}
                        </Button>
                        {result && !result.passed && (
                          <span className="text-red-600 text-sm py-2">{result.message}</span>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          {pausePoints.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {parsed?.type === "vk" ? (
                <>Вопросы по таймеру: нажмите «Старт» при начале воспроизведения. {pausePoints.length} {pausePoints.length === 1 ? "таймкод" : "таймкодов"}.</>
              ) : (
                <>Просмотр с паузами для вопросов: {pausePoints.length} {pausePoints.length === 1 ? "таймкод" : "таймкодов"}</>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
