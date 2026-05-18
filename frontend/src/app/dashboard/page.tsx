"use client";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsOverview } from "@/components/projects/projects-overview";


export default function DashboardPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <AppShell user={user}>
      <ProjectsOverview user={user} />
    </AppShell>
  );
}
