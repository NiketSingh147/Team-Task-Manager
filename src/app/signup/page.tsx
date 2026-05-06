import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SignupForm from "@/components/auth/SignupForm";
import { Sparkles } from "lucide-react";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-default">
          <Sparkles className="h-6 w-6 text-brand" />
          ProjectPulse
        </Link>
        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-default">Create your account</h1>
          <p className="mt-1 text-sm text-muted">
            The first account becomes the workspace admin.
          </p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
