import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { FolderKanban, Users } from "lucide-react";
import NewProjectButton from "@/components/projects/NewProjectButton";

export default async function ProjectsPage() {
  const user = await requireUser();

  const where =
    user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        };

  const projects = await prisma.project.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-default">Projects</h1>
          <p className="text-sm text-muted">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-brand">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-semibold text-default">No projects yet</h2>
          <p className="mt-1 text-sm text-muted">Create your first project to get started.</p>
          <div className="mt-6">
            <NewProjectButton />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card card-hover p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(var(--primary-soft))] text-brand">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <span className="text-xs text-dim">{formatDate(p.updatedAt)}</span>
              </div>
              <h3 className="mt-4 font-semibold text-default">{p.name}</h3>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-dim">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {p._count.members} member{p._count.members === 1 ? "" : "s"}
                </span>
                <span>{p._count.tasks} task{p._count.tasks === 1 ? "" : "s"}</span>
              </div>
              <p className="mt-3 text-xs text-dim">
                Owner: <span className="text-muted">{p.owner.name}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
