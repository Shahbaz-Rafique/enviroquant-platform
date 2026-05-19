"use client";

import { Leaf, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { storeSession } from "@/lib/auth";
import type { TokenResponse } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      organization_name: String(form.get("organization_name") ?? ""),
      organization_slug: String(form.get("organization_slug") ?? "") || null,
      full_name: String(form.get("full_name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? "")
    };

    setLoading(true);
    setError(null);
    try {
      const session = await apiRequest<TokenResponse>("/auth/register", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify(payload)
      });
      storeSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#edf3fb] p-4">
      <Card className="grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.85fr_1fr]">
        <aside className="builder-topbar flex min-h-72 flex-col justify-between p-8 lg:min-h-[600px]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#8bd15f] text-sm font-black text-[#104a83]">
              EQ
            </span>
            <div>
              <p className="text-xl font-bold">EnviroQuant</p>
              <p className="text-sm text-blue-100">Organization setup</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase text-blue-100">Self-service workspace</p>
            <h1 className="mt-3 max-w-sm text-4xl font-bold leading-tight">Create your organization account</h1>
            <div className="mt-6 grid gap-3 text-sm text-blue-50">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                The first user becomes organization admin
              </span>
              <span className="flex items-center gap-2">
                <Leaf className="size-4" />
                Projects and evidence stay tenant-isolated
              </span>
            </div>
          </div>
        </aside>

        <CardContent className="p-7">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-950">Register organization</h2>
            <p className="mt-2 text-sm text-slate-600">
              Already have an account?{" "}
              <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/login">
                Sign in
              </Link>
            </p>
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

            <div className="grid gap-2">
              <Label htmlFor="organization_name">Organization name</Label>
              <Input id="organization_name" name="organization_name" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization_slug">Organization slug</Label>
              <Input id="organization_slug" name="organization_slug" placeholder="e.g. greentech-consultants" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={10} />
            </div>

            <Button type="submit" className="mt-2 h-10" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Create Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
