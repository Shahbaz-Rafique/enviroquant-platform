"use client";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";


export default function NewProjectPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  if (!hasPermission(user, PERMISSIONS.PROJECT_CREATE)) {
    return (
      <AppShell user={user}>
        <AccessDenied />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <PageNavigation
        backHref="/projects"
        backLabel="Projects"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "New Project" }
        ]}
      />
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="border-b border-[#dce6e1] bg-[#f6f9f7] p-3 lg:border-b-0 lg:border-r">
            <p className="px-3 pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#74847d]">EIA setup</p>
            <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label="Project setup sections">
              {[
                ["01", "Introduction", "complete"],
                ["02", "Project description", "active"],
                ["03", "Environmental baseline", "next"],
                ["04", "Impact assessment", "next"],
                ["05", "Mitigation measures", "next"],
                ["06", "Summary & conclusion", "next"]
              ].map(([number, label, state]) => (
                <div
                  className={state === "active"
                    ? "eia-section-menu-active flex items-center gap-3 rounded-lg bg-[#287451] px-3 py-3 text-sm font-semibold shadow-sm"
                    : "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#60736a]"}
                  key={number}
                >
                  <span className={state === "active" ? "text-white/70" : "text-[#96a59e]"}>{number}</span>
                  <span className="min-w-0 truncate">{label}</span>
                  {state === "next" ? <Badge className="ml-auto hidden border-slate-200 bg-slate-100 text-[9px] text-slate-500 xl:inline-flex">Later</Badge> : null}
                </div>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <header className="border-b border-[#e3eae6] px-5 py-5 md:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#287451]">Section 2</p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#18372c]">Project description</h1>
              <p className="mt-2 text-sm text-[#697a73]">Provide detailed information about the proposed project. Evidence and structured EIA sections follow after creation.</p>
            </header>
            <CardContent className="p-5 md:p-7">
              <ProjectForm />
            </CardContent>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
