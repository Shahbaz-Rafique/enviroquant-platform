"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { EiaReviewCenter } from "@/components/eia/eia-review-center";
import { AccessDenied } from "@/components/layout/access-denied";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Button } from "@/components/ui/button";
import { canAccessAuthorPortal, canAccessReadOnlyPortal, canAccessReviewPortal } from "@/lib/permissions";

export default function EiaReviewCenterPage() {
  const params = useParams<{ projectId: string; documentId: string }>();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (!canAccessReviewPortal(user) && !canAccessAuthorPortal(user) && !canAccessReadOnlyPortal(user)) {
    return <AccessDenied />;
  }

  return (
    <>
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
          { label: "AI Quality Review" }
        ]}
      />

      <EiaReviewCenter documentId={params.documentId} projectId={params.projectId} user={user} />
    </>
  );
}
