"use client";

import { Leaf, Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { storeSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { TokenResponse } from "@/lib/types";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
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
              <p className="text-sm text-blue-100">EIA Builder</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase text-blue-100">Evidence-based compliance</p>
            <h1 className="mt-3 max-w-sm text-4xl font-bold leading-tight">Environmental intelligence workspace</h1>
            <div className="mt-6 grid gap-3 text-sm text-blue-50">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Tenant-isolated project records
              </span>
              <span className="flex items-center gap-2">
                <Leaf className="size-4" />
                Versioned evidence from the start
              </span>
            </div>
          </div>
        </aside>

        <CardContent className="p-7">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
            {(["login", "register"] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  "h-10 rounded-sm text-sm font-bold capitalize text-slate-600 transition-colors",
                  mode === item && "bg-white text-blue-800 shadow-sm"
                )}
                onClick={() => setMode(item)}
              >
                {item === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

            {mode === "register" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="tenant_name">Organization name</Label>
                  <Input id="tenant_name" name="tenant_name" required minLength={2} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" name="full_name" required minLength={2} />
                </div>
              </>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="tenant_slug">Organization slug</Label>
              <Input id="tenant_slug" name="tenant_slug" placeholder="e.g. env-consult-group" />
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
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : mode === "register" ? (
                <UserPlus />
              ) : (
                <LogIn />
              )}
              {mode === "register" ? "Create Workspace" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
