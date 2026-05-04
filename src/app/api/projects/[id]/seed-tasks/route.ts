import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAdmin } from "@/lib/rbac";
import { handleError, ok, err } from "@/lib/api";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const SAMPLE: {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  offsetDays: number | null;
}[] = [
  {
    title: "Welcome! Read this first",
    description:
      "Welcome to your new project. A few quick tips:\n\n- Use the **+** in any column to add a task\n- Set **priority** and **due date** to keep work focused\n- Assign tasks to project members for accountability\n- Markdown is supported in descriptions: `code`, **bold**, and [links](https://example.com)",
    status: "TODO",
    priority: "LOW",
    offsetDays: null,
  },
  {
    title: "Define project goals",
    description:
      "Write down what success looks like.\n\n- [ ] Outcome 1\n- [ ] Outcome 2\n- [ ] Outcome 3",
    status: "TODO",
    priority: "HIGH",
    offsetDays: 3,
  },
  {
    title: "Break work into tasks",
    description: "Split the goals into small, actionable tasks that can be completed in a day or two.",
    status: "TODO",
    priority: "MEDIUM",
    offsetDays: 5,
  },
  {
    title: "Kickoff meeting",
    description: "Align the team on scope, timeline, and roles.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    offsetDays: 1,
  },
  {
    title: "Share progress updates",
    description:
      "Leave a short status update in each task description as it moves through the board.",
    status: "IN_REVIEW",
    priority: "LOW",
    offsetDays: null,
  },
  {
    title: "Invite your team",
    description: "Use the Members panel on the right to invite collaborators by email.",
    status: "DONE",
    priority: "LOW",
    offsetDays: null,
  },
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireProjectAdmin(id, user.id, user.role);

    const existing = await prisma.task.count({ where: { projectId: id } });
    if (existing > 0) {
      return err("Project already has tasks", 400);
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const created = await prisma.$transaction(
      SAMPLE.map((s) =>
        prisma.task.create({
          data: {
            title: s.title,
            description: s.description,
            status: s.status,
            priority: s.priority,
            dueDate: s.offsetDays === null ? null : new Date(now + s.offsetDays * dayMs),
            projectId: id,
            createdById: user.id,
            assigneeId: user.id,
          },
        })
      )
    );

    return ok({ created: created.length }, 201);
  } catch (e) {
    return handleError(e);
  }
}
