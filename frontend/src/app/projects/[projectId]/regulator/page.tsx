"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { EiaRegulatorInsights } from "@/components/eia/eia-regulator-insights";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Button } from "@/components/ui/button";
import { canAccessRegulatorPortal } from "@/lib/permissions";

export default function EiaRegulatorInsightsPage() {
  const params = useParams<{ projectId: string }>();
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  if (!canAccessRegulatorPortal(user)) {
    return <AppShell user={user}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell user={user}>
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
        backLabel="Project"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project Workspace", href: `/projects/${params.projectId}` },
          { label: "Regulator Insights" }
        ]}
      />

      <EiaRegulatorInsights projectId={params.projectId} />
    </AppShell>
  );
}
