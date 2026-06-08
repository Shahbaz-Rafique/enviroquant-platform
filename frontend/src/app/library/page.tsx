"use client";

import { BookOpen } from "lucide-react";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { DocumentLibraryManager } from "@/components/documents/document-library-manager";
import { AccessDenied } from "@/components/layout/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default function LibraryPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return null;
  }

  const canReadDocuments = hasPermission(user, PERMISSIONS.DOCUMENT_READ);

  return (
    <AppShell user={user}>
      <PageNavigation
        breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Library" }]}
        actions={
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/72">
            <BookOpen className="size-4 text-[#B6F7FF]" />
            Team Document Access
          </div>
        }
      />
      {canReadDocuments ? <DocumentLibraryManager user={user} /> : <AccessDenied />}
    </AppShell>
  );
}
