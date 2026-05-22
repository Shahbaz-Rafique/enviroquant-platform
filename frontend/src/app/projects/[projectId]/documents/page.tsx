"use client";

import { ArrowLeft, FileText } from "lucide-react";
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
        backLabel="Project"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project?.name ?? "Project", href: `/projects/${projectId}` },
          { label: "Documents" }
        ]}
      />
      <header className="mx-auto mb-5 max-w-5xl text-center">
        <h1 className="text-3xl font-bold text-slate-950">Submit Your Project</h1>
        <p className="mt-2 text-sm text-slate-600">{project?.name ?? "Project document workspace"}</p>
      </header>

      <div className="mx-auto mb-4 grid max-w-5xl grid-cols-2 overflow-hidden rounded-md border border-slate-300 bg-white text-center text-sm font-bold text-[#164577] md:grid-cols-6">
        {["Project Details", "Location Info", "Environmental Data", "Survey & Studies", "Add Information", "Review & Submit"].map(
          (step) => (
            <div
              key={step}
              className={`border-r border-slate-300 px-3 py-3 last:border-r-0 ${
                step === "Add Information" ? "bg-[#2c76bd] text-white" : ""
              }`}
            >
              {step}
            </div>
          )
        )}
      </div>

      <section className="mx-auto grid max-w-5xl gap-5">
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
        {loading ? <Alert>Loading documents...</Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-blue-700" />
              Attach Files & Documents
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

        <Card>
          <CardHeader>
            <CardTitle>Document Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents} />
          </CardContent>
        </Card>

        <div className="flex justify-between border-t border-slate-300 py-4">
          <Button asChild variant="secondary">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/projects/${projectId}`}>Next Step</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
