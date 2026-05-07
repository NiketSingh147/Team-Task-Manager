import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import ProjectView from "@/components/projects/ProjectView";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const access = await requireProjectAccess(id, user.id, user.role);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            attachments: {
              select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            },
            blockedBy: {
              include: { blockerTask: { select: { id: true, title: true, status: true } } },
            },
            blocking: {
              include: { blockedTask: { select: { id: true, title: true, status: true } } },
            },
          },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        },
      },
    });
    if (!project) notFound();

    return (
      <ProjectView
        project={JSON.parse(JSON.stringify(project))}
        myRole={access.role === "ADMIN" ? "ADMIN" : "MEMBER"}
        currentUserId={user.id}
      />
    );
  } catch {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-xl font-semibold text-default">Access denied</h2>
        <p className="mt-2 text-sm text-muted">
          You don&apos;t have access to this project.
        </p>
        <Link href="/projects" className="btn-outline mt-6 inline-flex">
          Back to projects
        </Link>
      </div>
    );
  }
}

