"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Navbar from "@/components/Navbar";
import VideoPlayer, { PlayerState } from "@/components/VideoPlayer";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { LayoutGrid, Sparkles } from "lucide-react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 12;
const STORAGE_KEY = "streamsync_session_v2";

interface SessionConfig {
  playerCount: number;
  players: PlayerState[];
  version: number;
}

interface GridLayout {
  cols: number;
  rows: number;
  colsClass: string;
  rowsClass: string;
}

function calculateGridLayout(count: number): GridLayout {
  if (count === 1) return { cols: 1, rows: 1, colsClass: "grid-cols-1", rowsClass: "grid-rows-1" };
  if (count === 2) return { cols: 2, rows: 1, colsClass: "grid-cols-2", rowsClass: "grid-rows-1" };
  if (count <= 4) return { cols: 2, rows: 2, colsClass: "grid-cols-2", rowsClass: "grid-rows-2" };
  if (count <= 6) return { cols: 3, rows: 2, colsClass: "grid-cols-3", rowsClass: "grid-rows-2" };
  if (count <= 9) return { cols: 3, rows: 3, colsClass: "grid-cols-3", rowsClass: "grid-rows-3" };
  return { cols: 4, rows: 3, colsClass: "grid-cols-4", rowsClass: "grid-rows-3" };
}

interface EncodedSession {
  c: number;
  p: Array<{ s: string; m?: 1 }>;
}

function encodeSession(playerCount: number, players: PlayerState[]): string {
  const data: EncodedSession = {
    c: playerCount,
    p: players.slice(0, playerCount).map((pl) => ({
      s: pl.source,
      ...(pl.muted ? { m: 1 as const } : {}),
    })),
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch {
    return "";
  }
}

function decodeSession(encoded: string): SessionConfig | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json) as EncodedSession;
    if (typeof data.c !== "number" || !Array.isArray(data.p)) return null;

    const playerCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.round(data.c)));
    const players: PlayerState[] = Array.from(
      { length: Math.max(playerCount, data.p.length) },
      (_, i) => ({
        id: `player-${i}`,
        source: (data.p[i]?.s ?? "").trim(),
        muted: data.p[i]?.m === 1,
      })
    ).slice(0, MAX_PLAYERS);

    return { playerCount, players, version: 2 };
  } catch {
    return null;
  }
}

function createDefaultPlayers(): PlayerState[] {
  return Array.from({ length: MAX_PLAYERS }, (_, i) => ({
    id: `player-${i}`,
    source: "",
    muted: false,
  }));
}

function loadFromStorage(): SessionConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionConfig;
    if (typeof parsed.playerCount !== "number" || !Array.isArray(parsed.players))
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(config: SessionConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* quota exceeded */ }
}

function mergeWithDefaults(incoming: PlayerState[]): PlayerState[] {
  const defaults = createDefaultPlayers();
  return defaults.map((def, i) => ({
    ...def,
    ...(incoming[i] ?? {}),
    id: def.id,
  }));
}

