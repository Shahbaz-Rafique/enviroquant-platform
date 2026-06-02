"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { SubsectionWorkspace } from "@/components/Workspace/SubsectionWorkspace";
import { Button } from "@/components/ui/button";

export default function EiaSubsectionWorkspacePage() {
  const params = useParams<{ projectId: string; documentId: string; subsectionId: string }>();
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <AppShell user={user}>
      <PageNavigation
        actions={
          <Button asChild variant="secondary">
            <Link href={`/projects/${params.projectId}/eia/${params.documentId}/subsection/${params.subsectionId}`}>
              <RefreshCcw />
              Reload
            </Link>
          </Button>
        }
        backHref={`/projects/${params.projectId}/eia/${params.documentId}`}
        backLabel="EIA Builder"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project Workspace", href: `/projects/${params.projectId}` },
          { label: "EIA Builder", href: `/projects/${params.projectId}/eia/${params.documentId}` },
          { label: "Subsection" }
        ]}
      />
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#67E8F9]">Subsection Workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Checklist-Aligned Editor</h1>
        </div>
      </div>

      <SubsectionWorkspace
        documentId={params.documentId}
        projectId={params.projectId}
        subsectionId={params.subsectionId}
        user={user}
      />
    </AppShell>
  );
}
