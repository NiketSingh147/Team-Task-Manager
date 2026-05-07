CREATE TYPE "TaskActivityType" AS ENUM (
  'TASK_CREATED','TASK_UPDATED','TASK_DELETED','STATUS_CHANGED','ASSIGNEE_CHANGED','PRIORITY_CHANGED','DUE_DATE_CHANGED','TITLE_CHANGED','DESCRIPTION_CHANGED','COMMENT_ADDED','COMMENT_DELETED','DEPENDENCY_ADDED','DEPENDENCY_REMOVED'
);

CREATE TABLE "TaskDependency" (
  "id" TEXT NOT NULL,
  "blockerTaskId" TEXT NOT NULL,
  "blockedTaskId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaskDependency_blockerTaskId_blockedTaskId_key" ON "TaskDependency"("blockerTaskId", "blockedTaskId");
CREATE INDEX "TaskDependency_blockedTaskId_idx" ON "TaskDependency"("blockedTaskId");
CREATE INDEX "TaskDependency_blockerTaskId_idx" ON "TaskDependency"("blockerTaskId");
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockerTaskId_fkey" FOREIGN KEY ("blockerTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockedTaskId_fkey" FOREIGN KEY ("blockedTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TaskActivity" (
  "id" TEXT NOT NULL,
  "taskId" TEXT,
  "projectId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "TaskActivityType" NOT NULL,
  "message" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");
CREATE INDEX "TaskActivity_projectId_createdAt_idx" ON "TaskActivity"("projectId", "createdAt");
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
