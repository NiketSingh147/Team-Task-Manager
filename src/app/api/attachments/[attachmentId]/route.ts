import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { err, handleError } from "@/lib/api";
import { getUploadAbsolutePath } from "@/lib/uploads";
import { promises as fs } from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const user = await requireUser();
    const { attachmentId } = await params;

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: { select: { projectId: true } } },
    });
    if (!attachment) return err("Attachment not found", 404);

    await requireProjectAccess(attachment.task.projectId, user.id, user.role);

    const bytes = await fs.readFile(getUploadAbsolutePath(attachment.storagePath));
    return new Response(bytes, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": `inline; filename=\"${attachment.originalName.replace(/\"/g, "")}\"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
