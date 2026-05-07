"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type Member = {
  id: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string; email: string };
};

export default function MemberList({
  projectId,
  owner,
  members,
  myRole,
}: {
  projectId: string;
  owner: { id: string; name: string; email: string };
  members: Member[];
  myRole: "ADMIN" | "MEMBER";
}) {
  const router = useRouter();
  const { show } = useToast();
  const isAdmin = myRole === "ADMIN";
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add member");
        return;
      }
      setEmail("");
      setRole("MEMBER");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(memberId: string, newRole: "ADMIN" | "MEMBER") {
    if (!isAdmin) {
      show({ kind: "error", message: "Only project admins can change roles" });
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const d = await res.json().catch(() => ({}));
      show({ kind: "error", message: d.error || "Failed to update role" });
    } catch {
      show({ kind: "error", message: "Network error while updating role" });
    }
  }

  async function removeMember(m: Member) {
    const res = await fetch(`/api/projects/${projectId}/members/${m.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      show({ kind: "error", message: d.error || "Failed to remove member" });
      return;
    }
    router.refresh();
    show({
      kind: "success",
      message: "Member removed",
      description: m.user.name,
      durationMs: 6000,
      action: {
        label: "Undo",
        onClick: async () => {
          const r = await fetch(`/api/projects/${projectId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: m.user.email, role: m.role }),
          });
          if (r.ok) {
            router.refresh();
            show({ kind: "success", message: "Member restored", durationMs: 3000 });
          } else {
            const d = await r.json().catch(() => ({}));
            show({ kind: "error", message: d.error || "Could not restore member" });
          }
        },
      },
    });
  }

  return (
    <aside className="card h-fit">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <h2 className="font-semibold text-default">Members</h2>
        {isAdmin && (
          <button
            onClick={() => setOpen(!open)}
            className="rounded p-1 text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && isAdmin && (
        <form onSubmit={addMember} className="space-y-2 border-b border-[hsl(var(--border))] px-4 py-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="input"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
            className="input"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline text-xs px-3 py-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-3 py-1">
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-[hsl(var(--border))]">
        {members.map((m) => {
          const isOwner = m.user.id === owner.id;
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-default">
                  {m.user.name} {isOwner && <span className="text-xs text-dim">(Owner)</span>}
                </p>
                <p className="truncate text-xs text-dim">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && !isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value as "ADMIN" | "MEMBER")}
                    className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-xs text-default outline-none focus:border-[hsl(var(--primary))]"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <span className="badge badge-purple">{m.role}</span>
                )}
                {isAdmin && !isOwner && (
                  <button
                    onClick={() => removeMember(m)}
                    className="rounded p-1 text-dim hover:bg-red-500/10 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
