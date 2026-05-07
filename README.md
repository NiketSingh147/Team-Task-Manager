# Team Task Manager

A full-stack team collaboration app to manage projects, tasks, dependencies, comments, mentions, and notifications with role-based access control.

Built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Live URL

- https://teamtaskmanager-production-d806.up.railway.app

## Features

### Core

- Authentication: email/password signup and login, JWT in httpOnly cookies, bcrypt password hashing.
- Projects and teams: create projects, invite members by email, assign project roles (Admin/Member).
- Kanban task management: To do / In progress / In review / Done, with priority and due date.
- Task detail side panel: full task view with status updates, description, dependencies, activity, and comments.
- Dashboard: project/task stats plus interactive "My tasks" list.
- Role-based access:
  - Global Admin: full access.
  - Project Admin/Owner: manage members and tasks.
  - Project Member: access assigned/created task workflows as allowed.

### Task Features

- Multi-assignee support: admins can assign multiple users to a task.
- Dependency management:
  - Add blockers during task creation.
  - Add/remove blockers in task detail panel.
  - Prevent marking a task Done if active blockers exist.
- Attachments:
  - Upload in task form.
  - View/download from task detail panel.
- Activity timeline per task.
- Markdown descriptions with safe rendering.

### Collaboration

- Comment threads with nested replies.
- Replies collapsed by default with "Load replies" / "Hide replies".
- Mention suggestions in comments (`@name` or `@email`).
- Mentions and notifications panels in navbar:
  - only one panel opens at a time,
  - click outside closes open panel.

### UI/UX

- Dark/light theme toggle (persisted in localStorage).
- Initials avatars for assignees, creator, and navbar user.
- Responsive layout for board, project, and detail panels.
- Single-scroll task detail modal behavior (background scroll lock).

## Tech Stack

- Frontend: Next.js 15 (App Router), React 18, TypeScript
- Styling: Tailwind CSS
- Backend: Next.js Route Handlers
- ORM/DB: Prisma + PostgreSQL
- Auth: jsonwebtoken + bcryptjs
- Validation: Zod
- Hosting: Railway

## Main API Areas

- `/api/auth/*` authentication
- `/api/projects/*` projects, members, tasks
- `/api/tasks/[id]/*` updates, delete, dependencies, comments, attachments, activities
- `/api/notifications/*` notifications and read state
- `/api/mentions` mention feed
- `/api/dashboard` stats + my tasks

## Local Development

1. Install dependencies

```bash
npm install
```

2. Configure environment variables in `.env`

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
```

3. Run migrations and generate Prisma client

```bash
npx prisma migrate dev
npx prisma generate
```

4. Start development server

```bash
npm run dev
```

## Deploy (Railway)

1. Connect GitHub repo to Railway.
2. Add PostgreSQL service.
3. Set env vars:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
4. Deploy.

## Notes

- `tsconfig.tsbuildinfo` should stay ignored (not committed).
- For production schema updates, use `prisma migrate deploy`.

## License

MIT
