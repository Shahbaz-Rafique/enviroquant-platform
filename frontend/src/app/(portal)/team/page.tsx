"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { AccessDenied } from "@/components/layout/access-denied";
import { TeamMembers } from "@/components/team/team-members";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default function TeamPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return hasPermission(user, PERMISSIONS.USER_READ) ? <TeamMembers user={user} /> : <AccessDenied />;
}
