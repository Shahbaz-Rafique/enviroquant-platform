"use client";

import { BookOpenCheck, CheckCircle2, ChevronRight, FilePlus2, FileSearch, FileText, RefreshCcw, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ProjectMap } from "@/components/map/project-map-lazy";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUpload } from "@/components/documents/document-upload";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import {
  canAccessAuthorPortal,
  canAccessRegulatorPortal,
  canAccessReviewPortal,
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import type { EiaDocument, EiaDocumentStructure, Project, ProjectDocument } from "@/lib/types";

export default function ProjectWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [eiaDocuments, setEiaDocuments] = useState<EiaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEia, setCreatingEia] = useState(false);
  const [selectedSourceDocumentId, setSelectedSourceDocumentId] = useState("NONE");
  const [autoGenerateSections, setAutoGenerateSections] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canUpload = hasPermission(user, PERMISSIONS.DOCUMENT_UPLOAD);
  const canManageEia =
    hasPermission(user, PERMISSIONS.PROJECT_CREATE) || hasPermission(user, PERMISSIONS.PROJECT_UPDATE);
  const canAccessRegulatorInsights = canAccessRegulatorPortal(user);
  const reviewerPortal = canAccessReviewPortal(user) && !canAccessAuthorPortal(user);
  const regulatorPortal = canAccessRegulatorPortal(user) && !canAccessAuthorPortal(user) && !reviewerPortal;

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
          title: project?.name ? `${project.name} EIA Document` : "New EIA Document",
          source_document_id: selectedSourceDocumentId !== "NONE" ? selectedSourceDocumentId : null,
          auto_generate_sections: selectedSourceDocumentId !== "NONE" ? autoGenerateSections : false
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

  const sourceDocuments = documents.filter((document) =>
    ["eia_report", "previous_eia", "legacy_report", "supporting_document", "baseline_study"].includes(
      document.document_type
    )
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <PageNavigation
        actions={<Button variant="secondary" onClick={loadWorkspace}><RefreshCcw />Refresh</Button>}
        backHref="/projects"
        backLabel="All projects"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project?.name ?? "Project workspace" }
        ]}
      />
      <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#287451]">Current EIA workspace</p>
            <Badge>{project?.status ?? "DRAFT"}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#18372c]">{project?.name ?? "Workspace"}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697a73]">
            {project?.description ?? "Document foundation and project metadata."}
          </p>
        </div>
      </header>

      {error ? <Alert className="mb-5 border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
      {loading ? <Alert className="mb-5">Loading workspace...</Alert> : null}

      <section className="mb-5 rounded-xl border border-[#dce6e1] bg-white p-4 shadow-[0_6px_20px_rgba(15,45,34,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#18372c]">Current EIA workflow</h2>
            <p className="mt-1 text-xs text-[#697a73]">Start with evidence, create the structured assessment, then move it into review.</p>
          </div>
          <span className="hidden text-xs font-semibold text-[#287451] sm:block">Evidence Before Conclusions™</span>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <WorkflowStep icon={<UploadCloud />} label="1. Add evidence" detail={`${documents.length} file${documents.length === 1 ? "" : "s"}`} />
          <ChevronRight className="hidden size-4 text-[#9aaba3] md:block" />
          <WorkflowStep icon={<BookOpenCheck />} label="2. Build EIA" detail={`${eiaDocuments.length} assessment${eiaDocuments.length === 1 ? "" : "s"}`} />
          <ChevronRight className="hidden size-4 text-[#9aaba3] md:block" />
          <WorkflowStep icon={<CheckCircle2 />} label="3. Review" detail="Traceable checks" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="builder-panel overflow-hidden">
          <div className="grid">
            <div className="p-5">
              <div className="mb-5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-4">
                <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-base font-bold text-white">
                      <BookOpenCheck className="size-5 text-[#B6F7FF]" />
                      Structured EIA Documents
                    </div>
                    <p className="mt-1 text-sm text-white/66">
                      Create an eight-section assessment and optionally seed it from an uploaded source report.
                    </p>
                  </div>
                </div>

                {canManageEia ? (
                  <div className="mb-4 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm font-semibold text-white/78">
                        Source document
                        <Select value={selectedSourceDocumentId} onValueChange={setSelectedSourceDocumentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Create empty checklist EIA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Create empty checklist EIA</SelectItem>
                            {sourceDocuments.map((document) => (
                              <SelectItem key={document.id} value={document.id}>
                                {document.original_filename}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="flex items-center gap-3 text-sm text-white/72">
                        <Checkbox
                          checked={autoGenerateSections && selectedSourceDocumentId !== "NONE"}
                          disabled={selectedSourceDocumentId === "NONE"}
                          onCheckedChange={(checked) => setAutoGenerateSections(Boolean(checked))}
                        />
                        Auto-apply parsed sections into the seeded EIA structure
                      </label>
                    </div>
                    <div className="grid content-end">
                      <Button type="button" disabled={creatingEia} onClick={createStructuredEia}>
                        {creatingEia ? <RefreshCcw className="animate-spin" /> : <FilePlus2 />}
                        Create structured EIA
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3">
                  {!eiaDocuments.length ? (
                    <Alert>No structured EIA yet. Upload source evidence if needed, then create the assessment.</Alert>
                  ) : (
                    eiaDocuments.map((eiaDocument) => (
                      <Link
                        className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-[#67E8F9]/24 hover:bg-white/[0.06] md:grid-cols-[minmax(0,1fr)_auto]"
                        href={regulatorPortal
                          ? `/projects/${projectId}/regulator`
                          : reviewerPortal
                            ? `/projects/${projectId}/eia/${eiaDocument.id}/review`
                            : `/projects/${projectId}/eia/${eiaDocument.id}`}
                        key={eiaDocument.id}
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-white">{eiaDocument.title}</strong>
                          <span className="mt-1 block text-sm text-white/52">
                            {typeof eiaDocument.document_metadata?.auto_structure === "object"
                              ? "Seeded checklist plus parsed source auto-structure"
                              : "Standard 8-section EIA checklist structure"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{eiaDocument.status}</Badge>
                          <span className="hidden items-center gap-1 text-xs font-semibold text-white/52 md:inline-flex">
                            <FileSearch className="size-3.5" />
                            {regulatorPortal ? "Inspect" : reviewerPortal ? "Review" : "Open"}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {canUpload ? (
                <div className="mb-5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-4">
                  <div className="mb-3 flex items-center gap-2 text-base font-bold text-white">
                    <FileText className="size-5 text-[#B6F7FF]" />
                    Attach Files & Documents
                  </div>
                  <DocumentUpload
                    canUpload={canUpload}
                    projectId={projectId}
                    onUploaded={(document) => setDocuments((current) => [document, ...current])}
                  />
                </div>
              ) : null}

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
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="font-semibold text-white/52">Status</dt>
                  <dd>
                    <Badge>{project?.status ?? "DRAFT"}</Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="font-semibold text-white/52">Sector</dt>
                  <dd className="text-right text-white/84">{project?.sector || "Pending"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <dt className="font-semibold text-white/52">Country</dt>
                  <dd className="text-right text-white/84">{project?.country || "Pending"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-white/52">Documents</dt>
                  <dd className="text-right text-white/84">{documents.length}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {project?.latitude && project?.longitude ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">Project site location</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-b-xl" style={{ height: 220 }}>
                  <ProjectMap
                    latitude={project.latitude}
                    longitude={project.longitude}
                    locationName={project.location || project.name}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Review Controls</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-white/66">
              <div className="rounded-lg border border-[#cbe0d5] bg-[#edf6f1] p-3">
                <div className="mb-1 flex items-center gap-2 font-bold text-white">
                  <BookOpenCheck className="size-4" />
                  Controlled human review
                </div>
                <p>Every assignment, status transition, subsection comment, revision request, and approval remains traceable.</p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/projects/${projectId}/documents`}>
                  <FileText />
                  Open Documents
                </Link>
              </Button>
              {canAccessRegulatorInsights ? (
                <Button asChild variant="outline">
                  <Link href={`/projects/${projectId}/regulator`}>
                    <FileSearch />
                    Regulator Insights
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>


        </aside>
      </section>
    </>
  );
}

function WorkflowStep({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#e0e8e4] bg-[#f8faf9] p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e6f2eb] text-[#287451] [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#29483c]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-[#74847d]">{detail}</p>
      </div>
    </div>
  );
}
