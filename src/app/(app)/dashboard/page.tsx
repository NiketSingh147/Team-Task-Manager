import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AlertTriangle, CheckCircle2, Clock, FolderKanban, ListTodo, Loader2 } from "lucide-react";
import MyTaskList from "@/components/dashboard/MyTaskList";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const projectFilter =
    user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        };

  const projectIdsList = await prisma.project.findMany({
    where: projectFilter,
    select: { id: true },
  });
  const projectIds = projectIdsList.map((p) => p.id);
  const taskScope =
    user.role === "ADMIN" ? {} : { projectId: { in: projectIds } };

  const [todo, inProgress, inReview, done, overdue, totalProjects, myTasks] =
    await Promise.all([
      prisma.task.count({ where: { ...taskScope, status: "TODO" } }),
      prisma.task.count({ where: { ...taskScope, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...taskScope, status: "IN_REVIEW" } }),
      prisma.task.count({ where: { ...taskScope, status: "DONE" } }),
      prisma.task.count({
        where: { ...taskScope, status: { not: "DONE" }, dueDate: { lt: now } },
      }),
      prisma.project.count({ where: projectFilter }),
      prisma.task.findMany({
        where: { assigneeId: user.id },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 20,
      }),
    ]);

  // Serialize dates for client component
  const serializedTasks = myTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    projectId: t.projectId,
    assigneeId: t.assigneeId,
    createdById: t.createdById,
    project: t.project,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-default">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted">Here&apos;s an overview of your work.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Projects" value={totalProjects} icon={<FolderKanban className="h-5 w-5" />} color="purple" />
        <StatCard label="To do" value={todo} icon={<ListTodo className="h-5 w-5" />} color="slate" />
        <StatCard label="In progress" value={inProgress} icon={<Loader2 className="h-5 w-5" />} color="amber" />
        <StatCard label="In review" value={inReview} icon={<Clock className="h-5 w-5" />} color="blue" />
        <StatCard label="Done" value={done} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <StatCard label="Overdue" value={overdue} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
          <h2 className="font-semibold text-default">My tasks</h2>
          <Link href="/projects" className="text-sm font-medium text-brand hover:underline">
            All projects →
          </Link>
        </div>
        <MyTaskList tasks={serializedTasks} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "purple" | "slate" | "amber" | "blue" | "green" | "red";
}) {
  const colors: Record<string, string> = {
    purple: "badge-purple",
    slate: "badge-slate",
    amber: "badge-amber",
    blue: "badge-blue",
    green: "badge-green",
    red: "badge-red",
  };
  return (
    <div className="card card-hover p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${colors[color]}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold text-default">{value}</p>
      <p className="text-xs text-dim">{label}</p>
    </div>
  );
}
