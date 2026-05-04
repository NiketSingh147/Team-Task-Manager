# Team Task Manager

A full-stack web app for teams to manage projects, assign tasks, and track progress with role-based access control.

Built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. Deployed on Railway.

## Features

### Core

- **Authentication** — Email + password signup and login with JWT in httpOnly cookies and bcrypt-hashed passwords.
- **Projects & teams** — Create projects, invite members by email, assign per-project Admin or Member roles.
- **Task management** — Create tasks with title, markdown description, priority (Low/Medium/High/Urgent), status (To do / In progress / In review / Done), due date, and assignee.
- **Kanban board** — 2×2 grid layout with status columns, quick status changes via dropdown, edit and delete with undo.
- **Task detail panel** — Click any task card to open a slide-over panel (right half of screen) showing full details, markdown description, and status controls.
- **Dashboard** — Stat cards for all statuses, overdue tasks, total projects. Interactive "My tasks" list with status change dropdowns and clickable task detail view.
- **Role-based access control**
  - **Global Admin** (first user to sign up) sees everything.
  - **Project Admin** (or project owner) can manage members, create/edit/delete tasks.
  - **Project Member** can view the project, change status on tasks they're assigned to or created, and delete their own tasks.

### UI & Experience

- **Dark / Light theme toggle** — Persists to localStorage, respects system preference, no flash on load (inline script sets `data-theme` before hydration).
- **Markdown support** — Task descriptions support full GitHub Flavored Markdown (bold, code, lists, checkboxes, links, tables). Write/Preview tabbed editor in the task form. Rendered with sanitization in cards and detail panels.
- **Undo toast for deletes** — Task and member deletions show a toast notification with a 6-second Undo button that re-creates the item. Project delete uses a styled confirmation modal (not browser `confirm()`).
- **Empty-state onboarding** — New projects with 0 tasks show a friendly onboarding card with tips and a "Add sample tasks" button (admin only) that seeds 6 realistic tasks across all columns.
- **Priority accent bars** — Each task card has a colored left border indicating priority at a glance (slate/blue/orange/red).
- **Assignee avatars** — Initials-based avatar circles on task cards and detail panels.
- **Responsive layout** — Board columns in 2×2 grid (1 col on mobile, 2 on md+), Members panel stacks below on smaller screens.

### Validation & Data Integrity

- **Validation** — All API inputs validated with Zod.
- **Data integrity** — Cascade deletes, unique constraints, and relational foreign keys enforced in Postgres via Prisma.
- **Neon-friendly** — Connection timeout params for cold-start resilience on serverless Postgres.

## Tech Stack

| Layer      | Tech                                    |
| ---------- | --------------------------------------- |
| Frontend   | Next.js 15 (App Router) + React 18      |
| Styling    | Tailwind CSS, custom CSS variables      |
| Icons      | Lucide React                            |
| Markdown   | react-markdown + remark-gfm + rehype-sanitize |
| Backend    | Next.js Route Handlers (REST)           |
| Database   | PostgreSQL (Neon / Railway)             |
| ORM        | Prisma                                  |
| Auth       | JWT (jsonwebtoken) + bcryptjs           |
| Validation | Zod                                     |
| Hosting    | Railway (app + managed Postgres)        |

## Project Structure

```
.
├── prisma/
│   └── schema.prisma              # DB schema: User, Project, ProjectMember, Task
├── src/
│   ├── app/
│   │   ├── api/                   # REST endpoints
│   │   │   ├── auth/              # signup, login, logout, me
│   │   │   ├── projects/          # CRUD + members + tasks + seed-tasks
│   │   │   ├── tasks/[id]/        # update, delete
│   │   │   └── dashboard/         # stats + my tasks
│   │   ├── (app)/                 # authenticated routes
│   │   │   ├── dashboard/
│   │   │   └── projects/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── layout.tsx             # ThemeProvider + ToastProvider
│   │   ├── globals.css            # Dark/light theme variables + component styles
│   │   └── page.tsx               # landing
│   ├── components/
│   │   ├── auth/                  # LoginForm, SignupForm
│   │   ├── dashboard/             # MyTaskList (interactive task list + detail panel)
│   │   ├── layout/                # AppNav, ThemeToggle
│   │   ├── projects/              # ProjectView, MemberList, NewProjectButton, ProjectOnboarding
│   │   ├── providers/             # ThemeProvider, ToastProvider
│   │   ├── tasks/                 # TaskBoard, TaskFormModal, PriorityBadge, StatusBadge
│   │   └── ui/                    # Markdown, MarkdownEditor
│   └── lib/
│       ├── prisma.ts              # Prisma singleton
│       ├── auth.ts                # JWT, bcrypt, session cookie
│       ├── rbac.ts                # project access checks
│       ├── api.ts                 # response helpers
│       └── utils.ts               # cn(), formatDate(), isOverdue()
├── nixpacks.toml                  # Railway build config
├── railway.json
└── package.json
```

