import path from "path";
import { promises as fs } from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "task-files");

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function makeStoredFilename(originalName: string) {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`;
}

export function getUploadAbsolutePath(storedFilename: string) {
  return path.join(UPLOAD_DIR, storedFilename);
}
