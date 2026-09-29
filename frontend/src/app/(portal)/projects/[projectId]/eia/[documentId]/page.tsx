"use client";

import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { EiaDocumentBuilder } from "@/components/eia/eia-document-builder";
import { AccessDenied } from "@/components/layout/access-denied";
import { PageNavigation } from "@/components/layout/page-navigation";
import {
  canAccessAuthorPortal,
  canAccessReadOnlyPortal,
} from "@/lib/permissions";

export default function EiaDocumentBuilderPage() {
  const params = useParams<{ projectId: string; documentId: string }>();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (!canAccessAuthorPortal(user) && !canAccessReadOnlyPortal(user)) {
    return <AccessDenied />;
  }

  return (
    <>
      <PageNavigation
        backHref={`/projects/${params.projectId}`}
        backLabel="Back to project"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project", href: `/projects/${params.projectId}` },
          { label: "EIA report" }
        ]}
      />

      <EiaDocumentBuilder documentId={params.documentId} projectId={params.projectId} user={user} />
    </>
  );
}
