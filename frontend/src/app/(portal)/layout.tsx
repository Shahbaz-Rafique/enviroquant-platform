"use client";

import type { ReactNode } from "react";

import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  return <AppShell user={user}>{children}</AppShell>;
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  );
}
