"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { EiaRegulatorInsights } from "@/components/eia/eia-regulator-insights";
import { AccessDenied } from "@/components/layout/access-denied";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Button } from "@/components/ui/button";
import { canAccessRegulatorPortal } from "@/lib/permissions";

export default function EiaRegulatorInsightsPage() {
  const params = useParams<{ projectId: string }>();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (!canAccessRegulatorPortal(user)) {
    return <AccessDenied />;
  }

  return (
    <>
      <PageNavigation
        actions={
          <Button asChild variant="secondary">
            <Link href={`/projects/${params.projectId}/regulator`}>
              <RefreshCcw />
              Reload
            </Link>
          </Button>
        }
        backHref={`/projects/${params.projectId}`}
        backLabel="Project workspace"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project workspace", href: `/projects/${params.projectId}` },
          { label: "Regulator insights" }
        ]}
      />

      <EiaRegulatorInsights projectId={params.projectId} />
    </>
  );
}
