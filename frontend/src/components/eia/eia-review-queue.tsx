"use client";

import { ArrowRight, CheckCircle2, Clock3, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api-client";
import type { EiaReviewQueueItem } from "@/lib/types";

type EiaReviewQueueProps = {
  documentId: string;
  onOpenSubsection: (subsectionId: string) => void;
};

export function EiaReviewQueue({ documentId, onOpenSubsection }: EiaReviewQueueProps) {
  const [items, setItems] = useState<EiaReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingSectionId, setApprovingSectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiRequest<EiaReviewQueueItem[]>(`/eia-documents/${documentId}/review-queue`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review queue could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function approveSection(sectionId: string) {
    setApprovingSectionId(sectionId);
    setError(null);
    try {
      setItems(
        await apiRequest<EiaReviewQueueItem[]>(
          `/eia-documents/${documentId}/sections/${sectionId}/approve`,
          { method: "POST" },
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Section could not be approved");
    } finally {
      setApprovingSectionId(null);
    }
  }

  return (
    <section className="builder-panel overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-[#e3eae6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287451]">Controlled review</p>
          <h2 className="mt-1 text-xl font-bold text-[#18372c]">Review queue</h2>
          <p className="mt-1 text-sm text-[#697a73]">Subsections submitted for review or currently under review.</p>
        </div>
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void loadQueue()}>
          <RefreshCcw className={loading ? "animate-spin" : undefined} /> Refresh
        </Button>
      </header>

      <div className="grid gap-3 p-4">
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
        {loading && !items.length ? <Alert>Loading review queue...</Alert> : null}
        {!loading && !items.length ? <Alert>No subsections are awaiting review.</Alert> : null}

        {items.map((item, index) => {
          const sectionItems = items.filter((candidate) => candidate.section_id === item.section_id);
          const isFirstSectionItem = items.findIndex((candidate) => candidate.section_id === item.section_id) === index;
          const canApproveSection = isFirstSectionItem && sectionItems.every((candidate) => candidate.status === "UNDER_REVIEW");
          return (
          <article key={item.subsection_id} className="grid gap-3 rounded-xl border border-[#dce6e1] bg-white p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#cfe0d7] bg-[#edf6f1] text-[#287451]">{item.subsection_number}</Badge>
                <Badge className={item.status === "UNDER_REVIEW" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                  {labelize(item.status)}
                </Badge>
                {item.is_assigned_reviewer ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Assigned to me</Badge> : null}
              </div>
              <h3 className="mt-2 text-sm font-bold text-[#214238]">{item.subsection_title}</h3>
              <p className="mt-1 text-xs text-[#6a7d74]">Section {item.section_number}: {item.section_title}</p>
              <p className="mt-1 text-xs text-[#6a7d74]">
                Author: {item.author_assignee?.full_name ?? "Unassigned"} · Reviewer: {item.reviewer_assignee?.full_name ?? "Unassigned"}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-[#6a7d74]">
                <Clock3 className="size-3.5" /> Submitted {new Date(item.submitted_at).toLocaleString()} · {item.unresolved_comment_count} open comments
              </p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-[#6a7d74]"><span>Progress</span><span>{Math.round(item.progress_percentage)}%</span></div>
              <Progress className="h-1.5" value={item.progress_percentage} />
            </div>
            <div className="grid gap-2">
              <Button type="button" onClick={() => onOpenSubsection(item.subsection_id)}>
                <ShieldCheck /> Review <ArrowRight />
              </Button>
              {canApproveSection ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={approvingSectionId !== null}
                  onClick={() => void approveSection(item.section_id)}
                >
                  {approvingSectionId === item.section_id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Approve section
                </Button>
              ) : null}
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
