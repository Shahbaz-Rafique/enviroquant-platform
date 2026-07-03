"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { BrandMark } from "@/components/site/brand-mark";
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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-12 h-72 w-72 rounded-full bg-[#00F5D4]/12 blur-[110px]" />
        <div className="absolute bottom-[-8%] right-[-4%] h-96 w-96 rounded-full bg-[#8BD15F]/12 blur-[130px]" />
      </div>
      <Card className="grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 p-8 sm:p-10 lg:min-h-[660px] lg:border-b-0 lg:border-r lg:border-white/10 lg:p-12">
          <div className="relative z-10">
            <BrandMark />
            <p className="mt-12 text-xs font-semibold uppercase tracking-[0.32em] text-[#67E8F9]/70">
              Invitation setup
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-5xl">
              Activate your workspace access.
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-white/72">
              Set your password and complete the final step to enter the EnviroQuant workspace under your organization.
            </p>
          </div>
          <div className="pointer-events-none relative z-10 mt-10 min-h-56 sm:min-h-64">
            <Image
              src="/images/green-world.png"
              alt="Glowing earth network"
              fill
              className="object-contain object-right-bottom opacity-90 drop-shadow-[0_0_38px_rgba(0,245,212,0.16)]"
              sizes="(min-width: 1024px) 34vw, 100vw"
            />
          </div>
        </aside>

        <CardContent className="p-8 sm:p-10 lg:p-12">
          <div className="mb-6 flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#67E8F9]/20 bg-[#67E8F9]/10 text-[#B6F7FF]">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Accept invitation</h1>
              <p className="mt-2 text-sm leading-6 text-white/66">
                Set your password to activate your EnviroQuant organization account.
              </p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" name="password" required minLength={10} />
            </div>

            <Button type="submit" className="h-12 rounded-2xl" disabled={loading || !token}>
              {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
              Activate Account
            </Button>
          </form>

          <p className="mt-5 text-sm text-white/62">
            Already activated?{" "}
            <Link className="font-semibold text-[#8BD15F] hover:text-[#A4E374]" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
