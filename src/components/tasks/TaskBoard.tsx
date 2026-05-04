"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Plus, AlertTriangle, Calendar, User as UserIcon, X } from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";
import Markdown from "@/components/ui/Markdown";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate, isOverdue } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assignee: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
  createdById: string;
  assigneeId: string | null;
};

type Member = {
  id: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string; email: string };
};

const COLUMNS: { key: Task["status"]; label: string; dot: string }[] = [
  { key: "TODO", label: "To do", dot: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "In progress", dot: "bg-amber-400" },
  { key: "IN_REVIEW", label: "In review", dot: "bg-purple-400" },
  { key: "DONE", label: "Completed", dot: "bg-green-400" },
];

const PRIORITY_ACCENT: Record<Task["priority"], string> = {
  LOW: "bg-slate-400/70",
  MEDIUM: "bg-blue-400/80",
  HIGH: "bg-orange-400/90",
  URGENT: "bg-red-500",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TaskBoard({
  projectId,
  tasks,
  members,
  owner,
  myRole,
  currentUserId,
  onAddToColumn,
  onEditTask,
}: {
  projectId: string;
  tasks: Task[];
  members: Member[];
  owner: { id: string; name: string; email: string };
  myRole: "ADMIN" | "MEMBER";
  currentUserId: string;
  onAddToColumn: (status: Task["status"]) => void;
  onEditTask: (task: Task) => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const isAdmin = myRole === "ADMIN";
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  async function updateStatus(id: string, status: Task["status"]) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
    else {
      const d = await res.json().catch(() => ({}));
      show({ kind: "error", message: d.error || "Failed to update" });
    }
  }

  async function deleteTask(t: Task) {
    const res = await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      show({ kind: "error", message: d.error || "Failed to delete" });
      return;
    }
    setViewingTask(null);
    router.refresh();
    show({
      kind: "success",
      message: "Task deleted",
      description: t.title,
      durationMs: 6000,
      action: {
        label: "Undo",
        onClick: async () => {
          const payload = {
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            assigneeId: t.assigneeId,
          };
          const r = await fetch(`/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (r.ok) {
            router.refresh();
            show({ kind: "success", message: "Task restored", durationMs: 3000 });
          } else {
            const d = await r.json().catch(() => ({}));
            show({ kind: "error", message: d.error || "Could not restore task" });
          }
        },
      },
    });
  }

  function canEditTask() {
    return isAdmin;
  }
  function canChangeStatus(t: Task) {
    return isAdmin || t.assigneeId === currentUserId || t.createdById === currentUserId;
  }
  function canDeleteTask(t: Task) {
    return isAdmin || t.createdById === currentUserId || t.assigneeId === currentUserId;
  }

  return (
    <>
      {/* 2x2 grid layout */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="kanban-col flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-default">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  {col.label}
                  <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-xs text-muted">
                    {colTasks.length}
                  </span>
                </h3>
                <button
                  onClick={() => onAddToColumn(col.key)}
                  className="rounded p-1 text-muted hover:bg-[hsl(var(--surface-2))] hover:text-brand"
                  title={`Add task to ${col.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {colTasks.length === 0 ? (
                  <button
                    onClick={() => onAddToColumn(col.key)}
                    className="w-full rounded-lg border border-dashed border-[hsl(var(--border))] py-8 text-center text-xs text-dim hover:border-[hsl(var(--primary)/0.5)] hover:text-brand"
                  >
                    + Add task
                  </button>
                ) : (
                  colTasks.map((t) => {
                    const overdue = isOverdue(t.dueDate, t.status);
                    const assigneeName = t.assignee?.name ?? "Unassigned";
                    return (
                      <div
                        key={t.id}
                        className="card card-hover relative overflow-hidden p-4 cursor-pointer"
                        onClick={() => setViewingTask(t)}
                      >
                        {/* Priority accent bar */}
                        <span
                          className={`absolute left-0 top-0 h-full w-1 ${PRIORITY_ACCENT[t.priority]}`}
                          aria-hidden
                        />

                        {/* Header: title + actions */}
                        <div className="flex items-start justify-between gap-3 pl-2">
                          <h4 className="text-sm font-semibold leading-snug text-default line-clamp-2">
                            {t.title}
                          </h4>
                          <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                            {canEditTask() && (
                              <button
                                onClick={() => onEditTask(t)}
                                className="rounded p-1.5 text-dim hover:bg-[hsl(var(--surface-2))] hover:text-default"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteTask(t) && (
                              <button
                                onClick={() => deleteTask(t)}
                                className="rounded p-1.5 text-dim hover:bg-red-500/10 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Description preview */}
                        {t.description && (
                          <p className="mt-2 line-clamp-2 pl-2 text-xs leading-relaxed text-muted">
                            {t.description}
                          </p>
                        )}

                        {/* Badges */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-2">
                          <PriorityBadge priority={t.priority} />
                          {t.dueDate && (
                            <span
                              className={`badge inline-flex items-center gap-1 ${
                                overdue ? "badge-red" : "badge-slate"
                              }`}
                            >
                              <Calendar className="h-3 w-3" />
                              {formatDate(t.dueDate)}
                            </span>
                          )}
                          {overdue && (
                            <span className="badge badge-red inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue
                            </span>
                          )}
                        </div>

                        {/* Footer: assignee + status */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] pt-3 pl-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {t.assignee ? (
                              <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[10px] font-semibold text-brand"
                                title={t.assignee.name}
                              >
                                {initials(t.assignee.name)}
                              </span>
                            ) : (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--surface-2))] text-dim">
                                <UserIcon className="h-3 w-3" />
                              </span>
                            )}
                            <span className="truncate text-xs text-muted" title={assigneeName}>
                              {assigneeName}
                            </span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            {canChangeStatus(t) && (
                              <select
                                value={t.status}
                                onChange={(e) =>
                                  updateStatus(t.id, e.target.value as Task["status"])
                                }
                                className="shrink-0 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1 text-xs text-default outline-none focus:border-[hsl(var(--primary))]"
                              >
                                {COLUMNS.map((c) => (
                                  <option key={c.key} value={c.key}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail slide-over panel (right half of screen) */}
      {viewingTask && (
        <TaskDetailPanel
          task={viewingTask}
          canEdit={canEditTask()}
          canDelete={canDeleteTask(viewingTask)}
          canChangeStatus={canChangeStatus(viewingTask)}
          onClose={() => setViewingTask(null)}
          onEdit={() => {
            setViewingTask(null);
            onEditTask(viewingTask);
          }}
          onDelete={() => deleteTask(viewingTask)}
          onStatusChange={(s) => updateStatus(viewingTask.id, s)}
        />
      )}
    </>
  );
}

function TaskDetailPanel({
  task,
  canEdit,
  canDelete,
  canChangeStatus: canStatus,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: Task["status"]) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[50vw] min-w-[360px] overflow-y-auto bg-[hsl(var(--bg-elev))] border-l border-[hsl(var(--border))] shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] px-6 py-4">
          <h2 className="text-lg font-semibold text-default truncate pr-4">{task.title}</h2>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={onEdit} className="btn-ghost px-2 py-1.5 text-xs">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="btn-ghost px-2 py-1.5 text-xs text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1.5 text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-6">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetaItem label="Status">
              {canStatus ? (
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(e.target.value as Task["status"])}
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1 text-sm text-default outline-none focus:border-[hsl(var(--primary))]"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={task.status} />
              )}
            </MetaItem>
            <MetaItem label="Priority">
              <PriorityBadge priority={task.priority} />
            </MetaItem>
            <MetaItem label="Assignee">
              <div className="flex items-center gap-2">
                {task.assignee ? (
                  <>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[10px] font-semibold text-brand">
                      {initials(task.assignee.name)}
                    </span>
                    <span className="text-sm text-default">{task.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-dim">Unassigned</span>
                )}
              </div>
            </MetaItem>
            <MetaItem label="Due date">
              {task.dueDate ? (
                <span className={`inline-flex items-center gap-1 text-sm ${overdue ? "text-red-400" : "text-default"}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(task.dueDate)}
                  {overdue && (
                    <span className="ml-1 badge badge-red text-[10px]">Overdue</span>
                  )}
                </span>
              ) : (
                <span className="text-sm text-dim">No due date</span>
              )}
            </MetaItem>
            <MetaItem label="Created by">
              <span className="text-sm text-default">{task.createdBy.name}</span>
            </MetaItem>
          </div>

          {/* Description */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted">Description</h3>
            {task.description ? (
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
                <Markdown>{task.description}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-dim italic">No description provided.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-dim">{label}</p>
      {children}
    </div>
  );
}