export default function WatchPartyPage() {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [players, setPlayers] = useState<PlayerState[]>(() => createDefaultPlayers());
  const [isHydrated, setIsHydrated] = useState(false);
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Hydration */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get("party");

    if (sharedData) {
      const session = decodeSession(sharedData);
      if (session) {
        setPlayerCount(session.playerCount);
        setPlayers(mergeWithDefaults(session.players));
        setIsHydrated(true);
        return;
      }
    }

    const saved = loadFromStorage();
    if (saved) {
      setPlayerCount(saved.playerCount);
      setPlayers(mergeWithDefaults(saved.players));
    }

    setIsHydrated(true);
  }, []);

  /* Persist */
  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToStorage({ playerCount, players, version: 2 });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [playerCount, players, isHydrated]);

  const layout = useMemo(() => calculateGridLayout(playerCount), [playerCount]);
  const activePlayers = useMemo(() => players.slice(0, playerCount), [players, playerCount]);

  /* Handlers */
  const handleSourceChange = useCallback((id: string, source: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, source } : p)));
  }, []);

  const handleMuteChange = useCallback((id: string, muted: boolean) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, muted } : p)));
  }, []);

  const handleClear = useCallback((id: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, source: "", muted: false } : p))
    );
  }, []);

  const handlePlayerCountChange = useCallback((count: number) => {
    setPlayerCount(Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, count)));
  }, []);

  /* Drag & drop */
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragSource(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragTarget(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      const srcIndex = dragSource;
      if (srcIndex === null || srcIndex === dropIndex) {
        setDragSource(null);
        setDragTarget(null);
        return;
      }
      setPlayers((prev) => {
        const next = [...prev];
        const [moved] = next.splice(srcIndex, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });
      setDragSource(null);
      setDragTarget(null);
    },
    [dragSource]
  );

  /* Share */
  const handleShareParty = useCallback((): string => {
    const encoded = encodeSession(playerCount, players);
    const url = new URL(window.location.href);
    url.searchParams.set("party", encoded);
    window.history.replaceState({}, "", url.toString());
    return url.toString();
  }, [playerCount, players]);

  /* Export */
  const handleExportConfig = useCallback((): string => {
    return JSON.stringify({ playerCount, players, version: 2 }, null, 2);
  }, [playerCount, players]);

  /* Import */
  const handleImportConfig = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as SessionConfig;
      if (typeof parsed.playerCount !== "number" || !Array.isArray(parsed.players))
        return false;
      const count = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, parsed.playerCount));
      const merged = mergeWithDefaults(
        parsed.players.map((src) => ({
          id: "",
          source: typeof src.source === "string" ? src.source : "",
          muted: typeof src.muted === "boolean" ? src.muted : false,
        }))
      );
      setPlayerCount(count);
      setPlayers(merged);
      return true;
    } catch {
      return false;
    }
  }, []);

  /* Loading state */
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-bright/60 flex items-center justify-center shadow-accent">
            <LayoutGrid size={22} className="text-white" />
          </div>
          <p className="text-sm text-text-muted">Loading StreamSync…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar
        playerCount={playerCount}
        onPlayerCountChange={handlePlayerCountChange}
        onShareParty={handleShareParty}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        maxPlayers={MAX_PLAYERS}
        minPlayers={MIN_PLAYERS}
      />

      <main
        className="flex-1 flex flex-col p-3 sm:p-4 min-h-0 overflow-hidden"
        role="main"
        aria-label="Watch party grid"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-accent-bright" />
            <span className="text-xs font-medium text-text-muted">
              {playerCount} {playerCount === 1 ? "stream" : "streams"} ·{" "}
              {layout.cols}×{layout.rows} layout
            </span>
          </div>
          <span className="text-xs text-text-muted hidden sm:block">
            Drag to reorder · Auto-saved
          </span>
        </div>

        {/* Grid */}
        <div
          className={cn(
            "grid gap-3 flex-1 min-h-0",
            layout.colsClass,
            layout.rowsClass
          )}
          role="grid"
          aria-label={`${playerCount} player grid`}
        >
          {activePlayers.map((player, index) => (
            <div
              key={player.id}
              className="min-h-0 min-w-0"
              role="gridcell"
              aria-label={`Player slot ${index + 1}`}
            >
              <VideoPlayer
                player={player}
                index={index}
                onSourceChange={handleSourceChange}
                onMuteChange={handleMuteChange}
                onClear={handleClear}
                isDragging={dragSource === index}
                isDragOver={dragTarget === index && dragSource !== index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            </div>
          ))}
        </div>

        {/* Empty state hint */}
        {activePlayers.every((p) => !p.source) && (
          <div className="flex items-center justify-center pt-3 flex-shrink-0">
            <div className="glass rounded-xl px-5 py-3 flex items-center gap-3 border border-border animate-fade-in">
              <Sparkles size={13} className="text-accent-bright flex-shrink-0" />
              <p className="text-xs text-text-secondary">
                Paste a stream URL into any player to get started. Hit{" "}
                <span className="text-accent-bright font-medium">Share Party</span>{" "}
                when you&apos;re ready to invite others.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
