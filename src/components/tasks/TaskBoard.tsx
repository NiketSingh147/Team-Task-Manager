"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Plus, AlertTriangle, Calendar, User as UserIcon, X, CornerDownRight, ArrowLeft } from "lucide-react";
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
  attachments: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
  blockedBy?: { blockerTask: { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" } }[];
  blocking?: { blockedTask: { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" } }[];
  activities?: {
    id: string;
    message: string;
    createdAt: string;
    actorUser?: { id: string; name: string; email: string } | null;
  }[];
};
type TaskDependencyView = { blockerTask: { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" } };
type TaskBlockingView = { blockedTask: { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" } };

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

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  replies?: CommentItem[];
};

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
                    const activeBlockers = (t.blockedBy ?? []).filter((d) => d.blockerTask.status !== "DONE").length;
                    return (
                      <div
                        key={t.id}
                        className="card card-hover relative overflow-hidden p-4 cursor-pointer"
                        onClick={() => setViewingTask(t)}
                      >
                        <span className={`absolute left-0 top-0 h-full w-1 ${PRIORITY_ACCENT[t.priority]}`} aria-hidden />
                        <div className="flex items-start justify-between gap-3 pl-2">
                          <h4 className="text-sm font-semibold leading-snug text-default line-clamp-2">{t.title}</h4>
                          <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                            {canEditTask() && (
                              <button onClick={() => onEditTask(t)} className="rounded p-1.5 text-dim hover:bg-[hsl(var(--surface-2))] hover:text-default" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteTask(t) && (
                              <button onClick={() => deleteTask(t)} className="rounded p-1.5 text-dim hover:bg-red-500/10 hover:text-red-400" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {t.description && <p className="mt-2 line-clamp-2 pl-2 text-xs leading-relaxed text-muted">{t.description}</p>}

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-2">
                          <PriorityBadge priority={t.priority} />
                          {t.dueDate && (
                            <span className={`badge inline-flex items-center gap-1 ${overdue ? "badge-red" : "badge-slate"}`}>
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
                          {activeBlockers > 0 && (
                            <span className="badge badge-amber inline-flex items-center gap-1">
                              Blocked ({activeBlockers})
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] pt-3 pl-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {t.assignee ? (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[10px] font-semibold text-brand" title={t.assignee.name}>
                                {initials(t.assignee.name)}
                              </span>
                            ) : (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--surface-2))] text-dim">
                                <UserIcon className="h-3 w-3" />
                              </span>
                            )}
                            <span className="truncate text-xs text-muted" title={assigneeName}>{assigneeName}</span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            {canChangeStatus(t) && (
                              <select
                                value={t.status}
                                onChange={(e) => updateStatus(t.id, e.target.value as Task["status"])}
                                className="shrink-0 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1 text-xs text-default outline-none focus:border-[hsl(var(--primary))]"
                              >
                                {COLUMNS.map((c) => (
                                  <option key={c.key} value={c.key}>{c.label}</option>
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

      {viewingTask && (
        <TaskDetailPanel
          task={viewingTask}
          projectTasks={tasks}
          mentionUsers={[owner, ...members.map((m) => m.user)].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)}
          currentUserId={currentUserId}
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
  projectTasks,
  mentionUsers,
  currentUserId,
  canEdit,
  canDelete,
  canChangeStatus: canStatus,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  projectTasks: Task[];
  mentionUsers: { id: string; name: string; email: string }[];
  currentUserId: string;
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: Task["status"]) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [blockedBy, setBlockedBy] = useState<TaskDependencyView[]>(task.blockedBy ?? []);
  const [blocking, setBlocking] = useState<TaskBlockingView[]>(task.blocking ?? []);
  const [selectedBlockerTaskId, setSelectedBlockerTaskId] = useState("");
  const [dependencyBusy, setDependencyBusy] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [repliesVisible, setRepliesVisible] = useState<Record<string, boolean>>({});
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [activities, setActivities] = useState(task.activities ?? []);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const commentsLoadErrorShownRef = useRef(false);
  const availableBlockers = useMemo(
    () => projectTasks.filter((t) => t.id !== task.id && !blockedBy.some((d) => d.blockerTask.id === t.id)),
    [projectTasks, task.id, blockedBy]
  );

  useEffect(() => {
    setBlockedBy(task.blockedBy ?? []);
    setBlocking(task.blocking ?? []);
    setActivities(task.activities ?? []);
  }, [task.id, task.blockedBy, task.blocking]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  async function fetchComments() {
    const res = await fetch(`/api/tasks/${task.id}/comments`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.comments) {
      setComments(data.comments);
      commentsLoadErrorShownRef.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      try {
        setActivitiesLoading(true);
        const res = await fetch(`/api/tasks/${task.id}/activities`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.activities) setActivities(data.activities);
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    }
    async function loadComments() {
      try {
        setCommentsLoading(true);
        await fetchComments();
      } catch {
        if (!cancelled && !commentsLoadErrorShownRef.current) {
          commentsLoadErrorShownRef.current = true;
        }
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    }
    loadActivities();
    loadComments();
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") loadComments();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [task.id]);

  async function addComment() {
    const body = commentBody.trim();
    if (!body) return;
    setCommentSaving(true);
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.comment) {
      if (data.comment.parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === data.comment.parentId
              ? { ...c, replies: uniqueById([...(c.replies ?? []), data.comment]) }
              : c
          )
        );
      } else {
        setComments((prev) => uniqueById([...prev, data.comment]));
      }
      setCommentBody("");
    }
    setCommentSaving(false);
  }

  async function addReply(parentId: string) {
    const body = (replyBody[parentId] ?? "").trim();
    if (!body) return;
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentId }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.comment) {
      await fetchComments();
      setReplyBody((prev) => ({ ...prev, [parentId]: "" }));
      setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
    }
  }

  async function deleteComment(commentId: string) {
    const res = await fetch(`/api/tasks/${task.id}/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function addDependency() {
    if (!selectedBlockerTaskId) return;
    setDependencyBusy(true);
    setDependencyError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockerTaskId: selectedBlockerTaskId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDependencyError(data?.error || "Failed to add blocker");
        return;
      }
      const added = projectTasks.find((t) => t.id === selectedBlockerTaskId);
      if (added) {
        setBlockedBy((prev) => [
          ...prev,
          { blockerTask: { id: added.id, title: added.title, status: added.status } },
        ]);
      }
      setSelectedBlockerTaskId("");
    } finally {
      setDependencyBusy(false);
    }
  }

  async function removeDependency(blockerTaskId: string) {
    setDependencyBusy(true);
    setDependencyError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/dependencies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockerTaskId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDependencyError(data?.error || "Failed to remove blocker");
        return;
      }
      setBlockedBy((prev) => prev.filter((d) => d.blockerTask.id !== blockerTaskId));
    } finally {
      setDependencyBusy(false);
    }
  }

  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return mentionUsers.slice(0, 8);
    return mentionUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 8);
  }, [mentionQuery, mentionUsers]);

  function handleCommentChange(value: string) {
    setCommentBody(value);
    const el = commentInputRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const textUntilCursor = value.slice(0, cursor);
    const match = textUntilCursor.match(/(?:^|\s)@([a-zA-Z0-9._-]{0,64})$/);

    if (!match) {
      setMentionOpen(false);
      setMentionQuery("");
      setMentionStart(null);
      return;
    }

    const token = match[1] ?? "";
    const tokenStart = cursor - token.length - 1;
    setMentionStart(tokenStart);
    setMentionQuery(token);
    setMentionOpen(true);
  }

  function insertMention(user: { email: string }) {
    if (mentionStart === null) return;
    const el = commentInputRef.current;
    const cursor = el?.selectionStart ?? commentBody.length;
    const before = commentBody.slice(0, mentionStart);
    const after = commentBody.slice(cursor);
    const next = `${before}@${user.email} ${after}`;
    setCommentBody(next);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionStart(null);

    setTimeout(() => {
      if (!el) return;
      const pos = (before + `@${user.email} `).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function renderCommentThread(comment: CommentItem, depth = 0): React.ReactNode {
    const hasReplies = (comment.replies?.length ?? 0) > 0;
    const showReplies = !!repliesVisible[comment.id];
    return (
      <div key={comment.id} className={depth > 0 ? "ml-3 mt-2 border-l border-[hsl(var(--border))] pl-3" : ""}>
        <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-default">{comment.user.name}</p>
            <p className="text-[11px] text-dim">{new Date(comment.createdAt).toLocaleString()}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted">{comment.body}</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            {comment.user.id === currentUserId && (
              <button onClick={() => deleteComment(comment.id)} className="rounded p-1.5 text-dim hover:bg-red-500/10 hover:text-red-400" title="Delete this comment" type="button">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))} className="rounded p-1.5 text-dim hover:bg-[hsl(var(--surface-2))] hover:text-brand" title="Reply to this message" type="button">
              <CornerDownRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {hasReplies && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setRepliesVisible((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                className="text-xs text-brand hover:underline"
              >
                {showReplies ? "Hide replies" : `Load replies (${comment.replies?.length ?? 0})`}
              </button>
            </div>
          )}
          {replyOpen[comment.id] && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyBody[comment.id] ?? ""}
                onChange={(e) => setReplyBody((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                className="input min-h-20 resize-y"
                placeholder="Write a reply..."
              />
              <div className="flex justify-end">
                <button onClick={() => addReply(comment.id)} disabled={!(replyBody[comment.id] ?? "").trim()} className="btn-primary px-3 py-1.5 text-xs" type="button">
                  Post reply
                </button>
              </div>
            </div>
          )}
          {hasReplies && (
            <div className={`mt-2 overflow-hidden transition-all duration-300 ease-out ${showReplies ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="space-y-2">{comment.replies?.map((r) => renderCommentThread(r, depth + 1))}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 h-full w-full max-w-full overflow-x-hidden overflow-y-auto border-l border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] shadow-2xl animate-slide-in">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3 pr-4">
            <button onClick={onClose} className="btn-ghost px-2 py-1.5 text-xs" title="Back to project">
              <ArrowLeft className="h-4 w-4" />
              Back to project
            </button>
            <h2 className="truncate text-lg font-semibold text-default">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={onEdit} className="btn-ghost px-2 py-1.5 text-xs">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="btn-ghost px-2 py-1.5 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button onClick={onClose} className="rounded p-1.5 text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
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
            <MetaItem label="Priority"><PriorityBadge priority={task.priority} /></MetaItem>
            <MetaItem label="Assignee">
              <div className="flex items-center gap-2">
                {task.assignee ? (
                  <>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[10px] font-semibold text-brand">{initials(task.assignee.name)}</span>
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
                  {overdue && <span className="ml-1 badge badge-red text-[10px]">Overdue</span>}
                </span>
              ) : (
                <span className="text-sm text-dim">No due date</span>
              )}
            </MetaItem>
            <MetaItem label="Created by">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[10px] font-semibold text-brand">
                  {initials(task.createdBy.name)}
                </span>
                <span className="text-sm text-default">{task.createdBy.name}</span>
              </div>
            </MetaItem>
          </div>

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

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted">Attachments</h3>
            <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
              {task.attachments.length === 0 ? (
                <p className="text-sm text-dim">No files attached.</p>
              ) : (
                <div className="space-y-2">
                  {task.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex w-full items-center justify-between rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] px-3 py-2 text-xs transition-colors hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-soft)/0.3)]"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-default"
                      >
                        <span className="truncate">{att.originalName}</span>
                      </button>
                      <div className="ml-4 flex items-center gap-3">
                        <span className="text-dim">{Math.max(1, Math.round(att.sizeBytes / 1024))} KB</span>
                        <a
                          href={`/api/attachments/${att.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-[hsl(var(--primary))] px-3 py-1 text-xs font-medium text-white hover:bg-[hsl(var(--primary-hover))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(task.blockedBy || task.blocking) && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted">Dependencies</h3>
              <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
                {canEdit && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={selectedBlockerTaskId}
                      onChange={(e) => setSelectedBlockerTaskId(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] px-2 py-1.5 text-sm text-default outline-none focus:border-[hsl(var(--primary))]"
                    >
                      <option value="">Select blocker task</option>
                      {availableBlockers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({COLUMNS.find((c) => c.key === t.status)?.label ?? t.status})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addDependency}
                      disabled={!selectedBlockerTaskId || dependencyBusy}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {dependencyBusy ? "Saving..." : "Add blocker"}
                    </button>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs text-dim">Blocked by</p>
                  {blockedBy.length === 0 ? (
                    <p className="text-sm text-dim">No blockers.</p>
                  ) : (
                    <div className="space-y-1">
                      {blockedBy.map((d) => (
                        <div key={d.blockerTask.id} className="flex items-center justify-between gap-3">
                          <p className="text-sm text-default">{d.blockerTask.title} ({d.blockerTask.status})</p>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => removeDependency(d.blockerTask.id)}
                              disabled={dependencyBusy}
                              className="text-xs text-red-400 hover:underline disabled:opacity-60"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs text-dim">Blocking</p>
                  {blocking.length === 0 ? (
                    <p className="text-sm text-dim">Not blocking any task.</p>
                  ) : (
                    <div className="space-y-1">
                      {blocking.map((d) => (
                        <p key={d.blockedTask.id} className="text-sm text-default">{d.blockedTask.title} ({d.blockedTask.status})</p>
                      ))}
                    </div>
                  )}
                </div>
                {dependencyError && <p className="text-xs text-red-400">{dependencyError}</p>}
              </div>
            </div>
          )}

          {(activitiesLoading || activities.length > 0) && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted">Activity Timeline</h3>
              <div className="space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
                {activitiesLoading && activities.length === 0 && <p className="text-xs text-dim">Loading activity...</p>}
                {activities.map((a) => (
                  <div key={a.id} className="rounded border border-[hsl(var(--border))] px-3 py-2">
                    <p className="text-sm text-default">{a.message}</p>
                    <p className="text-[11px] text-dim">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted">Comments</h3>
            <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
              <div className="space-y-2">
                <textarea
                  ref={commentInputRef}
                  value={commentBody}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  className="input min-h-24 resize-y"
                  placeholder="Write a comment... Mention teammates with @email or @name"
                />
                {mentionOpen && mentionCandidates.length > 0 && (
                  <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg-elev))] p-1">
                    {mentionCandidates.map((u) => (
                      <button key={u.id} type="button" onClick={() => insertMention(u)} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-[hsl(var(--surface-2))]">
                        <span className="truncate text-default">{u.name}</span>
                        <span className="truncate text-dim">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={addComment} disabled={commentSaving || !commentBody.trim()} className="btn-primary px-3 py-1.5 text-xs">
                    {commentSaving ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {commentsLoading && <p className="text-xs text-dim">Loading comments...</p>}
                {!commentsLoading && comments.length === 0 && <p className="text-xs text-dim">No comments yet.</p>}
                {comments.map((comment) => renderCommentThread(comment))}
              </div>
            </div>
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
