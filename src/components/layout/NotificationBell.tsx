"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
};

export default function NotificationBell({
  open,
  onToggle,
  onClose,
}: {
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isOpen = open ?? internalOpen;

  async function load() {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setItems(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } else {
        setLoadError("Could not load notifications");
      }
    } catch {
      setLoadError("Could not load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60000);
    return () => clearInterval(id);
  }, [isOpen]);

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (!res.ok) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
    if (!res.ok) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
  }

  const hasUnread = unreadCount > 0;
  const panelTitle = useMemo(() => `Notifications (${unreadCount})`, [unreadCount]);

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
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[360px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-2">
            <h3 className="text-sm font-semibold text-default">{panelTitle}</h3>
            <button
              onClick={markAllRead}
              className="text-xs text-brand hover:underline disabled:opacity-50"
              disabled={!hasUnread}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-3 py-4 text-xs text-dim">Loading...</p>}
            {!loading && loadError && <p className="px-3 py-4 text-xs text-red-400">{loadError}</p>}
            {!loading && items.length === 0 && (
              <p className="px-3 py-4 text-xs text-dim">No notifications yet.</p>
            )}

            {!loading &&
              items.map((n) => {
                const href = n.project?.id && n.task?.id ? `/projects/${n.project.id}` : n.project?.id ? `/projects/${n.project.id}` : "/dashboard";
                return (
                  <div
                    key={n.id}
                    className={`border-b border-[hsl(var(--border))] px-3 py-3 ${n.readAt ? "bg-transparent" : "bg-[hsl(var(--primary-soft)/0.35)]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-default">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                        {n.task?.title && (
                          <p className="mt-1 truncate text-[11px] text-dim">Task: {n.task.title}</p>
                        )}
                        {n.project?.name && (
                          <p className="truncate text-[11px] text-dim">Project: {n.project.name}</p>
                        )}
                      </div>
                      {!n.readAt && (
                        <button onClick={() => markRead(n.id)} className="text-[11px] text-brand hover:underline">
                          Read
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-dim">{new Date(n.createdAt).toLocaleString()}</span>
                      <Link href={href} onClick={closePanel} className="text-[11px] text-brand hover:underline">
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
