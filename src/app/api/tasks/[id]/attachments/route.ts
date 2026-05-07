import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { err, handleError, ok } from "@/lib/api";
import { ensureUploadDir, getUploadAbsolutePath, makeStoredFilename } from "@/lib/uploads";
import { promises as fs } from "fs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 8;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return err("Task not found", 404);
    await requireProjectAccess(task.projectId, user.id, user.role);

    const form = await req.formData();
    const files = form.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) return err("No files uploaded", 400);
    if (files.length > MAX_FILES_PER_REQUEST) return err("Too many files in one upload", 400);

    await ensureUploadDir();

    const attachments = [] as {
      taskId: string;
      uploadedById: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
    }[];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) return err(`File too large: ${file.name}`, 400);
      const storedFilename = makeStoredFilename(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(getUploadAbsolutePath(storedFilename), buffer);

      attachments.push({
        taskId: id,
        uploadedById: user.id,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath: storedFilename,
      });
    }

    await prisma.taskAttachment.createMany({ data: attachments });

    const created = await prisma.taskAttachment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
      take: attachments.length,
    });

    return ok({ attachments: created }, 201);
  } catch (e) {
    return handleError(e);
  }
}
