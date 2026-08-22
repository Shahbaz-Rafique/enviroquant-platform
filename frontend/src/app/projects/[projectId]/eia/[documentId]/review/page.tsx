"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { EiaReviewPortal } from "@/components/eia/eia-review-portal";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Button } from "@/components/ui/button";
import { canAccessReviewPortal } from "@/lib/permissions";

export default function EiaReviewCenterPage() {
  const params = useParams<{ projectId: string; documentId: string }>();
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  if (!canAccessReviewPortal(user)) {
    return <AppShell user={user}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell user={user}>
      <PageNavigation
        actions={
          <Button asChild variant="secondary">
            <Link href={`/projects/${params.projectId}/eia/${params.documentId}/review`}>
              <RefreshCcw />
              Reload
            </Link>
          </Button>
        }
        backHref={`/projects/${params.projectId}/eia/${params.documentId}`}
        backLabel="EIA dashboard"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project workspace", href: `/projects/${params.projectId}` },
          { label: "EIA dashboard", href: `/projects/${params.projectId}/eia/${params.documentId}` },
          { label: "Review center" }
        ]}
      />

      <EiaReviewPortal documentId={params.documentId} projectId={params.projectId} />
    </AppShell>
  );
}
