"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from "lucide-react";

type ToastKind = "success" | "error" | "info";

export type ToastOptions = {
  kind?: ToastKind;
  message: string;
  description?: string;
  durationMs?: number;
  action?: { label: string; onClick: () => void | Promise<void>; closeAfter?: boolean };
};

type ToastItem = Required<Pick<ToastOptions, "message">> &
  ToastOptions & {
    id: string;
    createdAt: number;
  };

type ToastCtx = {
  show: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (opts: ToastOptions) => {
      const id = Math.random().toString(36).slice(2);
      const item: ToastItem = {
        id,
        createdAt: Date.now(),
        kind: opts.kind ?? "info",
        durationMs: opts.durationMs ?? 5000,
        ...opts,
      };
      setItems((prev) => [...prev, item]);
      return id;
    },
    []
  );

  return (
    <Ctx.Provider value={{ show, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!item.durationMs) return;
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 180);
    }, item.durationMs);
    return () => clearTimeout(t);
  }, [item.durationMs, onDismiss]);

  const Icon =
    item.kind === "success" ? CheckCircle2 : item.kind === "error" ? AlertCircle : Info;
  const iconColor =
    item.kind === "success"
      ? "text-green-400"
      : item.kind === "error"
      ? "text-red-400"
      : "text-brand";

  async function handleAction() {
    if (!item.action) return;
    await item.action.onClick();
    if (item.action.closeAfter !== false) onDismiss();
  }

  return (
    <div
      role="status"
      className={
        "card pointer-events-auto flex items-start gap-3 p-3 shadow-lg transition-all duration-150 " +
        (leaving ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0")
      }
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-default">{item.message}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted">{item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {item.action && (
          <button
            onClick={handleAction}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-[hsl(var(--primary-soft))]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {item.action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded p-1 text-dim hover:bg-[hsl(var(--surface-2))] hover:text-default"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}
