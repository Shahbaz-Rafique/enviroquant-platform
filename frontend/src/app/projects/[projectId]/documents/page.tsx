"use client";

import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUpload } from "@/components/documents/document-upload";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { Project, ProjectDocument } from "@/lib/types";


export default function ProjectDocumentsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { user, loading: userLoading } = useRequireAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canUpload = hasPermission(user, PERMISSIONS.DOCUMENT_UPLOAD);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectData, documentData] = await Promise.all([
        apiRequest<Project>(`/projects/${projectId}`),
        apiRequest<ProjectDocument[]>(`/projects/${projectId}/documents`)
      ]);
      setProject(projectData);
      setDocuments(documentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Documents could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [loadDocuments, user]);

  if (userLoading || !user) {
    return null;
  }

  return (
    <AppShell user={user}>
      <PageNavigation
        backHref={`/projects/${projectId}`}
        backLabel="Project workspace"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project?.name ?? "Project", href: `/projects/${projectId}` },
          { label: "Documents" }
        ]}
      />
      <header className="mx-auto mb-5 max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#287451]">Current EIA capability</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-[#18372c]">Evidence library</h1>
        <p className="mt-2 text-sm leading-6 text-[#697a73]">Upload and version the source material used by {project?.name ?? "this project"}. Evidence remains connected to the assessment workspace.</p>
      </header>

      <section className="mx-auto grid max-w-5xl gap-5">
        {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
        {loading ? <Alert>Loading documents...</Alert> : null}

        {canUpload ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5 text-[#287451]" />
                Add evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                canUpload={canUpload}
                projectId={projectId}
                onUploaded={(document) => setDocuments((current) => [document, ...current])}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
          <CardTitle>Evidence and versions</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents} />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#e3eae6] py-4 sm:flex-row">
          <Button asChild variant="secondary">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft />
              Back to project
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/projects/${projectId}`}>Continue to EIA workspace <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
