"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import MarkdownEditor from "@/components/ui/MarkdownEditor";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assigneeId: string | null;
};

type Member = {
  id: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string; email: string };
};

type TaskOption = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
};

export default function TaskFormModal({
  projectId,
  members,
  owner,
  allTasks,
  task,
  defaultStatus,
  onClose,
}: {
  projectId: string;
  members: Member[];
  owner: { id: string; name: string; email: string };
  allTasks: TaskOption[];
  task?: Task;
  defaultStatus?: Task["status"];
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? defaultStatus ?? "TODO");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "MEDIUM");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [selectedBlockerTaskId, setSelectedBlockerTaskId] = useState("");
  const [blockerTaskIds, setBlockerTaskIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalSizeLabel = useMemo(() => {
    const bytes = files.reduce((sum, f) => sum + f.size, 0);
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [files]);

  const assignableUsers = [
    { id: owner.id, name: owner.name, email: owner.email },
    ...members
      .filter((m) => m.user.id !== owner.id)
      .map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email })),
  ];
  const blockerOptions = useMemo(
    () => allTasks.filter((t) => t.id !== task?.id && !blockerTaskIds.includes(t.id)),
    [allTasks, task?.id, blockerTaskIds]
  );

  function addBlocker() {
    if (!selectedBlockerTaskId) return;
    setBlockerTaskIds((prev) => (prev.includes(selectedBlockerTaskId) ? prev : [...prev, selectedBlockerTaskId]));
    setSelectedBlockerTaskId("");
  }

  function removeBlocker(taskId: string) {
    setBlockerTaskIds((prev) => prev.filter((id) => id !== taskId));
  }

  function addFiles(next: File[]) {
    if (next.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev, ...next];
      const dedup = new Map<string, File>();
      for (const f of merged) dedup.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      return [...dedup.values()];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        title,
        description: description || null,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeId: assigneeId || null,
      };
      const url = isEdit ? `/api/tasks/${task!.id}` : `/api/projects/${projectId}/tasks`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save task");
        return;
      }
      const taskId: string | undefined = data?.task?.id;
      if (taskId && files.length > 0) {
        const form = new FormData();
        for (const file of files) form.append("files", file);
        const uploadRes = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json().catch(() => ({}));
          setError(d.error || "Task saved but file upload failed");
          return;
        }
      }
      if (!isEdit && taskId && blockerTaskIds.length > 0) {
        for (const blockerTaskId of blockerTaskIds) {
          const depRes = await fetch(`/api/tasks/${taskId}/dependencies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blockerTaskId }),
          });
          if (!depRes.ok) {
            const d = await depRes.json().catch(() => ({}));
            setError(d.error || "Task saved but dependency setup failed");
            return;
          }
        }
      }

      onClose();
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg card">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-3">
          <h2 className="font-semibold text-default">{isEdit ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-[hsl(var(--surface-2))] hover:text-default">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="block text-sm font-medium text-muted">Title</label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted">Description</label>
            <div className="mt-1">
              <MarkdownEditor
                value={description ?? ""}
                onChange={setDescription}
                rows={4}
                placeholder="Describe the task. Markdown supported."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="input mt-1"
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="IN_REVIEW">In review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="input mt-1"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input mt-1 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="input mt-1"
              >
                <option value="">Unassigned</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-muted">Blockers (Dependencies)</label>
              <div className="mt-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={selectedBlockerTaskId}
                    onChange={(e) => setSelectedBlockerTaskId(e.target.value)}
                    className="input min-w-0 flex-1"
                  >
                    <option value="">Select blocker task</option>
                    {blockerOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addBlocker}
                    disabled={!selectedBlockerTaskId}
                    className="btn-outline px-3 py-1 text-xs disabled:opacity-60"
                  >
                    Add blocker
                  </button>
                </div>
                {blockerTaskIds.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {blockerTaskIds.map((id) => {
                      const blocker = allTasks.find((t) => t.id === id);
                      if (!blocker) return null;
                      return (
                        <div key={id} className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] px-2 py-1.5 text-xs">
                          <span className="truncate text-default">{blocker.title}</span>
                          <button type="button" onClick={() => removeBlocker(id)} className="text-red-400 hover:underline">
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-muted">Attachments</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(Array.from(e.dataTransfer.files || []));
              }}
              className={`mt-1 rounded-lg border border-dashed p-4 text-sm ${
                dragOver
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary-soft)/0.25)]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-muted">
                  <Upload className="h-4 w-4" />
                  <span>Drag & drop files here</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-outline px-3 py-1 text-xs"
                >
                  Upload from device
                </button>
              </div>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-dim">
                    {files.length} file(s) selected • {totalSizeLabel}
                  </p>
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] px-2 py-1.5 text-xs">
                      <span className="truncate text-default">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Saving..." : isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
