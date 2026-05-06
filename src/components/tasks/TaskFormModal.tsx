"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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

export default function TaskFormModal({
  projectId,
  members,
  owner,
  task,
  defaultStatus,
  onClose,
}: {
  projectId: string;
  members: Member[];
  owner: { id: string; name: string; email: string };
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableUsers = [
    { id: owner.id, name: owner.name, email: owner.email },
    ...members
      .filter((m) => m.user.id !== owner.id)
      .map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email })),
  ];

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
