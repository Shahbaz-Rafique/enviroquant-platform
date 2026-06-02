"use client";

import { ArrowRight, Leaf, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { BrandMark } from "@/components/site/brand-mark";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { storeSession } from "@/lib/auth";
import type { TokenResponse } from "@/lib/types";

const fieldClassName =
  "h-12 rounded-2xl border border-[#77A63C]/60 bg-white/[0.03] px-4 text-white shadow-none placeholder:text-white/28 focus-visible:ring-2 focus-visible:ring-[#67E8F9]/50";

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
    <main className="relative min-h-screen overflow-hidden bg-gradient px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-9%] top-12 h-72 w-72 rounded-full bg-[#00F5D4]/12 blur-[110px]" />
        <div className="absolute bottom-[-8%] right-[-4%] h-96 w-96 rounded-full bg-[#8BD15F]/12 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_42%)]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(4,17,14,0.58)] shadow-[0_30px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 p-8 sm:p-10 lg:min-h-[720px] lg:border-b-0 lg:border-r lg:border-white/10 lg:p-12">
          <div className="relative z-10">
            <BrandMark />
            <div className="mt-12 max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#67E8F9]/70">
                Self-service organization setup
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-5xl">
                Create the workspace your team will build from.
              </h1>
              <p className="mt-6 text-base leading-8 text-white/72 sm:text-lg">
                Set up your organization, establish the first administrator, and create the governed environment where
                projects, evidence, and delivery stay aligned.
              </p>
              <div className="mt-8 grid gap-4 text-sm text-white/78">
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <ShieldCheck className="size-4 text-[#8BD15F]" />
                  The first user becomes the workspace administrator
                </span>
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <Leaf className="size-4 text-[#67E8F9]" />
                  Projects and evidence remain tenant-isolated
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none relative z-10 mt-10 min-h-56 sm:min-h-64">
            <Image
              src="/images/leaf.png"
              alt="Glowing leaf network"
              fill
              className="object-contain object-right-bottom opacity-90 drop-shadow-[0_0_38px_rgba(0,245,212,0.16)]"
              sizes="(min-width: 1024px) 34vw, 100vw"
            />
          </div>
        </aside>

        <section className="relative p-8 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#67E8F9]/70">Create account</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Register organization
              </h2>
              <p className="mt-3 text-base leading-7 text-white/66">
                Already have an account?{" "}
                <Link
                  className="inline-flex items-center gap-1 font-semibold text-[#8BD15F] transition-colors hover:text-[#A4E374]"
                  href="/login"
                >
                  Sign in
                  <ArrowRight className="size-4" />
                </Link>
              </p>
            </div>

            <form className="mt-8 grid gap-5" onSubmit={submit}>
              {error ? (
                <Alert className="border-red-400/30 bg-red-500/10 text-red-100">
                  {error}
                </Alert>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="organization_name" className="text-sm font-medium text-white/84">
                  Organization name
                </Label>
                <Input
                  id="organization_name"
                  name="organization_name"
                  required
                  minLength={2}
                  className={fieldClassName}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="organization_slug" className="text-sm font-medium text-white/84">
                  Organization slug
                </Label>
                <Input
                  id="organization_slug"
                  name="organization_slug"
                  placeholder="e.g. greentech-consultants"
                  className={fieldClassName}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="full_name" className="text-sm font-medium text-white/84">
                  Full name
                </Label>
                <Input id="full_name" name="full_name" required minLength={2} className={fieldClassName} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/84">
                  Email
                </Label>
                <Input id="email" name="email" type="email" required className={fieldClassName} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-white/84">
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  minLength={10}
                  className={fieldClassName}
                />
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 rounded-2xl bg-[#8BD15F] text-base font-semibold text-[#104A83] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#A4E374]"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Create Workspace
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