## REST API

All endpoints return JSON. Auth is required for everything except `/api/auth/signup` and `/api/auth/login`.

| Method | Path                                         | Description                              |
| ------ | -------------------------------------------- | ---------------------------------------- |
| POST   | `/api/auth/signup`                           | Create account, sets session cookie      |
| POST   | `/api/auth/login`                            | Log in, sets session cookie              |
| POST   | `/api/auth/logout`                           | Clear session                            |
| GET    | `/api/auth/me`                               | Current user                             |
| GET    | `/api/projects`                              | List projects I can access               |
| POST   | `/api/projects`                              | Create project (I become Admin/owner)    |
| GET    | `/api/projects/:id`                          | Project detail with members + tasks      |
| PATCH  | `/api/projects/:id`                          | Update (project admin)                   |
| DELETE | `/api/projects/:id`                          | Delete (owner or global admin)           |
| POST   | `/api/projects/:id/members`                  | Add member by email (project admin)      |
| PATCH  | `/api/projects/:id/members/:memberId`        | Change member role (project admin)       |
| DELETE | `/api/projects/:id/members/:memberId`        | Remove member (project admin)            |
| POST   | `/api/projects/:id/tasks`                    | Create task                              |
| POST   | `/api/projects/:id/seed-tasks`               | Seed sample tasks for onboarding (admin) |
| PATCH  | `/api/tasks/:id`                             | Update task                              |
| DELETE | `/api/tasks/:id`                             | Delete task                              |
| GET    | `/api/dashboard`                             | Stats + my tasks                         |

## Local Development

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use a free instance from Neon / Supabase / Railway)

### 2. Install

```bash
npm install
```

### 3. Configure env

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/teamtasks?connect_timeout=30"
JWT_SECRET="generate-a-long-random-string-here"
```

### 4. Run migrations

```bash
npx prisma migrate dev --name init
```

### 5. Start dev server

```bash
npm run dev
```

Open http://localhost:3000. The first account you create becomes the global admin.

## Deploy to Railway

1. **Push to GitHub.**
2. **Create a Railway project** at [railway.app](https://railway.app) → *New Project* → *Deploy from GitHub repo*.
3. **Add a PostgreSQL database** to the project (*+ New* → *Database* → *Add PostgreSQL*).
4. **Set environment variables** on the app service:
   - `DATABASE_URL` → reference the Postgres service: `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → a long random string (e.g. `openssl rand -hex 48`)
   - `NODE_ENV` → `production`
5. **Generate a public domain** on the app service (Settings → Networking → Generate Domain).
6. Railway will build using `nixpacks.toml`, which runs `prisma migrate deploy` automatically, then starts the server with `npm run start`.

The app listens on `$PORT`, which Railway sets automatically.

## Theme System

The app uses CSS custom properties for theming. Two palettes are defined in `globals.css`:

- `:root` / `[data-theme="dark"]` — Dark purple theme (default)
- `[data-theme="light"]` — Clean light theme

Theme preference is stored in `localStorage` under `tt-theme`. An inline script in `<head>` applies the theme before React hydrates to prevent flash. The toggle button is in the top navigation bar.

## Role Model

- **Global role (on User):** `ADMIN` or `MEMBER`. First signup gets `ADMIN`.
- **Project role (on ProjectMember):** `ADMIN` or `MEMBER`.
- The project **owner** is always treated as a project admin and cannot be removed.
- A **Global Admin** has full access to every project.

## Database Schema (simplified)

```
User (id, email, name, passwordHash, role)
  ├── ownedProjects → Project (ownerId)
  ├── memberships → ProjectMember (userId)
  ├── assignedTasks → Task (assigneeId)
  └── createdTasks → Task (createdById)

Project (id, name, description, ownerId)
  ├── members → ProjectMember
  └── tasks → Task

ProjectMember (id, projectId, userId, role) — unique(projectId, userId)

Task (id, title, description, status, priority, dueDate,
      projectId, assigneeId, createdById)
```

## License

MIT
