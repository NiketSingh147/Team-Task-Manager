"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sparkles, LayoutDashboard, FolderKanban, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import MentionBell from "@/components/layout/MentionBell";

type Props = {
  user: { id: string; name: string; email: string; role: string };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppNav({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [openPanel, setOpenPanel] = useState<"mention" | "notification" | null>(null);
  const panelWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!panelWrapRef.current) return;
      if (!panelWrapRef.current.contains(e.target as Node)) setOpenPanel(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-elev)/0.85)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-default">
            <Sparkles className="h-6 w-6 text-brand" />
            TeamTasks
          </Link>
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[hsl(var(--primary-soft))] text-brand"
                      : "text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div ref={panelWrapRef} className="flex items-center gap-1">
            <MentionBell
              open={openPanel === "mention"}
              onToggle={() => setOpenPanel((prev) => (prev === "mention" ? null : "mention"))}
              onClose={() => setOpenPanel(null)}
            />
            <NotificationBell
              open={openPanel === "notification"}
              onToggle={() => setOpenPanel((prev) => (prev === "notification" ? null : "notification"))}
              onClose={() => setOpenPanel(null)}
            />
          </div>
          <ThemeToggle />
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[11px] font-semibold text-brand"
            title={user.name}
          >
            {initials(user.name)}
          </span>
          <div className="text-right">
            <p className="text-sm font-medium text-default">{user.name}</p>
            <p className="text-xs text-dim">
              {user.email} · <span className="font-medium text-brand">{user.role}</span>
            </p>
          </div>
          <button onClick={() => setConfirmLogout(true)} className="btn-ghost" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      </header>

      {confirmLogout && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm card p-6 text-center">
            <h2 className="text-lg font-semibold text-default">Log out?</h2>
            <p className="mt-2 text-sm text-muted">
              You will be signed out from this session.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setConfirmLogout(false)} className="btn-outline">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmLogout(false);
                  await logout();
                }}
                className="btn-danger"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
