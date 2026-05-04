"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import MemberList from "@/components/projects/MemberList";
import ProjectOnboarding from "@/components/projects/ProjectOnboarding";
import { useToast } from "@/components/providers/ToastProvider";

type Member = {
  id: string;
  role: "ADMIN" | "MEMBER";
  user: { id: string; name: string; email: string };
};

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

type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  members: Member[];
  tasks: Task[];
};

type Filter = "all" | "mine" | "overdue";

export default function ProjectView({
  project,
  myRole,
  currentUserId,
}: {
  project: Project;
  myRole: "ADMIN" | "MEMBER";
  currentUserId: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [modal, setModal] = useState<{
    open: boolean;
    defaultStatus?: Task["status"];
    task?: Task;
  }>({ open: false });
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = myRole === "ADMIN";
  const isOwner = project.ownerId === currentUserId;

  const now = Date.now();
  const filteredTasks = useMemo(() => {
    if (filter === "mine") return project.tasks.filter((t) => t.assigneeId === currentUserId);
    if (filter === "overdue")
      return project.tasks.filter(
        (t) => t.dueDate && t.status !== "DONE" && new Date(t.dueDate).getTime() < now
      );
    return project.tasks;
  }, [filter, project.tasks, currentUserId, now]);

  const overdueCount = project.tasks.filter(
    (t) => t.dueDate && t.status !== "DONE" && new Date(t.dueDate).getTime() < now
  ).length;
  const mineCount = project.tasks.filter((t) => t.assigneeId === currentUserId).length;

  async function handleDeleteProject() {
    setDeleting(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      show({ kind: "success", message: "Project deleted", description: project.name });
      router.push("/projects");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      show({ kind: "error", message: data.error || "Failed to delete project" });
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-default">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted">{project.description}</p>
          )}
          <p className="mt-2 text-xs text-dim">
            Owner: <span className="text-muted">{project.owner.name}</span> · Your role:{" "}
            <span className="font-medium text-brand">{myRole}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ open: true })}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            New task
          </button>
          {isOwner && (
            <button onClick={() => setConfirmDelete(true)} className="btn-outline text-red-400 hover:border-red-500/50">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="ml-1 text-dim">{project.tasks.length}</span>
        </FilterChip>
        <FilterChip active={filter === "mine"} onClick={() => setFilter("mine")}>
          My tasks <span className="ml-1 text-dim">{mineCount}</span>
        </FilterChip>
        <FilterChip active={filter === "overdue"} onClick={() => setFilter("overdue")} danger>
          Overdue <span className="ml-1 text-dim">{overdueCount}</span>
        </FilterChip>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_320px]">
        {project.tasks.length === 0 ? (
          <ProjectOnboarding
            projectId={project.id}
            canSeed={isAdmin}
            onNewTask={() => setModal({ open: true })}
          />
        ) : (
          <TaskBoard
            projectId={project.id}
            tasks={filteredTasks}
            members={project.members}
            owner={project.owner}
            myRole={myRole}
            currentUserId={currentUserId}
            onAddToColumn={(status) => setModal({ open: true, defaultStatus: status })}
            onEditTask={(task) => setModal({ open: true, task })}
          />
        )}
        <MemberList
          projectId={project.id}
          owner={project.owner}
          members={project.members}
          myRole={myRole}
        />
      </div>

      {modal.open && (
        <TaskFormModal
          projectId={project.id}
          members={project.members}
          owner={project.owner}
          task={modal.task}
          defaultStatus={modal.defaultStatus}
          onClose={() => setModal({ open: false })}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-default">Delete project?</h2>
            <p className="mt-2 text-sm text-muted">
              This will permanently delete <span className="font-medium text-default">{project.name}</span> along
              with all its tasks and member associations. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? danger
            ? "border-red-500/40 bg-red-500/15 text-red-300"
            : "border-[hsl(var(--primary))] bg-[hsl(var(--primary-soft))] text-brand"
          : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-muted hover:text-default")
      }
    >
      {children}
    </button>
  );
}
