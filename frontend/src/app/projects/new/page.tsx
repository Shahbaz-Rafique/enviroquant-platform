"use client";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-blue-700">Section 2</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Project Description</h1>
          <p className="mt-2 text-sm text-slate-600">Provide detailed information about the proposed project.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
