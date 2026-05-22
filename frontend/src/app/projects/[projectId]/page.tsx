"use client";

import { BookOpenCheck, FilePlus2, FileText, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useRequireAuth } from "@/components/auth/auth-gate";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUpload } from "@/components/documents/document-upload";
import { AppShell } from "@/components/layout/app-shell";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { EiaDocument, EiaDocumentStructure, Project, ProjectDocument } from "@/lib/types";

export default function ProjectWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const { user, loading: userLoading } = useRequireAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [eiaDocuments, setEiaDocuments] = useState<EiaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEia, setCreatingEia] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = hasPermission(user, PERMISSIONS.DOCUMENT_UPLOAD);
  const canManageEia =
    hasPermission(user, PERMISSIONS.PROJECT_CREATE) || hasPermission(user, PERMISSIONS.PROJECT_UPDATE);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectData, documentData, eiaData] = await Promise.all([
        apiRequest<Project>(`/projects/${projectId}`),
        apiRequest<ProjectDocument[]>(`/projects/${projectId}/documents`),
        apiRequest<EiaDocument[]>(`/eia-documents/project/${projectId}`)
      ]);
      setProject(projectData);
      setDocuments(documentData);
      setEiaDocuments(eiaData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  async function createStructuredEia() {
    setCreatingEia(true);
    setError(null);
    try {
      const eiaDocument = await apiRequest<EiaDocumentStructure>(`/eia-documents/project/${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          title: project?.name ? `${project.name} EIA Document` : "New EIA Document"
        })
      });
      setEiaDocuments((current) => [eiaDocument, ...current]);
      router.push(`/projects/${projectId}/eia/${eiaDocument.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "EIA document could not be created");
    } finally {
      setCreatingEia(false);
    }
  }

  useEffect(() => {
    if (user && projectId) {
      loadWorkspace();
    }
  }, [loadWorkspace, projectId, user]);

  if (userLoading || !user) {
    return null;
  }

  return (
    <AppShell user={user}>
      <PageNavigation
        actions={
          <Button variant="secondary" onClick={loadWorkspace}>
            <RefreshCcw />
            Refresh
          </Button>
        }
        backHref="/projects"
        backLabel="Projects"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project?.name ?? "Workspace" }
        ]}
      />
      <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-blue-700">Project Workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">{project?.name ?? "Workspace"}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {project?.description ?? "Document foundation and project metadata."}
          </p>
        </div>
      </header>

      {error ? <Alert className="mb-5 border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
      {loading ? <Alert className="mb-5">Loading workspace...</Alert> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="builder-panel overflow-hidden">
          {/* <div className="bg-[#2369be] px-5 py-3 text-lg font-semibold text-white">
            Section 6 - Project Evidence Workspace
          </div> */}
          <div className="grid">
            <div className="p-5">
              <div className="mb-5 rounded-md border border-slate-300 bg-white p-4">
                <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-base font-bold text-slate-950">
                      <BookOpenCheck className="size-5 text-blue-700" />
                      Structured EIA Documents
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Create checklist-aligned EIA drafts with seeded sections and subsections.
                    </p>
                  </div>
                  {canManageEia ? (
                    <Button type="button" disabled={creatingEia} onClick={createStructuredEia}>
                      {creatingEia ? <RefreshCcw className="animate-spin" /> : <FilePlus2 />}
                      New EIA
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  {!eiaDocuments.length ? (
                    <Alert>No structured EIA documents created yet.</Alert>
                  ) : (
                    eiaDocuments.map((eiaDocument) => (
                      <Link
                        className="grid gap-2 rounded-md border border-slate-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/50 md:grid-cols-[minmax(0,1fr)_auto]"
                        href={`/projects/${projectId}/eia/${eiaDocument.id}`}
                        key={eiaDocument.id}
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-slate-950">{eiaDocument.title}</strong>
                          <span className="mt-1 block text-sm text-slate-500">
                            Standard 8-section EIA checklist structure
                          </span>
                        </div>
                        <Badge>{eiaDocument.status}</Badge>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="mb-5 rounded-md border border-slate-300 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-950">
                  <FileText className="size-5 text-blue-700" />
                  Attach Files & Documents
                </div>
                <DocumentUpload
                  canUpload={canUpload}
                  projectId={projectId}
                  onUploaded={(document) => setDocuments((current) => [document, ...current])}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentList documents={documents} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <aside className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Project Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <dt className="font-semibold text-slate-500">Status</dt>
                  <dd>
                    <Badge>{project?.status ?? "DRAFT"}</Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <dt className="font-semibold text-slate-500">Sector</dt>
                  <dd className="text-right text-slate-800">{project?.sector || "Pending"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <dt className="font-semibold text-slate-500">Country</dt>
                  <dd className="text-right text-slate-800">{project?.country || "Pending"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-500">Documents</dt>
                  <dd className="text-right text-slate-800">{documents.length}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Controls</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-600">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <div className="mb-1 flex items-center gap-2 font-bold text-blue-900">
                  <BookOpenCheck className="size-4" />
                  Evidence-first review
                </div>
                <p>Evaluation runs will stay versioned and traceable to uploaded document versions.</p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/projects/${projectId}/documents`}>
                  <FileText />
                  Open Documents
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}
