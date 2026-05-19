"use client";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { TeamMembers } from "@/components/team/team-members";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default function TeamPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <AppShell user={user}>
      {hasPermission(user, PERMISSIONS.USER_READ) ? <TeamMembers user={user} /> : <AccessDenied />}
    </AppShell>
  );
}
