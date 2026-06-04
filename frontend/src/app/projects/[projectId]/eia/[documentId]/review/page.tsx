"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { EiaReviewCenter } from "@/components/eia/eia-review-center";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Button } from "@/components/ui/button";

export default function EiaReviewCenterPage() {
  const params = useParams<{ projectId: string; documentId: string }>();
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
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
        backLabel="EIA Builder"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project Workspace", href: `/projects/${params.projectId}` },
          { label: "EIA Builder", href: `/projects/${params.projectId}/eia/${params.documentId}` },
          { label: "Review Center" }
        ]}
      />

      <EiaReviewCenter documentId={params.documentId} projectId={params.projectId} user={user} />
    </AppShell>
  );
}
