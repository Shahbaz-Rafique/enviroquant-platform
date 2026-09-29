"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { AccessDenied } from "@/components/layout/access-denied";
import { PageNavigation } from "@/components/layout/page-navigation";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent } from "@/components/ui/card";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";


export default function NewProjectPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (!hasPermission(user, PERMISSIONS.PROJECT_CREATE)) {
    return <AccessDenied />;
  }

  return (
    <>
      <PageNavigation
        backHref="/projects"
        backLabel="Projects"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "New Project" }
        ]}
      />
      <Card className="overflow-hidden">
        <header className="border-b border-[#e3eae6] px-5 py-5 md:px-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#287451]">New project</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#18372c]">Create a project</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#697a73]">
            Add the core project details. You can build and assign the EIA structure after the project is created.
          </p>
        </header>
        <CardContent className="p-5 md:p-7">
          <ProjectForm />
        </CardContent>
      </Card>
    </>
  );
}
