"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  GitCompareArrows,
  Loader2,
  MessageSquarePlus,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Trash2
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";

import { getAccessToken } from "@/lib/auth";
import { API_URL, apiRequest } from "@/lib/api-client";
import { hasAnyRole, hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type {
  EiaDocumentStructure,
  EiaEvaluationComparison,
  EiaEvaluationFinding,
  EiaEvaluationFindingComment,
  EiaEvaluationRun,
  EiaEvaluationRunDetail,
  EiaReviewApproval,
  ProjectDocument,
  User
} from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type EiaReviewCenterProps = {
  documentId: string;
  projectId: string;
  user: User;
};

const statusFilters = [
  { value: "ALL", label: "All Findings" },
  { value: "COMPLIANT", label: "Compliant" },
  { value: "PARTIALLY_COMPLIANT", label: "Partial" },
  { value: "NEEDS_IMPROVEMENT", label: "Needs Work" },
  { value: "MISSING", label: "Missing" },
  { value: "NEEDS_REVIEW", label: "Needs Review" }
] as const;

export function EiaReviewCenter({ documentId, projectId, user }: EiaReviewCenterProps) {
  const [document, setDocument] = useState<EiaDocumentStructure | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [runs, setRuns] = useState<EiaEvaluationRun[]>([]);
  const [activeRun, setActiveRun] = useState<EiaEvaluationRunDetail | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [baselineRunId, setBaselineRunId] = useState<string>("NONE");
  const [comparison, setComparison] = useState<EiaEvaluationComparison | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedSourceDocumentId, setSelectedSourceDocumentId] = useState<string>("NONE");
  const [approvals, setApprovals] = useState<EiaReviewApproval[]>([]);
  const [approvalNote, setApprovalNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canRunReview =
    hasPermission(user, PERMISSIONS.REVIEW_MANAGE) || hasPermission(user, PERMISSIONS.PROJECT_UPDATE);
  const canRequestApproval =
    hasPermission(user, PERMISSIONS.PROJECT_UPDATE) ||
    hasPermission(user, PERMISSIONS.PROJECT_CREATE) ||
    hasPermission(user, PERMISSIONS.TENANT_MANAGE);
  const canDecideApproval =
    hasAnyRole(user, ["reviewer", "regulator", "admin", "owner"]) || hasPermission(user, PERMISSIONS.REVIEW_MANAGE);
  const canAccessRegulatorInsights =
    hasAnyRole(user, ["reviewer", "regulator", "admin", "owner"]) || hasPermission(user, PERMISSIONS.REVIEW_READ);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [documentData, runData, projectDocuments, reviewApprovals] = await Promise.all([
        apiRequest<EiaDocumentStructure>(`/eia-documents/${documentId}`),
        apiRequest<EiaEvaluationRun[]>(`/eia-documents/${documentId}/evaluation-runs`),
        apiRequest<ProjectDocument[]>(`/projects/${projectId}/documents`),
        apiRequest<EiaReviewApproval[]>(`/eia-documents/${documentId}/review-approvals`)
      ]);
      setDocument(documentData);
      setRuns(runData);
      setDocuments(projectDocuments);
      setApprovals(reviewApprovals);
      const nextRunId = runData[0]?.id ?? null;
      setSelectedRunId((current) => current ?? nextRunId);
      if (!nextRunId) {
        setActiveRun(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review center could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [documentId, projectId]);

  const loadRunDetail = useCallback(
    async (runId: string) => {
      try {
        const detail = await apiRequest<EiaEvaluationRunDetail>(`/eia-documents/${documentId}/evaluation-runs/${runId}`);
        setActiveRun(detail);
        setRuns((current) => current.map((run) => (run.id === detail.id ? { ...run, ...detail } : run)));
        if (!isEvaluationRunActive(detail)) {
          void loadBaseData();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Evaluation run could not be loaded");
      }
    },
    [documentId, loadBaseData]
  );

  const loadComparison = useCallback(
    async (runId: string, compareRunId: string) => {
      if (compareRunId === "NONE") {
        setComparison(null);
        return;
      }
      try {
        const payload = await apiRequest<EiaEvaluationComparison>(
          `/eia-documents/${documentId}/evaluation-runs/${runId}/compare/${compareRunId}`
        );
        setComparison(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Run comparison could not be loaded");
      }
    },
    [documentId]
  );

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }
    void loadRunDetail(selectedRunId);
  }, [loadRunDetail, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId || baselineRunId === "NONE") {
      setComparison(null);
      return;
    }
    void loadComparison(selectedRunId, baselineRunId);
  }, [baselineRunId, loadComparison, selectedRunId]);

  useEffect(() => {
    if (!activeRun || !selectedRunId) {
      return;
    }
    if (!["PENDING", "RUNNING"].includes(activeRun.status)) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadRunDetail(selectedRunId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeRun, loadRunDetail, selectedRunId]);

  const filteredFindings = useMemo(() => {
    const findings = activeRun?.findings ?? [];
    return findings.filter((finding) => {
      if (selectedStatus !== "ALL" && finding.status !== selectedStatus) {
        return false;
      }
      if (
        selectedSection !== "ALL" &&
        !finding.checklist_section.startsWith(`${selectedSection}.`) &&
        finding.checklist_section !== selectedSection
      ) {
        return false;
      }
      return true;
    });
  }, [activeRun?.findings, selectedSection, selectedStatus]);

  const sectionOptions = useMemo(() => {
    return activeRun?.section_summaries.map((summary) => summary.section_number) ?? [];
  }, [activeRun?.section_summaries]);
  const subsectionCount = useMemo(
    () => document?.sections.reduce((count, section) => count + section.subsections.length, 0) ?? 0,
    [document?.sections]
  );
  const activeProcessingRun = useMemo(() => {
    const listRun = runs.find(
      (run) => isEvaluationRunActive(run) && (run.id !== activeRun?.id || isEvaluationRunActive(activeRun))
    );
    if (listRun) {
      return listRun;
    }
    return isEvaluationRunActive(activeRun) ? activeRun : null;
  }, [activeRun, runs]);
  const queueBlockedReason =
    subsectionCount === 0
      ? "Add at least one EIA subsection in the builder before queueing a review."
      : activeProcessingRun
        ? `A review is already ${activeProcessingRun.status.toLowerCase()}. Wait for it to finish before queueing another run.`
        : null;

  const latestScore = getRunMetadataNumber(activeRun, "overall_score");
  const latestAppraisal = getRunMetadataString(activeRun, "overall_appraisal", "-");
  const warnings = getRunMetadataStringList(activeRun, "warnings");
  const reviewReport = getRunMetadataObject(activeRun, "review_report");
  const activeApproval = approvals.find((item) => item.status === "REQUESTED") ?? approvals[0] ?? null;
  const priorityActions = Array.isArray(reviewReport.priority_actions)
    ? reviewReport.priority_actions.filter((item): item is string => typeof item === "string")
    : [];
  const reviewSummary = typeof reviewReport.summary === "string" ? reviewReport.summary : "No review summary yet.";
  const selectedRunStatusMessage = getEvaluationRunStatusMessage(activeRun);
  const showEmptyCompletedRunMessage =
    activeRun?.status === "COMPLETED" && getRunMetadataNumber(activeRun, "total_findings") === 0;

  async function runEvaluation() {
    setRunning(true);
    setError(null);
    try {
      const payload = selectedSourceDocumentId !== "NONE" ? { source_document_id: selectedSourceDocumentId } : {};
      const detail = await apiRequest<EiaEvaluationRunDetail>(`/eia-documents/${documentId}/evaluation-runs`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setActiveRun(detail);
      setSelectedRunId(detail.id);
      setBaselineRunId("NONE");
      setComparison(null);
      setRuns((current) => [detail, ...current.filter((run) => run.id !== detail.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation run failed");
    } finally {
      setRunning(false);
    }
  }

  async function requestFormalReview() {
    if (!selectedRunId) {
      return;
    }
    setApprovalBusy(true);
    setError(null);
    try {
      const approval = await apiRequest<EiaReviewApproval>(`/eia-documents/${documentId}/review-approvals`, {
        method: "POST",
        body: JSON.stringify({
          evaluation_run_id: selectedRunId,
          request_note: approvalNote || null
        })
      });
      setApprovals((current) => [approval, ...current]);
      setApprovalNote("");
      void loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Formal review request could not be created");
    } finally {
      setApprovalBusy(false);
    }
  }

  async function decideFormalReview(decision: "APPROVED" | "CHANGES_REQUESTED") {
    const pendingApproval = approvals.find((item) => item.status === "REQUESTED");
    if (!pendingApproval) {
      return;
    }
    setApprovalBusy(true);
    setError(null);
    try {
      const updated = await apiRequest<EiaReviewApproval>(
        `/eia-documents/${documentId}/review-approvals/${pendingApproval.id}/decision`,
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            decision_note: decisionNote || null
          })
        }
      );
      setApprovals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setDecisionNote("");
      void loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Formal review decision could not be saved");
    } finally {
      setApprovalBusy(false);
    }
  }

  async function downloadReport(format: "json" | "docx" | "pdf") {
    if (!selectedRunId) {
      return;
    }
    const token = getAccessToken();
    const response = await fetch(
      `${API_URL}/eia-documents/${documentId}/evaluation-runs/${selectedRunId}/report.${format}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    if (!response.ok) {
      setError(`Report download failed with status ${response.status}`);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `enviroquant-review-${selectedRunId}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[28px] border border-[#dce6e1] bg-white shadow-sm ">
        <div className="grid gap-5 border-b border-[#dce6e1] p-5 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-[#b9d8c8] bg-[#eaf5ef] text-[#287451]">Reviewer Workspace</Badge>
              {activeRun ? <Badge className={cn(runStatusClass(activeRun.status))}>{activeRun.status}</Badge> : null}
              <span className="text-xs font-semibold uppercase text-[#52675e]">
                {document?.sections.length ?? 0} sections
              </span>
            </div>
            <h1 className="truncate text-2xl font-bold leading-tight text-[#18372c]">
              {document?.title ?? "EIA review center"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52675e]">
              Parsed document chunks, deterministic compliance logic, immutable runs, exportable reports, and reviewer findings are all managed from one governed review surface.
            </p>
          </div>

          <div className="grid min-w-[340px] gap-3 rounded-2xl border border-[#dce6e1] bg-[#f2f7f4] p-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Overall score" value={`${latestScore}/10`} />
              <Metric label="Appraisal" value={latestAppraisal} />
            </div>
            {canRunReview ? (
              <label className="grid gap-2 text-sm font-semibold text-[#52675e]">
                Source document scope
                <Select value={selectedSourceDocumentId} onValueChange={setSelectedSourceDocumentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use project evidence set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">All current project documents</SelectItem>
                    {documents.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.original_filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {canRunReview ? (
                <Button type="button" disabled={running || !!queueBlockedReason} onClick={runEvaluation}>
                  {running || activeProcessingRun ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {running ? "Queueing Review..." : activeProcessingRun ? "Review In Progress" : "Queue Review"}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => void loadBaseData()}>
                <RotateCw />
                Refresh
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/projects/${projectId}/eia/${documentId}`}>
                  <FileSearch />
                  Builder
                </Link>
              </Button>
              {canAccessRegulatorInsights ? (
                <Button asChild type="button" variant="outline">
                  <Link href={`/projects/${projectId}/regulator`}>
                    <GitCompareArrows />
                    Regulator Insights
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-[#e3eae6] md:grid-cols-4 md:divide-x md:divide-y-0">
          <MetricTile icon={<ClipboardCheck />} label="Runs" value={runs.length} />
          <MetricTile icon={<CheckCircle2 />} label="Filtered Findings" value={filteredFindings.length} />
          <MetricTile icon={<ShieldAlert />} label="Needs Work" value={countProblemFindings(activeRun?.findings ?? [])} />
          <MetricTile icon={<AlertTriangle />} label="Warnings" value={warnings.length} />
        </div>
      </section>

      {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
      {loading ? <Alert>Loading review center...</Alert> : null}
      {!loading && !error && queueBlockedReason ? (
        <Alert className="border-[#b9d8c8] bg-[#eaf5ef] text-[#344f44]">{queueBlockedReason}</Alert>
      ) : null}
      {!loading && !error && activeProcessingRun ? (
        <Alert className="border-[#dce6e1] bg-[#edf6f1] text-[#52675e]">
          {getEvaluationRunStatusMessage(activeProcessingRun)}
        </Alert>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="builder-panel self-start overflow-hidden xl:sticky xl:top-20">
          <div className="border-b border-[#dce6e1] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-bold text-[#18372c]">Evaluation Runs</span>
              <Badge>{runs.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-[#697a73]">Runs process asynchronously and stay immutable once completed.</p>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 xl:max-h-[calc(100vh-14rem)]">
            {!runs.length ? (
              <Alert>No evaluation runs yet.</Alert>
            ) : (
              <div className="grid gap-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      "rounded-xl border border-[#dce6e1] bg-white transition-colors",
                      selectedRunId === run.id && "border-[#b9d8c8] bg-[#eaf5ef]"
                    )}
                  >
                    <button
                      type="button"
                      className="w-full p-3 text-left"
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#18372c]">
                          {new Date(run.created_at).toLocaleString()}
                        </span>
                        <Badge className={cn(runStatusClass(run.status))}>{run.status}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-[#52675e]">{getEvaluationRunMetricLine(run)}</div>
                      <div className="mt-1 text-xs text-[#52675e]">
                        Routed chunks {getRunMetadataNumber(run, "routed_chunk_count")}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[#52675e]">{getEvaluationRunStatusMessage(run)}</div>
                    </button>
                    {canRunReview && !["PENDING", "RUNNING"].includes(run.status) ? (
                      <div className="border-t border-[#e3eae6] px-3 py-2">
                        <DeleteRunButton
                          documentId={documentId}
                          runId={run.id}
                          onDeleted={() => {
                            setRuns((prev) => prev.filter((r) => r.id !== run.id));
                            if (selectedRunId === run.id) setSelectedRunId(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Section appraisal</CardTitle>
                  <CardDescription>AI scoring against RQEIA checklist. Select a run in the sidebar to see findings.</CardDescription>
                </div>
                <span className="text-xs font-semibold text-[#697a73]">{filteredFindings.length} findings shown</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                Status
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                Section
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All sections</SelectItem>
                    {sectionOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        Section {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                Compare run
                <Select value={baselineRunId} onValueChange={setBaselineRunId}>
                  <SelectTrigger className="min-w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No comparison</SelectItem>
                    {runs
                      .filter((run) => run.id !== selectedRunId)
                      .map((run) => (
                        <SelectItem key={run.id} value={run.id}>
                          {new Date(run.created_at).toLocaleString()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {isEvaluationRunActive(activeRun) ? (
                <Alert className="col-span-full">
                  {selectedRunStatusMessage || "Review is still running. Findings and section scores will appear when processing finishes."}
                </Alert>
              ) : null}
              {activeRun?.status === "FAILED" && selectedRunStatusMessage ? (
                <Alert className="col-span-full border-red-200 bg-red-50 text-red-700">
                  {selectedRunStatusMessage}
                </Alert>
              ) : null}
              {showEmptyCompletedRunMessage ? (
                <Alert className="col-span-full border-amber-200 bg-amber-50 text-amber-700">
                  This run completed without checklist findings. Add subsections in the builder, then queue a new review.
                </Alert>
              ) : null}
              {(activeRun?.section_summaries ?? []).map((summary) => (
                <div key={summary.id} className="rounded-xl border border-[#dce6e1] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase text-[#287451]">Section {summary.section_number}</div>
                      <div className="mt-1 text-sm font-semibold text-[#18372c]">{summary.section_title}</div>
                    </div>
                    <div className="text-xl font-black text-[#18372c]">{summary.score}/10</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#52675e]">{summary.summary_comment}</p>
                </div>
              ))}
              {activeRun && !isEvaluationRunActive(activeRun) && activeRun.status !== "FAILED" && !activeRun.section_summaries.length ? (
                <Alert>No section summary available.</Alert>
              ) : null}
            </CardContent>
          </Card>

          {comparison ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompareArrows className="size-5" />
                  Run Comparison
                </CardTitle>
                <CardDescription>
                  Score delta {comparison.delta >= 0 ? "+" : ""}
                  {comparison.delta} against the selected baseline run.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {comparison.sections.map((section) => (
                    <div key={section.section_number} className="rounded-xl border border-[#dce6e1] bg-white p-4">
                      <div className="text-xs font-black uppercase text-[#287451]">Section {section.section_number}</div>
                      <div className="mt-1 text-sm font-semibold text-[#18372c]">{section.section_title}</div>
                      <div className="mt-3 text-sm text-[#52675e]">
                        Current {section.current_score}/10 · Baseline {section.baseline_score}/10
                      </div>
                      <div className={cn("mt-2 text-sm font-bold", section.delta >= 0 ? "text-emerald-700" : "text-red-700")}>
                        Delta {section.delta >= 0 ? "+" : ""}
                        {section.delta}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-black uppercase text-[#52675e]">Changed findings</div>
                  {!comparison.changed_findings.length ? <Alert>No status changes between the selected runs.</Alert> : null}
                  {comparison.changed_findings.slice(0, 12).map((item) => (
                    <div key={item.checklist_section} className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-3 text-sm text-[#52675e]">
                      {item.checklist_section} · {item.baseline_status} → {item.current_status}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Findings</CardTitle>
              <CardDescription>
                {filteredFindings.length} checklist items shown{selectedStatus !== "ALL" ? ` · ${selectedStatus}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!activeRun ? <Alert>Select or queue an evaluation to inspect findings.</Alert> : null}
              {isEvaluationRunActive(activeRun) ? (
                <Alert>Review is still processing. Findings will populate here automatically when the run completes.</Alert>
              ) : null}
              {activeRun?.status === "FAILED" ? (
                <Alert className="border-red-200 bg-red-50 text-red-700">
                  {selectedRunStatusMessage || "This evaluation run did not complete."}
                </Alert>
              ) : null}
              {activeRun && !isEvaluationRunActive(activeRun) && activeRun.status !== "FAILED" && !filteredFindings.length ? (
                <Alert>No findings match the current filters.</Alert>
              ) : null}
              {filteredFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  canComment={canRunReview}
                  canDecide={canDecideApproval}
                  documentId={documentId}
                  runId={activeRun?.id ?? ""}
                  finding={finding}
                  projectId={projectId}
                  targetSubsectionId={finding.subsection_id ?? findTargetSubsectionId(document, finding.checklist_section)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card id="approval" className="scroll-mt-24">
            <CardHeader>
              <CardTitle>Formal Review Workflow</CardTitle>
              <CardDescription>
                Submit a completed run for sign-off and capture a reviewer approval or requested changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-xl border border-[#dce6e1] bg-white p-3">
                <div className="text-xs font-bold uppercase text-[#52675e]">Current status</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className={cn(runStatusClass(activeApproval?.status ?? "NO_REQUEST"))}>
                    {activeApproval?.status ?? "NO_REQUEST"}
                  </Badge>
                  {activeApproval?.requested_at ? (
                    <span className="text-xs text-[#52675e]">{new Date(activeApproval.requested_at).toLocaleString()}</span>
                  ) : null}
                </div>
                {activeApproval?.request_note ? (
                  <p className="mt-3 text-sm leading-6 text-[#52675e]">{activeApproval.request_note}</p>
                ) : null}
                {activeApproval?.decision_note ? (
                  <p className="mt-3 text-sm leading-6 text-[#52675e]">{activeApproval.decision_note}</p>
                ) : null}
              </div>

              {canRequestApproval && activeRun?.status === "COMPLETED" && !approvals.some((item) => item.status === "REQUESTED") ? (
                <div className="grid gap-3">
                  <Textarea
                    className="min-h-24"
                    placeholder="Add optional reviewer context before submitting this run for sign-off."
                    value={approvalNote}
                    onChange={(event) => setApprovalNote(event.target.value)}
                  />
                  <Button type="button" disabled={approvalBusy || !selectedRunId} onClick={() => void requestFormalReview()}>
                    {approvalBusy ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
                    Submit for Review
                  </Button>
                </div>
              ) : null}

              {canDecideApproval && approvals.some((item) => item.status === "REQUESTED") ? (
                <div className="grid gap-3">
                  <Textarea
                    className="min-h-24"
                    placeholder="Record the approval decision or the specific changes required."
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={approvalBusy} onClick={() => void decideFormalReview("APPROVED")}>
                      {approvalBusy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={approvalBusy}
                      onClick={() => void decideFormalReview("CHANGES_REQUESTED")}
                    >
                      {approvalBusy ? <Loader2 className="animate-spin" /> : <AlertTriangle />}
                      Request Changes
                    </Button>
                  </div>
                </div>
              ) : null}

              {!!approvals.length ? (
                <div className="grid gap-2">
                  {approvals.slice(0, 5).map((approval) => (
                    <div key={approval.id} className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-3 text-sm text-[#52675e]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge className={cn(runStatusClass(approval.status))}>{approval.status}</Badge>
                        <span>{new Date(approval.requested_at).toLocaleString()}</span>
                      </div>
                      {approval.decision_note ? <p className="mt-2">{approval.decision_note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run Summary</CardTitle>
              <CardDescription>{reviewSummary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SummaryLine label="Prompt version" value={activeRun?.prompt_version ?? "-"} />
              <SummaryLine label="Model" value={activeRun?.model_version ?? "-"} />
              <SummaryLine label="OpenAI used" value={String(getRunMetadataBoolean(activeRun, "used_openai"))} />
              <SummaryLine label="Fallback count" value={String(getRunMetadataNumber(activeRun, "fallback_count"))} />
              <SummaryLine label="Routed chunks" value={String(getRunMetadataNumber(activeRun, "routed_chunk_count"))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exports</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button type="button" variant="secondary" disabled={!selectedRunId} onClick={() => void downloadReport("json")}>
                <Download />
                JSON
              </Button>
              <Button type="button" variant="secondary" disabled={!selectedRunId} onClick={() => void downloadReport("docx")}>
                <Download />
                DOCX
              </Button>
              <Button type="button" variant="secondary" disabled={!selectedRunId} onClick={() => void downloadReport("pdf")}>
                <Download />
                PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!priorityActions.length ? <Alert>No priority actions recorded for this run.</Alert> : null}
              {priorityActions.map((item) => (
                <div key={item} className="rounded-xl border border-[#dce6e1] bg-white p-3 text-sm text-[#52675e]">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warnings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!warnings.length ? <Alert>No warnings on this run.</Alert> : null}
              {warnings.map((warning) => (
                <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  {warning}
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dce6e1] bg-white p-3">
      <div className="text-xs font-bold uppercase text-[#52675e]">{label}</div>
      <div className="mt-1 text-lg font-black text-[#18372c]">{value}</div>
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#b9d8c8] bg-[#eaf5ef] text-[#287451] [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <div className="text-2xl font-black leading-none text-[#18372c]">{value}</div>
        <div className="mt-1 text-xs font-bold uppercase text-[#52675e]">{label}</div>
      </div>
    </div>
  );
}

function FindingCard({
  canComment,
  canDecide,
  documentId,
  projectId,
  runId,
  finding,
  targetSubsectionId
}: {
  canComment: boolean;
  canDecide: boolean;
  documentId: string;
  projectId: string;
  runId: string;
  finding: EiaEvaluationFinding;
  targetSubsectionId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<EiaEvaluationFindingComment[]>([]);
  const [commentValue, setCommentValue] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [reviewerDecision, setReviewerDecision] = useState<string | null>(
    typeof finding.finding_metadata.reviewer_decision === "string" ? finding.finding_metadata.reviewer_decision : null
  );

  const loadComments = useCallback(async () => {
    if (!runId) {
      return;
    }
    setLoadingComments(true);
    try {
      const payload = await apiRequest<EiaEvaluationFindingComment[]>(
        `/eia-documents/${documentId}/evaluation-runs/${runId}/findings/${finding.id}/comments`
      );
      setComments(payload);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Comments could not be loaded");
    } finally {
      setLoadingComments(false);
    }
  }, [documentId, finding.id, runId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentValue.trim()) {
      return;
    }
    setPostingComment(true);
    setCommentError(null);
    try {
      const created = await apiRequest<EiaEvaluationFindingComment>(
        `/eia-documents/${documentId}/evaluation-runs/${runId}/findings/${finding.id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content: commentValue })
        }
      );
      setComments((current) => [...current, created]);
      setCommentValue("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Comment could not be created");
    } finally {
      setPostingComment(false);
    }
  }

  async function decideFinding(decision: "CLOSED" | "RETAINED") {
    setDecisionBusy(true);
    setCommentError(null);
    try {
      const updated = await apiRequest<EiaEvaluationFinding>(
        `/eia-documents/${documentId}/evaluation-runs/${runId}/findings/${finding.id}/decision`,
        { method: "POST", body: JSON.stringify({ decision, note: decisionNote || null }) }
      );
      setReviewerDecision(typeof updated.finding_metadata.reviewer_decision === "string" ? updated.finding_metadata.reviewer_decision : decision);
      setDecisionNote("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Finding decision could not be saved");
    } finally {
      setDecisionBusy(false);
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white transition-all", expanded ? "border-[#287451]/20 shadow-sm" : "border-[#dce6e1]")}>
      {/* Collapsed header — always visible */}
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-[#f8faf9]"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5 shrink-0">
          <Badge className={cn("text-xs", findingStatusClass(finding.status))}>{finding.status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#287451]">{finding.checklist_section}</span>
            <span className="text-xs text-[#9aaba3]">{Math.round(finding.confidence_score * 100)}% confidence</span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#18372c]">{finding.checklist_title}</p>
          {!expanded && finding.recommendation ? (
            <p className="mt-1 line-clamp-1 text-xs text-[#697a73]">{finding.recommendation}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {targetSubsectionId && !expanded ? (
            <Link
              href={`/projects/${projectId}/eia/${documentId}#subsection-${targetSubsectionId}?ai=1`}
              className="flex items-center gap-1 rounded-lg border border-[#b9d8c8] bg-[#eaf5ef] px-2 py-1 text-xs font-semibold text-[#287451] hover:bg-[#d8f0e5]"
              onClick={(e) => e.stopPropagation()}
            >
              <Sparkles className="size-3" /> Fix
            </Link>
          ) : null}
          <span className="text-xs text-[#9aaba3]">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded ? (
        <div className="border-t border-[#e3eae6] p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextBlock title="Evidence Summary" body={finding.evidence_summary} />
            <TextBlock title="Analysis" body={finding.ai_analysis} />
          </div>

          {finding.missing_elements.length ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="mb-2 text-xs font-bold uppercase text-red-600">Missing or weak elements</div>
              <ul className="grid gap-1.5 text-sm text-red-700">
                {finding.missing_elements.map((item) => (
                  <li key={item} className="flex items-start gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-400" />{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {finding.recommendation ? (
            <div className="mt-4 rounded-xl border border-[#c5e0a5] bg-[#f0f9e4] p-3">
              <div className="mb-1 text-xs font-bold uppercase text-[#287451]">Recommendation</div>
              <p className="text-sm text-[#1f6848]">{finding.recommendation}</p>
            </div>
          ) : null}

          {targetSubsectionId ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#b9d8c8] bg-[#eaf5ef] p-3">
              <p className="min-w-0 flex-1 text-sm text-[#344f44]">Improve the linked draft, then re-run the review to close this finding.</p>
              <Button asChild type="button" size="sm">
                <Link href={`/projects/${projectId}/eia/${documentId}#subsection-${targetSubsectionId}?ai=1`}>
                  <Sparkles /> Improve with AI
                </Link>
              </Button>
            </div>
          ) : null}

          {finding.evidence_references.length ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-bold uppercase text-[#697a73]">
                Evidence references ({finding.evidence_references.length})
              </summary>
              <div className="mt-2 grid gap-2">
                {finding.evidence_references.map((reference) => (
                  <div key={`${reference.source_type}-${reference.chunk_id}`} className="rounded-lg border border-[#dce6e1] bg-[#f8faf9] p-2.5 text-xs text-[#52675e]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="text-[10px]">{reference.source_type}</Badge>
                      {reference.subsection_number ? <span>{reference.subsection_number}</span> : null}
                      {reference.source_document_filename ? <span className="font-medium">{reference.source_document_filename}</span> : null}
                      {reference.page_number ? <span>p.{reference.page_number}</span> : null}
                    </div>
                    {reference.excerpt ? <p className="mt-1.5 leading-5 text-[#697a73]">{reference.excerpt}</p> : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {canDecide ? (
            <div className="mt-4 rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-[#697a73]">Reviewer decision</span>
                {reviewerDecision ? <Badge>{reviewerDecision.replace(/_/g, " ")}</Badge> : null}
              </div>
              <p className="mb-3 text-xs text-[#9aaba3]">{reviewerDecision ? reviewerDecision.toLowerCase().replace(/_/g, " ") : "No decision yet"}</p>
              <div className="grid gap-2">
                <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder="Record your reasoning before deciding." className="min-h-16 text-sm" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={decisionBusy} onClick={() => void decideFinding("CLOSED")}><CheckCircle2 />Close</Button>
                  <Button type="button" size="sm" variant="secondary" disabled={decisionBusy} onClick={() => void decideFinding("RETAINED")}><ShieldAlert />Retain</Button>
                </div>
              </div>
            </div>
          ) : reviewerDecision ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-3">
              <span className="text-xs font-bold uppercase text-[#697a73]">Decision:</span>
              <Badge>{reviewerDecision.replace(/_/g, " ")}</Badge>
            </div>
          ) : null}

          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-bold uppercase text-[#697a73]">
              Comments ({comments.length})
            </summary>
            <div className="mt-2 grid gap-2">
              {commentError ? <Alert className="border-red-200 bg-red-50 text-red-700">{commentError}</Alert> : null}
              {loadingComments ? <p className="text-xs text-[#9aaba3]">Loading...</p> : null}
              {!comments.length && !loadingComments ? <p className="text-xs text-[#9aaba3]">No comments yet.</p> : null}
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-[#dce6e1] bg-white p-3">
                  <div className="flex justify-between text-xs text-[#9aaba3]">
                    <span className="font-semibold">{comment.user.full_name}</span>
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#344f44]">{comment.content}</p>
                </div>
              ))}
            </div>
            {canComment ? (
              <form className="mt-2 grid gap-2" onSubmit={submitComment}>
                <Textarea
                  className="min-h-16 text-sm"
                  placeholder="Add a reviewer comment."
                  value={commentValue}
                  onChange={(event) => setCommentValue(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={postingComment || !commentValue.trim()}>
                    {postingComment ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquarePlus className="size-3.5" />}
                    Comment
                  </Button>
                </div>
              </form>
            ) : null}
          </details>
        </div>
      ) : null}
    </div>
  );
}

const RQEIA_BUILDER_SECTION: Record<string, string> = {
  "1": "2",
  "2": "4",
  "3": "5",
  "4": "6",
  "5": "7",
  "6": "1",
  "7": "3",
  "8": "13",
  REG: "3"
};

function findTargetSubsectionId(document: EiaDocumentStructure | null, checklistSection: string): string | null {
  const area = checklistSection.startsWith("REG") ? "REG" : checklistSection.split(".")[0];
  const targetSectionNumber = RQEIA_BUILDER_SECTION[area];
  if (!targetSectionNumber) return null;
  const targetSection = document?.sections.find((section) => section.section_number === targetSectionNumber);
  return targetSection?.subsections[0]?.id ?? null;
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-3">
      <div className="text-xs font-black uppercase text-[#697a73]">{title}</div>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#344f44]">{body}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#dce6e1] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm font-semibold text-[#52675e]">{label}</span>
      <span className="text-right text-sm text-[#18372c]">{value}</span>
    </div>
  );
}

function findingStatusClass(status: string) {
  if (status === "COMPLIANT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "PARTIALLY_COMPLIANT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "NEEDS_IMPROVEMENT") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "MISSING") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-[#b9d8c8] bg-[#eaf5ef] text-[#287451]";
}

function runStatusClass(status: string) {
  if (status === "COMPLETED" || status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "FAILED" || status === "CHANGES_REQUESTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "RUNNING" || status === "PENDING" || status === "REQUESTED") {
    return "border-[#b9d8c8] bg-[#eaf5ef] text-[#287451]";
  }
  return "border-[#dce6e1] bg-[#edf6f1] text-[#52675e]";
}

function isEvaluationRunActive(run: EiaEvaluationRun | EiaEvaluationRunDetail | null | undefined) {
  return !!run && ["PENDING", "RUNNING"].includes(run.status);
}

function getEvaluationRunMetricLine(run: EiaEvaluationRun | EiaEvaluationRunDetail) {
  if (isEvaluationRunActive(run)) {
    return "Processing review output. Findings and score appear after completion.";
  }
  if (run.status === "FAILED") {
    return "Run stopped before a score could be produced.";
  }
  return `Score ${getRunMetadataNumber(run, "overall_score")}/10 · Appraisal ${getRunMetadataString(run, "overall_appraisal", "-")}`;
}

function getEvaluationRunStatusMessage(run: EiaEvaluationRun | EiaEvaluationRunDetail | null | undefined) {
  if (!run) {
    return "";
  }

  const statusMessage = getRunMetadataString(run, "status_message");
  if (statusMessage) {
    return statusMessage;
  }

  const processedSubsections = getRunMetadataNumber(run, "processed_subsections");
  const totalSubsections = getRunMetadataNumber(run, "total_subsections");

  if (run.status === "PENDING") {
    return totalSubsections
      ? `Review queued. ${processedSubsections}/${totalSubsections} subsections processed.`
      : "Review queued. Processing starts automatically after the request is accepted.";
  }
  if (run.status === "RUNNING") {
    return totalSubsections
      ? `Review is running. ${processedSubsections}/${totalSubsections} subsections processed.`
      : "Review is running. Findings, section summaries, and the overall score will appear when processing finishes.";
  }
  if (run.status === "FAILED") {
    return getRunMetadataString(run, "error", "This evaluation run did not complete.");
  }
  if (run.status === "COMPLETED" && getRunMetadataNumber(run, "total_findings") === 0) {
    return "Review completed without checklist findings. Add subsections before queueing another run.";
  }
  return "";
}

function countProblemFindings(findings: EiaEvaluationFinding[]) {
  return findings.filter((finding) =>
    ["NEEDS_IMPROVEMENT", "MISSING", "NEEDS_REVIEW"].includes(finding.status)
  ).length;
}

function getRunMetadataObject(run: EiaEvaluationRun | EiaEvaluationRunDetail | null, key: string) {
  const value = run?.run_metadata?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getRunMetadataString(run: EiaEvaluationRun | EiaEvaluationRunDetail | null, key: string, fallback = "") {
  const value = run?.run_metadata?.[key];
  return typeof value === "string" ? value : fallback;
}

function getRunMetadataNumber(run: EiaEvaluationRun | EiaEvaluationRunDetail | null, key: string) {
  const value = run?.run_metadata?.[key];
  return typeof value === "number" ? value : 0;
}

function getRunMetadataBoolean(run: EiaEvaluationRun | EiaEvaluationRunDetail | null, key: string) {
  const value = run?.run_metadata?.[key];
  return typeof value === "boolean" ? value : false;
}

function getRunMetadataStringList(run: EiaEvaluationRun | EiaEvaluationRunDetail | null, key: string) {
  const value = run?.run_metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function DeleteRunButton({ documentId, runId, onDeleted }: { documentId: string; runId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiRequest(`/eia-documents/${documentId}/evaluation-runs/${runId}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#697a73]">Delete this run?</span>
        <Button type="button" size="sm" disabled={deleting} onClick={() => void handleDelete()}>
          {deleting ? <Loader2 className="size-3 animate-spin" /> : null}
          Yes, delete
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-1.5 text-xs text-[#9aaba3] hover:text-red-600 transition-colors"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-3" />
      Delete run
    </button>
  );
}
