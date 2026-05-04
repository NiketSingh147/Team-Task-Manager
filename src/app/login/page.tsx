import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";
import { Sparkles } from "lucide-react";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-default">
          <Sparkles className="h-6 w-6 text-brand" />
          TeamTasks
        </Link>
        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-default">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Log in to your account</p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
