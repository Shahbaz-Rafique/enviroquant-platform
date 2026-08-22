"use client";

import { Leaf, Loader2, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { BrandMark } from "@/components/site/brand-mark";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { storeSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { TokenResponse } from "@/lib/types";

type Mode = "login" | "register";

const fieldClassName =
  "h-12 rounded-2xl border border-[#77A63C]/60 bg-white/[0.03] px-4 text-white shadow-none placeholder:text-white/28 focus-visible:ring-2 focus-visible:ring-[#67E8F9]/50";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const hero =
    mode === "register"
      ? {
          eyebrow: "Workspace setup",
          title: "Start the restoration with a new organization workspace.",
          description:
            "Create the first account for your team and establish the governed space where projects, evidence, and decisions stay connected from day one.",
          image: "/images/leaf.png",
          imageAlt: "Glowing leaf network"
        }
      : {
          eyebrow: "Environmental intelligence workspace",
          title: "Sign in to continue building with evidence and clarity.",
          description:
            "Access your EnviroQuant workspace, recover project context quickly, and move back into governed EIA delivery without losing traceability.",
          image: "/images/green-world.png",
          imageAlt: "Glowing earth network"
        };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            tenant_name: String(form.get("tenant_name") ?? ""),
            tenant_slug: String(form.get("tenant_slug") ?? "") || null,
            full_name: String(form.get("full_name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? "")
          }
        : {
            tenant_slug: String(form.get("tenant_slug") ?? "") || null,
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? "")
          };

    setLoading(true);
    setError(null);
    try {
      const session = await apiRequest<TokenResponse>(
        mode === "register" ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify(payload)
        }
      );
      storeSession(session);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-10 h-72 w-72 rounded-full bg-[#00F5D4]/12 blur-[110px]" />
        <div className="absolute bottom-[-8%] right-[-6%] h-80 w-80 rounded-full bg-[#8BD15F]/12 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_42%)]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(4,17,14,0.58)] shadow-[0_30px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 p-8 sm:p-10 lg:min-h-[720px] lg:border-b-0 lg:border-r lg:border-white/10 lg:p-12">
          <div className="relative z-10">
            <BrandMark />
            <div className="mt-12 max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#67E8F9]/70">
                {hero.eyebrow}
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-5xl">
                {hero.title}
              </h1>
              <p className="mt-6 text-base leading-8 text-white/72 sm:text-lg">
                {hero.description}
              </p>
              <div className="mt-8 grid gap-4 text-sm text-white/78">
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <ShieldCheck className="size-4 text-[#8BD15F]" />
                  Controlled workspace access and tenant isolation
                </span>
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <Leaf className="size-4 text-[#67E8F9]" />
                  Evidence, projects, and review context stay connected
                </span>
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <Sparkles className="size-4 text-[#8BD15F]" />
                  Built for AI-assisted environmental delivery
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute  inset-0">
            <Image
              src={hero.image}
              alt={hero.imageAlt}
              fill
              className="object-contain object-right-bottom opacity-20 backdrop-blur-md"
              sizes="(min-width: 1024px) 34vw, 100vw"
            />
          </div>
        </aside>

        <section className="relative p-8 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-xl">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-1.5">
              <div className="grid grid-cols-2 gap-2">
                {(["login", "register"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      "h-11 rounded-2xl text-sm font-semibold transition-all duration-300",
                      mode === item
                        ? "bg-[#8BD15F] text-[#104A83] shadow-[0_12px_24px_rgba(139,209,95,0.22)]"
                        : "text-white/66 hover:bg-white/6 hover:text-white"
                    )}
                    disabled={loading}
                    onClick={() => setMode(item)}
                  >
                    {item === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {mode === "register" ? "Create workspace access" : "Welcome back"}
              </h2>
              <p className="mt-3 text-base leading-7 text-white/66">
                {mode === "register"
                  ? "Add your organization details and create the first account for the workspace."
                  : "Sign in to open your dashboard, projects, and environmental review workflows."}
              </p>
            </div>

            <form aria-busy={loading} className="mt-8 grid gap-5" onSubmit={submit}>
              {error ? (
                <Alert className="border-red-400/30 bg-red-500/10 text-red-100">
                  {error}
                </Alert>
              ) : null}

              {mode === "register" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="tenant_name" className="text-sm font-medium text-white/84">
                      Organization name
                    </Label>
                    <Input
                      id="tenant_name"
                      name="tenant_name"
                      required
                      minLength={2}
                      className={fieldClassName}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="full_name" className="text-sm font-medium text-white/84">
                      Full name
                    </Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      required
                      minLength={2}
                      className={fieldClassName}
                    />
                  </div>
                </>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="tenant_slug" className="text-sm font-medium text-white/84">
                  Organization slug
                </Label>
                <Input
                  id="tenant_slug"
                  name="tenant_slug"
                  placeholder="e.g. env-consult-group"
                  className={fieldClassName}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/84">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={fieldClassName}
                />
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
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {mode === "register" ? "Creating workspace..." : "Signing in..."}
                  </>
                ) : mode === "register" ? (
                  <>
                    <UserPlus />
                    Create Workspace
                  </>
                ) : (
                  <>
                    <LogIn />
                    Sign In
                  </>
                )}
              </Button>
              <span className="sr-only" aria-live="polite">
                {loading
                  ? mode === "register"
                    ? "Creating your workspace"
                    : "Signing you in"
                  : ""}
              </span>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
