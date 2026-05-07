"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

type MentionItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
};

export default function MentionBell({
  open,
  onToggle,
  onClose,
}: {
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [items, setItems] = useState<MentionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch("/api/mentions", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.mentions) {
        setLoadError("Could not load mentions");
        return;
      }
      setItems(data.mentions as MentionItem[]);
    } catch {
      setLoadError("Could not load mentions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isOpen = open ?? internalOpen;

  useEffect(() => {
    if (!isOpen) return;
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60000);
    return () => clearInterval(id);
  }, [isOpen]);

  const unread = items.filter((x) => !x.readAt).length;
  const title = useMemo(() => `Mentions (${unread})`, [unread]);

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (!res.ok) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  function toggleOpen() {
    if (onToggle) onToggle();
    else setInternalOpen((v) => !v);
  }

  function closePanel() {
    if (onClose) onClose();
    else setInternalOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative rounded p-2 text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default"
        title="Mentions"
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[360px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] shadow-2xl">
          <div className="border-b border-[hsl(var(--border))] px-3 py-2">
            <h3 className="text-sm font-semibold text-default">{title}</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-3 py-4 text-xs text-dim">Loading...</p>}
            {!loading && loadError && <p className="px-3 py-4 text-xs text-red-400">{loadError}</p>}
            {!loading && items.length === 0 && <p className="px-3 py-4 text-xs text-dim">No mentions yet.</p>}
            {!loading && items.map((m) => (
              <div key={m.id} className={`border-b border-[hsl(var(--border))] px-3 py-3 ${m.readAt ? "" : "bg-[hsl(var(--primary-soft)/0.35)]"}`}>
                <p className="text-xs font-semibold text-default">{m.title}</p>
                <p className="mt-0.5 text-xs text-muted">{m.message}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-dim">{new Date(m.createdAt).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    {!m.readAt && <button onClick={() => markRead(m.id)} className="text-[11px] text-brand hover:underline">Read</button>}
                    <Link href={m.project?.id ? `/projects/${m.project.id}` : "/dashboard"} onClick={closePanel} className="text-[11px] text-brand hover:underline">Open</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
