ALTER TABLE "TaskComment" ADD COLUMN "parentId" TEXT;
CREATE INDEX "TaskComment_parentId_idx" ON "TaskComment"("parentId");
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
