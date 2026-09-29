"use client";

import { CheckCircle2, Loader2, MessageSquareWarning, Play, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import type { EiaSubSection, EiaWorkflowStatus } from "@/lib/types";

type EiaWorkflowActionsProps = {
  subsectionId: string;
  status: string;
  canAuthor: boolean;
  canReview: boolean;
  onTransition: (subsection: EiaSubSection) => void;
};

export function EiaWorkflowActions({
  subsectionId,
  status,
  canAuthor,
  canReview,
  onTransition,
}: EiaWorkflowActionsProps) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<EiaWorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transition(targetStatus: EiaWorkflowStatus) {
    setBusy(targetStatus);
    setError(null);
    try {
      const updated = await apiRequest<EiaSubSection>(
        `/eia-documents/subsections/${subsectionId}/workflow/transition`,
        {
          method: "POST",
          body: JSON.stringify({
            target_status: targetStatus,
            comment: comment.trim() || null,
          }),
        },
      );
      setComment("");
      onTransition(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow status could not be changed");
    } finally {
      setBusy(null);
    }
  }

  const normalizedStatus = status === "COMPLETE" ? "APPROVED" : status;

  return (
    <div className="grid gap-2">
      {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

      {normalizedStatus === "NOT_STARTED" ? (
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[#6b7c74]">Assign an author or reviewer before work begins.</p>
          <a href="#assignments" className="text-xs font-semibold text-[#287451] hover:underline">Go to assignments</a>
        </div>
      ) : null}

      {normalizedStatus === "ASSIGNED" && canAuthor ? (
        <Button type="button" disabled={busy !== null} onClick={() => void transition("IN_PROGRESS")}>
          {busy === "IN_PROGRESS" ? <Loader2 className="animate-spin" /> : <Play />}
          Start work
        </Button>
      ) : null}

      {normalizedStatus === "IN_PROGRESS" && canAuthor ? (
        <Button type="button" disabled={busy !== null} onClick={() => void transition("READY_FOR_REVIEW")}>
          {busy === "READY_FOR_REVIEW" ? <Loader2 className="animate-spin" /> : <Send />}
          Submit for review
        </Button>
      ) : null}

      {normalizedStatus === "READY_FOR_REVIEW" && canReview ? (
        <Button type="button" disabled={busy !== null} onClick={() => void transition("UNDER_REVIEW")}>
          {busy === "UNDER_REVIEW" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          Start review
        </Button>
      ) : null}

      {normalizedStatus === "UNDER_REVIEW" && canReview ? (
        <div className="grid gap-2">
          <Textarea
            className="min-h-20"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Decision comment (required when requesting revisions)"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy !== null || !comment.trim()}
              onClick={() => void transition("REVISION_REQUIRED")}
            >
              {busy === "REVISION_REQUIRED" ? <Loader2 className="animate-spin" /> : <MessageSquareWarning />}
              Request revisions
            </Button>
            <Button type="button" disabled={busy !== null} onClick={() => void transition("APPROVED")}>
              {busy === "APPROVED" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Approve subsection
            </Button>
          </div>
        </div>
      ) : null}

      {normalizedStatus === "REVISION_REQUIRED" && canAuthor ? (
        <Button type="button" disabled={busy !== null} onClick={() => void transition("IN_PROGRESS")}>
          {busy === "IN_PROGRESS" ? <Loader2 className="animate-spin" /> : <Play />}
          Start revision
        </Button>
      ) : null}

      {normalizedStatus === "APPROVED" ? (
        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="size-4" /> Approved and locked
        </p>
      ) : null}
    </div>
  );
}
