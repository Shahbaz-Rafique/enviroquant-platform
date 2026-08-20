"use client";

import { ClipboardCheck, History, ListChecks, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EiaActivityFeed } from "@/components/eia/eia-activity-feed";
import { EiaReviewQueue } from "@/components/eia/eia-review-queue";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { EiaActivityItem, EiaDocumentStructure } from "@/lib/types";

type ReviewPortalProps = {
  documentId: string;
  projectId: string;
};

type ReviewView = "queue" | "approvals" | "activity";

const workflow = [
  "Not Started",
  "Assigned",
  "In Progress",
  "Ready for Review",
  "Under Review",
  "Revision Required",
  "Approved",
];

export function EiaReviewPortal({ documentId, projectId }: ReviewPortalProps) {
  const router = useRouter();
  const [document, setDocument] = useState<EiaDocumentStructure | null>(null);
  const [activity, setActivity] = useState<EiaActivityItem[]>([]);
  const [view, setView] = useState<ReviewView>("queue");
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const [nextDocument, nextActivity] = await Promise.all([
        apiRequest<EiaDocumentStructure>(`/eia-documents/${documentId}`),
        apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`),
      ]);
      setDocument(nextDocument);
      setActivity(nextActivity);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review portal could not be loaded");
    }
  }, [documentId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  function openSubsection(subsectionId: string) {
    router.push(
      `/projects/${projectId}/eia/${documentId}/subsection/${subsectionId}`,
    );
  }

  return (
    <div className="grid gap-5">
      <header className="builder-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#e3eae6] p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="border-blue-200 bg-blue-50 text-blue-700">Reviewer portal</Badge>
            <h1 className="mt-3 text-2xl font-bold text-[#18372c]">
              {document?.title ?? "Human review workspace"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697a73]">
              Review assigned subsections, connect comments to the relevant subsection, request revisions, or approve completed work.
            </p>
          </div>
          <div className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] px-4 py-3 text-xs font-semibold text-[#52675e]">
            AI evaluation is not part of this review workflow.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4" aria-label="Review workflow statuses">
          {workflow.map((status, index) => (
            <div className="flex items-center gap-2" key={status}>
              <Badge className="border-[#cfe0d7] bg-[#edf6f1] text-[#287451]">{status}</Badge>
              {index < workflow.length - 1 ? <span className="text-[#91a199]">→</span> : null}
            </div>
          ))}
        </div>
      </header>

      {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant={view === "queue" ? "default" : "secondary"} onClick={() => setView("queue")}>
          <ListChecks /> Awaiting review
        </Button>
        <Button variant={view === "approvals" ? "default" : "secondary"} onClick={() => setView("approvals")}>
          <ClipboardCheck /> Section approvals
        </Button>
        <Button variant={view === "activity" ? "default" : "secondary"} onClick={() => setView("activity")}>
          <History /> Audit history
        </Button>
      </div>

      {view === "queue" ? (
        <EiaReviewQueue documentId={documentId} onOpenSubsection={openSubsection} />
      ) : null}
      {view === "approvals" ? (
        <EiaReviewQueue documentId={documentId} mode="approval" onOpenSubsection={openSubsection} />
      ) : null}
      {view === "activity" ? <EiaActivityFeed activity={activity} /> : null}

      <Alert className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Only the assigned reviewer can start review, request revisions, resolve review comments, or approve. Managers retain oversight access.
      </Alert>
    </div>
  );
}
