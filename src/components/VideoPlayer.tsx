"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Play,
  X,
  Maximize2,
  Volume2,
  VolumeX,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Link2,
  Tv2,
  Loader2,
  GripVertical,
  CheckCircle,
} from "lucide-react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/* ── Types ── */

export type MediaType =
  | "youtube"
  | "twitch-stream"
  | "twitch-vod"
  | "twitch-clip"
  | "vimeo"
  | "html5-video"
  | "iframe"
  | "unknown";

export interface PlayerState {
  id: string;
  source: string;
  muted: boolean;
}

interface ParsedMedia {
  type: MediaType;
  embedUrl: string;
  displayUrl: string;
}

/* ── URL Detection ── */

function detectMediaType(rawInput: string): ParsedMedia | null {
  const input = rawInput.trim();
  if (!input) return null;

  if (input.toLowerCase().startsWith("<iframe")) {
    return { type: "iframe", embedUrl: input, displayUrl: "Custom embed" };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");
  const pathname = url.pathname;

  // YouTube
  if (hostname === "youtube.com" || hostname === "youtu.be") {
    let videoId: string | null = null;
    if (hostname === "youtu.be") {
      videoId = pathname.slice(1).split("/")[0] ?? null;
    } else if (pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (pathname.startsWith("/embed/")) {
      videoId = pathname.split("/embed/")[1]?.split("/")[0] ?? null;
    } else if (pathname.startsWith("/shorts/")) {
      videoId = pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
    } else if (pathname.startsWith("/live/")) {
      videoId = pathname.split("/live/")[1]?.split("/")[0] ?? null;
    }
    if (videoId && /^[a-zA-Z0-9_-]{8,14}$/.test(videoId)) {
      const params = new URLSearchParams({
        autoplay: "1",
        enablejsapi: "1",
        origin: typeof window !== "undefined" ? window.location.origin : "",
        rel: "0",
        modestbranding: "1",
      });
      const t = url.searchParams.get("t") ?? url.searchParams.get("start");
      if (t) params.set("start", t.replace("s", ""));
      return {
        type: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`,
        displayUrl: `youtube.com/watch?v=${videoId}`,
      };
    }
  }

  // Twitch
  if (hostname === "twitch.tv" || hostname === "clips.twitch.tv") {
    const parent =
      typeof window !== "undefined" ? window.location.hostname : "localhost";
    if (hostname === "clips.twitch.tv") {
      const slug = pathname.slice(1);
      if (slug) {
        return {
          type: "twitch-clip",
          embedUrl: `https://clips.twitch.tv/embed?clip=${slug}&parent=${parent}&autoplay=true&muted=false`,
          displayUrl: `clips.twitch.tv/${slug}`,
        };
      }
    }
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 1 && parts[0]) {
      return {
        type: "twitch-stream",
        embedUrl: `https://player.twitch.tv/?channel=${parts[0]}&parent=${parent}&autoplay=true&muted=false`,
        displayUrl: `twitch.tv/${parts[0]}`,
      };
    }
    if (parts[1] === "clip" && parts[2]) {
      return {
        type: "twitch-clip",
        embedUrl: `https://clips.twitch.tv/embed?clip=${parts[2]}&parent=${parent}&autoplay=true&muted=false`,
        displayUrl: `twitch.tv/${parts[0] ?? ""}/clip/${parts[2]}`,
      };
    }
    if (parts[1] === "videos" && parts[2]) {
      return {
        type: "twitch-vod",
        embedUrl: `https://player.twitch.tv/?video=${parts[2]}&parent=${parent}&autoplay=true&muted=false`,
        displayUrl: `twitch.tv/videos/${parts[2]}`,
      };
    }
  }

  // Vimeo
  if (hostname === "vimeo.com" || hostname === "player.vimeo.com") {
    const parts = pathname.split("/").filter(Boolean);
    let videoId: string | null = null;
    if (hostname === "player.vimeo.com" && parts[0] === "video") {
      videoId = parts[1] ?? null;
    } else {
      const last = parts[parts.length - 1];
      if (last && /^\d+$/.test(last)) videoId = last;
    }
    if (videoId) {
      return {
        type: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&color=7c6af7&byline=0&portrait=0`,
        displayUrl: `vimeo.com/${videoId}`,
      };
    }
  }

  // HTML5 video extensions
  const videoExts = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v", ".m3u8"];
  const lowerPath = pathname.toLowerCase();
  if (videoExts.some((ext) => lowerPath.endsWith(ext))) {
    return {
      type: "html5-video",
      embedUrl: input,
      displayUrl:
        url.hostname +
        pathname.slice(0, 30) +
        (pathname.length > 30 ? "…" : ""),
    };
  }

  return null;
}

/* ── Iframe sanitizer ── */

function sanitizeIframe(rawHtml: string): string {
  if (typeof window === "undefined") return "";
  const safeAttrs = [
    "src","width","height","frameborder","allowfullscreen",
    "allow","title","loading","referrerpolicy",
  ];
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const iframes = doc.querySelectorAll("iframe");
  if (iframes.length === 0) return "";
  const iframe = iframes[0];

  // Remove non-safe attributes
  Array.from(iframe.attributes).forEach((attr) => {
    if (!safeAttrs.includes(attr.name.toLowerCase())) {
      iframe.removeAttribute(attr.name);
    }
  });

  // Validate src
  const src = iframe.getAttribute("src") ?? "";
  if (!src) return "";
  try {
    const u = new URL(src);
    if (!["https:", "http:"].includes(u.protocol)) return "";
    if (src.toLowerCase().includes("javascript:")) return "";
  } catch {
    return "";
  }

  // Remove event handlers
  Array.from(iframe.attributes).forEach((attr) => {
    if (attr.name.toLowerCase().startsWith("on")) iframe.removeAttribute(attr.name);
  });

  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
  );
  iframe.setAttribute("loading", "lazy");
  iframe.style.cssText = "width:100%;height:100%;border:none;";

  return iframe.outerHTML;
}

/* ── Provider meta ── */

const PROVIDER_LABELS: Record<MediaType, string> = {
  youtube: "YouTube",
  "twitch-stream": "Twitch Live",
  "twitch-vod": "Twitch VOD",
  "twitch-clip": "Twitch Clip",
  vimeo: "Vimeo",
  "html5-video": "Direct Video",
  iframe: "Custom Embed",
  unknown: "Unknown",
};

const PROVIDER_COLORS: Record<MediaType, string> = {
  youtube: "bg-red-500/15 text-red-400 border-red-500/20",
  "twitch-stream": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "twitch-vod": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "twitch-clip": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  vimeo: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  "html5-video": "bg-green-500/15 text-green-400 border-green-500/20",
  iframe: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  unknown: "bg-surface-hover text-text-muted border-border",
};

/* ── Sub-components ── */

function PlayerPlaceholder({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-border flex items-center justify-center">
        <Tv2 size={28} className="text-text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-secondary mb-1">
          No source loaded
        </p>
        <p className="text-xs text-text-muted leading-relaxed max-w-[180px]">
          Paste a YouTube, Twitch, Vimeo, or video URL below
        </p>
      </div>
      <button
        onClick={onActivate}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent-bright text-sm font-medium transition-all border border-accent/20"
      >
        <Play size={14} />
        Add Stream
      </button>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-card/80 backdrop-blur-sm rounded-xl z-10">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="text-accent-bright animate-spin" />
        <p className="text-xs text-text-muted">Loading stream…</p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  onClear,
}: {
  message: string;
  onRetry: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary mb-1">
          Unable to load
        </p>
        <p className="text-xs text-text-muted leading-relaxed max-w-[200px]">
          {message}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-card text-text-secondary text-xs font-medium transition-all border border-border"
        >
          <RefreshCw size={12} />
          Retry
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all border border-red-500/20"
        >
          <X size={12} />
          Clear
        </button>
      </div>
    </div>
  );
}

/* ── VideoPlayer ── */

interface VideoPlayerProps {
  player: PlayerState;
  index: number;
  onSourceChange: (id: string, source: string) => void;
  onMuteChange: (id: string, muted: boolean) => void;
  onClear: (id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export default function VideoPlayer({
  player,
  index,
  onSourceChange,
  onMuteChange,
  onClear,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: VideoPlayerProps) {
  const [inputValue, setInputValue] = useState(player.source);
  const [showControls, setShowControls] = useState(!player.source);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [sanitizedHtml, setSanitizedHtml] = useState("");
  const [isValid, setIsValid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!player.source) return null;
    return detectMediaType(player.source);
  }, [player.source]);

  useEffect(() => {
    const v = inputValue.trim();
    if (!v) { setIsValid(false); return; }
    if (v.toLowerCase().startsWith("<iframe")) { setIsValid(true); return; }
    try { new URL(v); setIsValid(true); } catch { setIsValid(false); }
  }, [inputValue]);

  useEffect(() => {
    if (parsed?.type === "iframe") {
      const safe = sanitizeIframe(parsed.embedUrl);
      setSanitizedHtml(safe);
      if (!safe) {
        setHasError(true);
        setErrorMessage("This embed was blocked for security reasons. Only safe iframes are permitted.");
      }
    }
  }, [parsed, reloadKey]);

  useEffect(() => {
    setHasError(false);
    setErrorMessage("");
    setIsLoading(!!player.source && !!parsed);
  }, [player.source, parsed, reloadKey]);

  useEffect(() => {
    setInputValue(player.source);
  }, [player.source]);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(
      "This video could not be loaded. The URL may be invalid, the content removed, or embedding may not be permitted by the provider."
    );
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      onSourceChange(player.id, trimmed);
      setShowControls(false);
      setReloadKey((k) => k + 1);
    },
    [inputValue, player.id, onSourceChange]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onSourceChange(player.id, "");
    onClear(player.id);
    setShowControls(true);
    setHasError(false);
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [player.id, onSourceChange, onClear]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch { /* fullscreen denied */ }
  }, []);

  const handleMuteToggle = useCallback(() => {
    onMuteChange(player.id, !player.muted);
    if (videoRef.current) videoRef.current.muted = !player.muted;
  }, [player.id, player.muted, onMuteChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") setShowControls(false);
    },
    [handleSubmit]
  );

  const renderMedia = useCallback(() => {
    if (!parsed || !player.source) return null;

    if (parsed.type === "html5-video") {
      return (
        <video
          key={`${player.source}-${reloadKey}`}
          ref={videoRef}
          src={parsed.embedUrl}
          autoPlay
          muted={player.muted}
          controls
          playsInline
          className="w-full h-full object-contain"
          onLoadedData={handleLoadedData}
          onCanPlay={handleLoadedData}
          onError={handleError}
          aria-label={`Video player ${index + 1}`}
        />
      );
    }

    if (parsed.type === "iframe") {
      if (!sanitizedHtml) return null;
      return (
        <div
          key={`iframe-${reloadKey}`}
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          aria-label={`Embedded player ${index + 1}`}
        />
      );
    }

    return (
      <iframe
        key={`${parsed.embedUrl}-${reloadKey}`}
        src={parsed.embedUrl}
        title={`${PROVIDER_LABELS[parsed.type]} player ${index + 1}`}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        loading="lazy"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        onLoad={handleIframeLoad}
        onError={handleError}
      />
    );
  }, [parsed, player.source, player.muted, reloadKey, sanitizedHtml, index, handleLoadedData, handleError, handleIframeLoad]);

  const displayUrl = parsed
    ? parsed.displayUrl
    : player.source
    ? player.source.slice(0, 28) + (player.source.length > 28 ? "…" : "")
    : "No source";

  return (
    <div
      ref={containerRef}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={cn(
        "relative flex flex-col rounded-2xl overflow-hidden h-full",
        "border transition-all duration-200 bg-surface-card shadow-glass",
        isDragOver ? "drag-over scale-[1.01]" : "border-border",
        isDragging && "dragging"
      )}
      role="region"
      aria-label={`Player ${index + 1}`}
    >
      {/* Player area */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        {/* Drag hint */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
          aria-hidden="true"
        >
          <div className="glass rounded-lg px-2 py-0.5 flex items-center gap-1 opacity-30">
            <GripVertical size={10} className="text-text-muted" />
          </div>
        </div>

        {/* Top-right overlay controls */}
        {player.source && !hasError && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={handleMuteToggle}
              className="w-7 h-7 flex items-center justify-center rounded-lg glass border hover:border-border-bright transition-all"
              aria-label={player.muted ? "Unmute" : "Mute"}
            >
              {player.muted ? (
                <VolumeX size={13} className="text-text-secondary" />
              ) : (
                <Volume2 size={13} className="text-text-secondary" />
              )}
            </button>
            <button
              onClick={handleRetry}
              className="w-7 h-7 flex items-center justify-center rounded-lg glass border hover:border-border-bright transition-all"
              aria-label="Reload player"
            >
              <RefreshCw size={13} className="text-text-secondary" />
            </button>
            <button
              onClick={handleFullscreen}
              className="w-7 h-7 flex items-center justify-center rounded-lg glass border hover:border-border-bright transition-all"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 size={13} className="text-text-secondary" />
            </button>
            <button
              onClick={handleClear}
              className="w-7 h-7 flex items-center justify-center rounded-lg glass border border-red-500/20 hover:bg-red-500/15 transition-all"
              aria-label="Clear player"
            >
              <X size={13} className="text-red-400" />
            </button>
          </div>
        )}

        {/* Provider badge */}
        {parsed && !hasError && player.source && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md border",
                PROVIDER_COLORS[parsed.type]
              )}
            >
              {PROVIDER_LABELS[parsed.type]}
            </span>
          </div>
        )}

        {/* Media */}
        {player.source && !hasError && (
          <div className="absolute inset-0">{renderMedia()}</div>
        )}

        {/* Loading */}
        {isLoading && player.source && !hasError && <LoadingOverlay />}

        {/* Error */}
        {hasError && (
          <ErrorState message={errorMessage} onRetry={handleRetry} onClear={handleClear} />
        )}

        {/* Placeholder */}
        {!player.source && !hasError && (
          <PlayerPlaceholder onActivate={() => setShowControls(true)} />
        )}

        {/* Index badge */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <span className="text-xs font-semibold text-text-muted bg-black/40 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            {index + 1}
          </span>
        </div>
      </div>

      {/* Control toggle bar */}
      <button
        onClick={() => setShowControls(!showControls)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 flex-shrink-0",
          "text-xs text-text-muted hover:text-text-secondary",
          "bg-surface-card hover:bg-surface-hover transition-all",
          "border-t border-border",
          showControls && "border-b border-border"
        )}
        aria-expanded={showControls}
        aria-controls={`player-controls-${player.id}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Link2 size={11} className="flex-shrink-0" />
          <span className="truncate max-w-[140px]">{displayUrl}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {player.source && !hasError && (
            <CheckCircle size={10} className="text-green-400" />
          )}
          {showControls ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {/* Input panel */}
      {showControls && (
        <div
          id={`player-controls-${player.id}`}
          className="p-3 bg-surface-card space-y-2 animate-slide-down flex-shrink-0"
        >
          <form
            onSubmit={handleSubmit}
            className="flex gap-2"
            aria-label={`Player ${index + 1} source input`}
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="YouTube, Twitch, Vimeo URL, or embed code…"
                className={cn(
                  "w-full bg-surface border rounded-lg px-3 py-1.5 pr-7",
                  "text-xs text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all",
                  inputValue && isValid
                    ? "border-green-500/30"
                    : inputValue && !isValid
                    ? "border-red-500/30"
                    : "border-border hover:border-border-bright"
                )}
                aria-label={`Video URL for player ${index + 1}`}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  aria-label="Clear input"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!isValid}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0",
                isValid
                  ? "bg-accent hover:bg-accent/90 text-white shadow-accent"
                  : "bg-surface-hover text-text-muted cursor-not-allowed"
              )}
            >
              <Play size={11} />
              Load
            </button>
          </form>

          {player.source && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleMuteToggle}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-text-secondary text-xs transition-all"
              >
                {player.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                {player.muted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-text-secondary text-xs transition-all"
              >
                <RefreshCw size={10} />
                Reload
              </button>
              <button
                onClick={handleFullscreen}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-text-secondary text-xs transition-all"
              >
                <Maximize2 size={10} />
                Full
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition-all ml-auto"
              >
                <X size={10} />
                Clear
              </button>
            </div>
          )}

          <p className="text-[10px] text-text-muted">
            Supports YouTube · Twitch · Vimeo · MP4 · WebM · HLS · iframe embeds
          </p>
        </div>
      )}
    </div>
  );
}
