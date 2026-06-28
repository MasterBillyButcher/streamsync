"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Tv2,
  Share2,
  Download,
  Upload,
  Check,
  X,
  ChevronDown,
  Copy,
  Plus,
  Minus,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface NavbarProps {
  playerCount: number;
  onPlayerCountChange: (count: number) => void;
  onShareParty: () => string;
  onExportConfig: () => string;
  onImportConfig: (json: string) => boolean;
  maxPlayers?: number;
  minPlayers?: number;
}

function ToastNotification({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 2700);
    const removeTimer = setTimeout(() => onRemove(toast.id), 3000);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-glass-lg",
        "glass-strong border min-w-[240px] max-w-[360px]",
        exiting ? "animate-toast-out" : "animate-toast-in",
        toast.type === "success" && "border-green-500/20",
        toast.type === "error" && "border-red-500/20",
        toast.type === "info" && "border-accent/20"
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
          toast.type === "success" && "bg-green-500/15 text-green-400",
          toast.type === "error" && "bg-red-500/15 text-red-400",
          toast.type === "info" && "bg-accent/15 text-accent-bright"
        )}
      >
        {toast.type === "success" && <Check size={14} />}
        {toast.type === "error" && <X size={14} />}
        {toast.type === "info" && <Share2 size={14} />}
      </div>
      <span className="text-sm font-medium text-text-primary flex-1">
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-text-muted hover:text-text-secondary transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (json: string) => boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(() => {
    setError(null);
    if (!value.trim()) {
      setError("Paste your configuration JSON above.");
      return;
    }
    const success = onImport(value.trim());
    if (success) {
      onClose();
    } else {
      setError(
        "Invalid configuration format. Please check your JSON and try again."
      );
    }
  }, [value, onImport, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import configuration"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative glass-strong rounded-2xl shadow-glass-lg w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Upload size={16} className="text-accent-bright" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Import Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label
              htmlFor="import-json"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Paste JSON configuration
            </label>
            <textarea
              id="import-json"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder='{"playerCount":2,"players":[...]}'
              rows={8}
              className={cn(
                "w-full bg-surface border rounded-xl px-4 py-3",
                "text-sm text-text-primary placeholder:text-text-muted",
                "resize-none font-mono",
                "focus:outline-none focus:ring-2 focus:ring-accent/40",
                "transition-all",
                error
                  ? "border-red-500/40"
                  : "border-border hover:border-border-bright"
              )}
              aria-describedby={error ? "import-error" : undefined}
            />
            {error && (
              <p
                id="import-error"
                className="mt-2 text-sm text-red-400 flex items-center gap-1.5"
              >
                <X size={12} />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              className={cn(
                "flex-1 flex items-center justify-center gap-2",
                "bg-accent hover:bg-accent/90 text-white",
                "px-4 py-2.5 rounded-xl text-sm font-semibold",
                "transition-all shadow-accent"
              )}
            >
              <Upload size={15} />
              Import
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 bg-surface-hover hover:bg-surface-card text-text-secondary px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-border"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Navbar({
  playerCount,
  onPlayerCountChange,
  onShareParty,
  onExportConfig,
  onImportConfig,
  maxPlayers = 12,
  minPlayers = 1,
}: NavbarProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleShareParty = useCallback(async () => {
    const url = onShareParty();
    try {
      await navigator.clipboard.writeText(url);
      addToast("Party link copied to clipboard!", "success");
    } catch {
      addToast("Could not copy — check clipboard permissions.", "error");
    }
    setShowActionsMenu(false);
  }, [onShareParty, addToast]);

  const handleExportConfig = useCallback(async () => {
    const json = onExportConfig();
    try {
      await navigator.clipboard.writeText(json);
      addToast("Configuration copied to clipboard!", "success");
    } catch {
      addToast("Could not copy — check clipboard permissions.", "error");
    }
    setShowActionsMenu(false);
  }, [onExportConfig, addToast]);

  const handleImportConfig = useCallback(
    (json: string) => {
      const success = onImportConfig(json);
      if (success) {
        addToast("Configuration imported successfully!", "success");
      } else {
        addToast("Invalid configuration format.", "error");
      }
      return success;
    },
    [onImportConfig, addToast]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-player-menu]")) setShowPlayerMenu(false);
      if (!target.closest("[data-actions-menu]")) setShowActionsMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const playerCounts = Array.from(
    { length: maxPlayers - minPlayers + 1 },
    (_, i) => i + minPlayers
  );

  return (
    <>
      <nav
        className="glass-navbar sticky top-0 z-40 w-full"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-bright/60 flex items-center justify-center shadow-accent">
              <Tv2 size={16} className="text-white" />
            </div>
            <span className="text-base font-bold gradient-text hidden sm:block tracking-tight">
              StreamSync
            </span>
          </div>

          {/* Center: player count selector */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="relative" data-player-menu>
              <button
                onClick={() => setShowPlayerMenu(!showPlayerMenu)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl",
                  "glass border transition-all text-sm font-medium",
                  "hover:border-border-bright hover:bg-surface-hover",
                  showPlayerMenu && "border-accent/40 bg-accent/10"
                )}
                aria-label={`${playerCount} players active. Change player count`}
                aria-expanded={showPlayerMenu}
                aria-haspopup="listbox"
              >
                <Users size={14} className="text-accent-bright" />
                <span className="text-text-primary">{playerCount}</span>
                <span className="text-text-muted text-xs hidden sm:block">
                  {playerCount === 1 ? "player" : "players"}
                </span>
                <ChevronDown
                  size={13}
                  className={cn(
                    "text-text-muted transition-transform",
                    showPlayerMenu && "rotate-180"
                  )}
                />
              </button>

              {showPlayerMenu && (
                <div
                  className="absolute top-full left-0 mt-2 p-2 rounded-xl glass-strong shadow-glass-lg border border-border-bright z-50 animate-slide-down"
                  role="listbox"
                  aria-label="Select player count"
                >
                  <div className="grid grid-cols-4 gap-1">
                    {playerCounts.map((count) => (
                      <button
                        key={count}
                        role="option"
                        aria-selected={count === playerCount}
                        onClick={() => {
                          onPlayerCountChange(count);
                          setShowPlayerMenu(false);
                        }}
                        className={cn(
                          "w-9 h-9 rounded-lg text-sm font-semibold transition-all",
                          count === playerCount
                            ? "bg-accent text-white shadow-accent"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <button
                      onClick={() =>
                        onPlayerCountChange(Math.max(minPlayers, playerCount - 1))
                      }
                      disabled={playerCount <= minPlayers}
                      className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Remove one player"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={() =>
                        onPlayerCountChange(Math.min(maxPlayers, playerCount + 1))
                      }
                      disabled={playerCount >= maxPlayers}
                      className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Add one player"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleShareParty}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl",
                "bg-accent hover:bg-accent/90 text-white",
                "text-sm font-semibold transition-all shadow-accent"
              )}
              aria-label="Copy party share link"
            >
              <Share2 size={14} />
              <span className="hidden sm:block">Share Party</span>
            </button>

            <div className="relative" data-actions-menu>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-xl",
                  "glass border transition-all",
                  "hover:border-border-bright hover:bg-surface-hover",
                  showActionsMenu && "border-accent/40 bg-accent/10"
                )}
                aria-label="More actions"
                aria-expanded={showActionsMenu}
                aria-haspopup="menu"
              >
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-text-secondary transition-transform",
                    showActionsMenu && "rotate-180"
                  )}
                />
              </button>

              {showActionsMenu && (
                <div
                  className="absolute top-full right-0 mt-2 w-52 rounded-xl glass-strong shadow-glass-lg border border-border-bright z-50 overflow-hidden animate-slide-down"
                  role="menu"
                >
                  <button
                    onClick={handleShareParty}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
                    role="menuitem"
                  >
                    <Copy size={14} className="text-accent-bright" />
                    Copy Share Link
                  </button>
                  <button
                    onClick={handleExportConfig}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
                    role="menuitem"
                  >
                    <Download size={14} className="text-accent-bright" />
                    Export Config (JSON)
                  </button>
                  <button
                    onClick={() => {
                      setShowImportModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
                    role="menuitem"
                  >
                    <Upload size={14} className="text-accent-bright" />
                    Import Config (JSON)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Toasts */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastNotification toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* Import modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportConfig}
        />
      )}
    </>
  );
}
