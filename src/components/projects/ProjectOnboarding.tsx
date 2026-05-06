"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Sparkles, Plus, ListChecks, Users } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export default function ProjectOnboarding({
  projectId,
  canSeed,
  onNewTask,
}: {
  projectId: string;
  canSeed: boolean;
  onNewTask: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  async function seed() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/seed-tasks`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        show({ kind: "error", message: data.error || "Could not add sample tasks" });
        return;
      }
      show({
        kind: "success",
        message: `Added ${data.created} sample tasks`,
        description: "Feel free to tweak, reassign, or delete them.",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-brand">
        <Rocket className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-default">Let’s get this project moving</h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        Your board is empty. Add your first task, or start with a small set of sample tasks to
        see how everything fits together.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button onClick={onNewTask} className="btn-primary">
          <Plus className="h-4 w-4" />
          Create first task
        </button>
        {canSeed && (
          <button onClick={seed} disabled={loading} className="btn-outline">
            <Sparkles className="h-4 w-4" />
            {loading ? "Adding..." : "Add sample tasks"}
          </button>
        )}
      </div>

      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 text-left sm:grid-cols-3">
        <Tip icon={ListChecks} title="Organize work" body="Drag tasks across columns as they progress." />
        <Tip icon={Users} title="Collaborate" body="Invite teammates from the Members panel." />
        <Tip icon={Sparkles} title="Stay on top" body="Set priorities and due dates to focus the team." />
      </div>
    </div>
  );
}

function Tip({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-default">
        <Icon className="h-4 w-4 text-brand" />
        {title}
      </div>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </div>
  );
}
