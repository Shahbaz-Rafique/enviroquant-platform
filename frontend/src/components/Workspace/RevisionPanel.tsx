"use client";

import { History, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { EiaSubSectionWorkspace, SubSectionRevision } from "@/lib/types";

type RevisionPanelProps = {
  subsectionId: string;
  tenantId: string;
  canRestore: boolean;
  onRestored: (workspace: EiaSubSectionWorkspace) => void;
};

export function RevisionPanel({ subsectionId, tenantId, canRestore, onRestored }: RevisionPanelProps) {
  const [revisions, setRevisions] = useState<SubSectionRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRevisions = useCallback(async () => {
    try {
      const data = await apiRequest<SubSectionRevision[]>(`/eia-documents/subsections/${subsectionId}/revisions`);
      setRevisions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisions could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [subsectionId]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  async function restoreRevision(revision: SubSectionRevision) {
    setRestoringId(revision.id);
    setError(null);
    try {
      const workspace = await apiRequest<EiaSubSectionWorkspace>(
        `/eia-documents/subsections/${subsectionId}/revisions/${revision.id}/restore?tenant_id=${encodeURIComponent(
          tenantId
        )}`,
        { method: "POST" }
      );
      onRestored(workspace);
      await loadRevisions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision could not be restored");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <History className="size-5 text-[#B6F7FF]" />
          Revisions
        </span>
        <Badge>{revisions.length}</Badge>
      </div>
      <div className="grid max-h-[28rem] gap-3 overflow-y-auto p-4">
        {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
        {loading ? <Alert>Loading revisions...</Alert> : null}
        {!loading && !revisions.length ? <div className="text-sm text-white/52">No saved revisions yet.</div> : null}
        {revisions.map((revision) => (
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-3" key={revision.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">Revision {revision.revision_number}</div>
                <div className="mt-1 text-xs font-medium text-white/52">{formatDateTime(revision.created_at)}</div>
              </div>
              <Badge>{revision.source_type.replaceAll("_", " ")}</Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-white/66">
              {revision.change_summary ?? revision.completion_status}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-white/46">{Math.round(revision.progress_percentage)}%</span>
              {canRestore ? (
                <Button
                  disabled={restoringId === revision.id}
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => restoreRevision(revision)}
                >
                  {restoringId === revision.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  Restore
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
