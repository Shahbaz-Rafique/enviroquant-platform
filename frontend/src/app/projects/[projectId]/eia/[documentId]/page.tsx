"use client";

import { FileSearch } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { EiaDocumentBuilder } from "@/components/eia/eia-document-builder";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Button } from "@/components/ui/button";
import {
  canAccessAuthorPortal,
  canAccessReadOnlyPortal,
  canAccessReviewPortal,
} from "@/lib/permissions";

export default function EiaDocumentBuilderPage() {
  const params = useParams<{ projectId: string; documentId: string }>();
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  if (!canAccessAuthorPortal(user) && !canAccessReadOnlyPortal(user)) {
    return <AppShell user={user}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell user={user}>
      <PageNavigation
        actions={canAccessReviewPortal(user) ? (
          <Button asChild variant="outline">
            <Link href={`/projects/${params.projectId}/eia/${params.documentId}/review`}>
              <FileSearch />
              Review queue
            </Link>
          </Button>
        ) : undefined}
        backHref={`/projects/${params.projectId}`}
        backLabel="Project"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project Workspace", href: `/projects/${params.projectId}` },
          { label: "EIA Builder" }
        ]}
      />

      <EiaDocumentBuilder documentId={params.documentId} projectId={params.projectId} user={user} />
    </AppShell>
  );
}
