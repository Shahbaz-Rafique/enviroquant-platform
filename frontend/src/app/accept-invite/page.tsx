"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { storeSession } from "@/lib/auth";
import type { TokenResponse } from "@/lib/types";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "Invitation token is missing.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);

    try {
      const session = await apiRequest<TokenResponse>("/auth/accept-invite", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          token,
          full_name: String(form.get("full_name") ?? "") || null,
          password: String(form.get("password") ?? "")
        })
      });
      storeSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation could not be accepted");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#edf3fb] p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-800">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Accept invitation</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Set your password to activate your EnviroQuant organization account.
              </p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={10} />
            </div>

            <Button type="submit" className="h-10" disabled={loading || !token}>
              {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
              Activate Account
            </Button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Already activated?{" "}
            <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
