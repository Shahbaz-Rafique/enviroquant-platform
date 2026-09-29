"use client";

import { ArrowRight, FileSearch, Loader2, RefreshCcw, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { DocumentUpload } from "@/components/documents/document-upload";
import { AccessDenied } from "@/components/layout/access-denied";
import { PageNavigation } from "@/components/layout/page-navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";
import { canAccessAuthorPortal, canAccessReadOnlyPortal, canAccessReviewPortal, hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { EiaDocument, EiaDocumentStructure, ProjectDocument } from "@/lib/types";

export default function ProjectQualityReviewPage() {
  const params = useParams<{ projectId?: string }>();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? searchParams.get("projectId") ?? "";
  const embedded = !params.projectId;
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [reviews, setReviews] = useState<EiaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = hasPermission(user, PERMISSIONS.DOCUMENT_UPLOAD);
  const canCreateReview = hasPermission(user, PERMISSIONS.PROJECT_CREATE) || hasPermission(user, PERMISSIONS.PROJECT_UPDATE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectDocuments, eiaDocuments] = await Promise.all([
        apiRequest<ProjectDocument[]>(`/projects/${projectId}/documents`),
        apiRequest<EiaDocument[]>(`/eia-documents/project/${projectId}`)
      ]);
      setDocuments(projectDocuments);
      setReviews(eiaDocuments.filter((item) => item.document_metadata?.workflow_type === "quality_review"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quality Review workspace could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (user) void load();
  }, [load, user]);

  const uploadedEias = useMemo(
    () => documents.filter((item) => ["eia_report", "previous_eia", "legacy_report"].includes(item.document_type)),
    [documents]
  );

  async function createReview(source: ProjectDocument) {
    setCreatingFor(source.id);
    setError(null);
    try {
      const review = await apiRequest<EiaDocumentStructure>(`/eia-documents/project/${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          title: `${source.original_filename.replace(/\.(pdf|docx?|PDF|DOCX?)$/, "")} — RQEIA Quality Review`,
          source_document_id: source.id,
          source_version_id: source.current_version_id ?? null,
          auto_generate_sections: true,
          metadata: {
            workflow_type: "quality_review",
            source_filename: source.original_filename,
            methodology: "RQEIA detailed review requirements"
          }
        })
      });
      router.push(`/projects/${projectId}/eia/${review.id}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quality Review could not be created");
    } finally {
      setCreatingFor(null);
    }
  }

  async function deleteReview(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await apiRequest(`/eia-documents/${id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review workspace could not be deleted");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (!user || !projectId) return null;
  if (!canAccessReviewPortal(user) && !canAccessAuthorPortal(user) && !canAccessReadOnlyPortal(user)) return <AccessDenied />;

  return (
    <>
      {!embedded ? <PageNavigation
        backHref={`/projects/${projectId}`}
        backLabel="Project workspace"
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Project", href: `/projects/${projectId}` },
          { label: "EIA Quality Review" }
        ]}
        actions={<Button variant="secondary" onClick={() => void load()}><RefreshCcw />Refresh</Button>}
      /> : null}

      <div className="grid gap-5">
        {!embedded ? <section className="overflow-hidden rounded-[28px] border border-[#174c3a] bg-[#062a22] text-white shadow-[0_24px_70px_rgba(6,42,34,0.22)]">
          <div className="grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <Badge className="border-[#8bd15f]/30 bg-[#8bd15f]/10 text-[#c9f7a8]">Separate review module</Badge>
              <h1 className="mt-3 text-3xl font-bold">EIA Quality Review &amp; Decision Readiness</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
                Upload a completed EIA for independent analysis against the detailed RQEIA methodology. This creates a review workspace and report; it does not treat the uploaded report as a new EIA Builder draft.
              </p>
            </div>
            <ShieldCheck className="size-16 text-[#8bd15f]" />
          </div>
          <div className="grid border-t border-white/10 text-sm md:grid-cols-4 md:divide-x md:divide-white/10">
            {["1. Upload existing EIA", "2. Run RQEIA analysis", "3. Improve and re-analyse", "4. Export Word or PDF"].map((step) => (
              <div className="px-5 py-4 font-semibold text-white/78" key={step}>{step}</div>
            ))}
          </div>
        </section> : null}

        {error ? <Alert className="border-red-300 bg-red-50 text-red-800">{error}</Alert> : null}
        {loading ? <Alert>Loading Quality Review workspace...</Alert> : null}

        {canUpload && canCreateReview ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UploadCloud className="size-5" />Upload an existing EIA</CardTitle>
              <CardDescription>Upload the complete PDF or Word EIA. After upload, EnviroQuant creates a separate RQEIA review workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                canUpload
                projectId={projectId}
                onUploaded={(document) => {
                  setDocuments((current) => [document, ...current]);
                  void createReview(document);
                }}
              />
              {creatingFor ? <Alert className="mt-4"><Loader2 className="mr-2 inline size-4 animate-spin" />Preparing the RQEIA review workspace...</Alert> : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Existing uploaded EIAs</CardTitle>
              <CardDescription>Start a separate Quality Review from a report already in this project.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!uploadedEias.length ? <Alert>No uploaded EIA reports are available yet.</Alert> : null}
              {uploadedEias.map((document) => (
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-4 sm:flex-row sm:items-center" key={document.id}>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-[#18372c]">{document.original_filename}</strong>
                    <span className="mt-1 block text-xs text-[#697a73]">{document.document_type.replaceAll("_", " ")}</span>
                  </div>
                  {canCreateReview ? (
                    <Button disabled={creatingFor === document.id} onClick={() => void createReview(document)}>
                      {creatingFor === document.id ? <Loader2 className="animate-spin" /> : <FileSearch />}
                      Start review
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Review workspaces</CardTitle>
              <CardDescription>Continue findings, improvement, re-analysis and report export.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!reviews.length ? <Alert>No separate Quality Review workspace has been created.</Alert> : null}
              {reviews.map((review) => (
                <div key={review.id} className="overflow-hidden rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
                  <Link className="flex items-center justify-between gap-3 p-4 hover:bg-[#edf6f1]" href={`/projects/${projectId}/eia/${review.id}/review`}>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-[#18372c]">{review.title}</strong>
                      <span className="mt-1 block text-xs text-[#697a73]">RQEIA findings and decision readiness</span>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-[#287451]" />
                  </Link>
                  {canCreateReview ? (
                    <div className="border-t border-[#e3eae6] px-4 py-2.5">
                      {confirmDeleteId === review.id ? (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#697a73]">Delete this review workspace permanently?</span>
                          <Button
                            size="sm"
                            disabled={deletingId === review.id}
                            onClick={() => void deleteReview(review.id)}
                          >
                            {deletingId === review.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                            Yes, delete
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs text-[#9aaba3] transition-colors hover:text-red-600"
                          onClick={() => setConfirmDeleteId(review.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete workspace
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
