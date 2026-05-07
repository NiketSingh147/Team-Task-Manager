import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CheckCircle2, Users, BarChart3, Shield, Sparkles } from "lucide-react";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen">
      <nav className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-default">
            <Sparkles className="h-6 w-6 text-brand" />
            TeamTasks
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-1.5 text-xs text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]"></span>
          Built for teams that ship
        </div>
        <h1 className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          Manage your team&apos;s work in one place
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Create projects, assign tasks, track progress, and hit deadlines. Built for small teams who want to move fast.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Get started free
          </Link>
          <Link href="/login" className="btn-outline text-base px-6 py-3">
            I have an account
          </Link>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          <Feature icon={<Users className="h-6 w-6" />} title="Team collaboration" desc="Invite members, assign roles, and keep everyone aligned." />
          <Feature icon={<BarChart3 className="h-6 w-6" />} title="Progress tracking" desc="Dashboards show what's overdue and what's shipping next." />
          <Feature icon={<Shield className="h-6 w-6" />} title="Role-based access" desc="Admin and member roles keep the right people in control." />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card card-hover p-6 text-left">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary-soft))] text-brand">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-default">{title}</h3>
      <p className="mt-2 text-sm text-muted">{desc}</p>
    </div>
  );
}

