"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, AlertTriangle, X, FolderKanban } from "lucide-react";
import PriorityBadge from "@/components/tasks/PriorityBadge";
import StatusBadge from "@/components/tasks/StatusBadge";
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
  projectId: string;
  assigneeId: string | null;
  createdById: string;
  project: { id: string; name: string };
};

const STATUSES: { key: Task["status"]; label: string }[] = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "IN_REVIEW", label: "In review" },
  { key: "DONE", label: "Done" },
];

export default function MyTaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  async function changeStatus(taskId: string, status: Task["status"]) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      show({ kind: "success", message: "Status updated", durationMs: 2000 });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      show({ kind: "error", message: d.error || "Failed to update status" });
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-dim">
        You have no tasks assigned. Head to a project to get started.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[hsl(var(--border))]">
        {tasks.map((t) => {
          const overdue = isOverdue(t.dueDate, t.status);
          return (
            <div
              key={t.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--surface-2)/0.5)] transition-colors cursor-pointer"
              onClick={() => setViewingTask(t)}
            >
              {/* Left: task info */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-medium text-default">
                  {t.title}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dim">
                  <Link
                    href={`/projects/${t.projectId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 hover:text-brand hover:underline"
                  >
                    <FolderKanban className="h-3 w-3" />
                    {t.project.name}
                  </Link>
                  {t.dueDate && (
                    <span className={`inline-flex items-center gap-1 ${overdue ? "text-red-400 font-medium" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {formatDate(t.dueDate)}
                      {overdue && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: badges + status dropdown */}
              <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <PriorityBadge priority={t.priority} />
                <select
                  value={t.status}
                  onChange={(e) => changeStatus(t.id, e.target.value as Task["status"])}
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1 text-xs text-default outline-none focus:border-[hsl(var(--primary))] cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail slide-over (read-only) */}
      {viewingTask && (
        <TaskViewPanel task={viewingTask} onClose={() => setViewingTask(null)} onStatusChange={(s) => changeStatus(viewingTask.id, s)} />
      )}
    </>
  );
}

function TaskViewPanel({
  task,
  onClose,
  onStatusChange,
}: {
  task: Task;
  onClose: () => void;
  onStatusChange: (s: Task["status"]) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[50vw] min-w-[360px] overflow-y-auto bg-[hsl(var(--bg-elev))] border-l border-[hsl(var(--border))] shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] px-6 py-4">
          <h2 className="text-lg font-semibold text-default truncate pr-4">{task.title}</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${task.projectId}`}
              className="btn-ghost px-2 py-1.5 text-xs"
            >
              <FolderKanban className="h-4 w-4" />
              Open project
            </Link>
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
          <div className="grid grid-cols-2 gap-4">
            <MetaItem label="Status">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(e.target.value as Task["status"])}
                className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1 text-sm text-default outline-none focus:border-[hsl(var(--primary))]"
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </MetaItem>
            <MetaItem label="Priority">
              <PriorityBadge priority={task.priority} />
            </MetaItem>
            <MetaItem label="Project">
              <Link href={`/projects/${task.projectId}`} className="text-sm text-brand hover:underline">
                {task.project.name}
              </Link>
            </MetaItem>
            <MetaItem label="Due date">
              {task.dueDate ? (
                <span className={`inline-flex items-center gap-1 text-sm ${overdue ? "text-red-400" : "text-default"}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(task.dueDate)}
                  {overdue && <span className="ml-1 badge badge-red text-[10px]">Overdue</span>}
                </span>
              ) : (
                <span className="text-sm text-dim">No due date</span>
              )}
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
