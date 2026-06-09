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
  Sparkles
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Evaluation run could not be loaded");
      }
    },
    [documentId]
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

  const latestScore = getRunMetadataNumber(activeRun, "overall_score");
  const latestAppraisal = getRunMetadataString(activeRun, "overall_appraisal", "-");
  const warnings = getRunMetadataStringList(activeRun, "warnings");
  const reviewReport = getRunMetadataObject(activeRun, "review_report");
  const activeApproval = approvals.find((item) => item.status === "REQUESTED") ?? approvals[0] ?? null;
  const priorityActions = Array.isArray(reviewReport.priority_actions)
    ? reviewReport.priority_actions.filter((item): item is string => typeof item === "string")
    : [];
  const reviewSummary = typeof reviewReport.summary === "string" ? reviewReport.summary : "No review summary yet.";

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
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="grid gap-5 border-b border-white/10 p-5 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-[#67E8F9]/24 bg-[#67E8F9]/10 text-[#B6F7FF]">Reviewer Workspace</Badge>
              {activeRun ? <Badge className={cn(runStatusClass(activeRun.status))}>{activeRun.status}</Badge> : null}
              <span className="text-xs font-semibold uppercase text-white/46">
                {document?.sections.length ?? 0} sections
              </span>
            </div>
            <h1 className="truncate text-2xl font-bold leading-tight text-white">
              {document?.title ?? "EIA review center"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/66">
              Parsed document chunks, deterministic compliance logic, immutable runs, exportable reports, and reviewer findings are all managed from one governed review surface.
            </p>
          </div>

          <div className="grid min-w-[340px] gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Overall score" value={`${latestScore}/10`} />
              <Metric label="Appraisal" value={latestAppraisal} />
            </div>
            {canRunReview ? (
              <label className="grid gap-2 text-sm font-semibold text-white/72">
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
                <Button type="button" disabled={running} onClick={runEvaluation}>
                  {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  Queue review
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

        <div className="grid divide-y divide-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
          <MetricTile icon={<ClipboardCheck />} label="Runs" value={runs.length} />
          <MetricTile icon={<CheckCircle2 />} label="Filtered Findings" value={filteredFindings.length} />
          <MetricTile icon={<ShieldAlert />} label="Needs Work" value={countProblemFindings(activeRun?.findings ?? [])} />
          <MetricTile icon={<AlertTriangle />} label="Warnings" value={warnings.length} />
        </div>
      </section>

      {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
      {loading ? <Alert>Loading review center...</Alert> : null}

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="builder-panel sticky top-20 self-start overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-bold text-white">Evaluation Runs</span>
              <Badge>{runs.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-white/52">Runs process asynchronously and stay immutable once completed.</p>
          </div>
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-3">
            {!runs.length ? (
              <Alert>No evaluation runs yet.</Alert>
            ) : (
              <div className="grid gap-2">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={cn(
                      "rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]",
                      selectedRunId === run.id && "border-[#67E8F9]/28 bg-[#67E8F9]/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {new Date(run.created_at).toLocaleString()}
                      </span>
                      <Badge className={cn(runStatusClass(run.status))}>{run.status}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-white/58">
                      Score {getRunMetadataNumber(run, "overall_score")}/10 · Appraisal{" "}
                      {getRunMetadataString(run, "overall_appraisal", "-")}
                    </div>
                    <div className="mt-1 text-xs text-white/42">
                      Routed chunks {getRunMetadataNumber(run, "routed_chunk_count")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end">
              <div>
                <CardTitle>Section appraisal</CardTitle>
                <CardDescription>
                  Scoring is deterministic. Parsed source chunks and structured draft content feed the evidence analysis layer.
                </CardDescription>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-white/72">
                Status
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="min-w-[180px]">
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
              <label className="grid gap-2 text-sm font-semibold text-white/72">
                Section
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="min-w-[160px]">
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
              <label className="grid gap-2 text-sm font-semibold text-white/72">
                Compare
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
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(activeRun?.section_summaries ?? []).map((summary) => (
                <div key={summary.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase text-[#B6F7FF]">Section {summary.section_number}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{summary.section_title}</div>
                    </div>
                    <div className="text-xl font-black text-white">{summary.score}/10</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/62">{summary.summary_comment}</p>
                </div>
              ))}
              {!activeRun?.section_summaries.length ? <Alert>No section summary available.</Alert> : null}
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
                    <div key={section.section_number} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs font-black uppercase text-[#B6F7FF]">Section {section.section_number}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{section.section_title}</div>
                      <div className="mt-3 text-sm text-white/64">
                        Current {section.current_score}/10 · Baseline {section.baseline_score}/10
                      </div>
                      <div className={cn("mt-2 text-sm font-bold", section.delta >= 0 ? "text-emerald-200" : "text-red-100")}>
                        Delta {section.delta >= 0 ? "+" : ""}
                        {section.delta}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-black uppercase text-white/42">Changed findings</div>
                  {!comparison.changed_findings.length ? <Alert>No status changes between the selected runs.</Alert> : null}
                  {comparison.changed_findings.slice(0, 12).map((item) => (
                    <div key={item.checklist_section} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/68">
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
              {activeRun && !filteredFindings.length ? <Alert>No findings match the current filters.</Alert> : null}
              {filteredFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  canComment={canRunReview}
                  documentId={documentId}
                  runId={activeRun?.id ?? ""}
                  finding={finding}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Formal Review Workflow</CardTitle>
              <CardDescription>
                Submit a completed run for sign-off and capture a reviewer approval or requested changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-xs font-bold uppercase text-white/46">Current status</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className={cn(runStatusClass(activeApproval?.status ?? "NO_REQUEST"))}>
                    {activeApproval?.status ?? "NO_REQUEST"}
                  </Badge>
                  {activeApproval?.requested_at ? (
                    <span className="text-xs text-white/56">{new Date(activeApproval.requested_at).toLocaleString()}</span>
                  ) : null}
                </div>
                {activeApproval?.request_note ? (
                  <p className="mt-3 text-sm leading-6 text-white/68">{activeApproval.request_note}</p>
                ) : null}
                {activeApproval?.decision_note ? (
                  <p className="mt-3 text-sm leading-6 text-white/68">{activeApproval.decision_note}</p>
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
                    <div key={approval.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/68">
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
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/74">
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
                <div key={warning} className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs font-bold uppercase text-white/46">{label}</div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#67E8F9]/18 bg-[#67E8F9]/10 text-[#B6F7FF] [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <div className="text-2xl font-black leading-none text-white">{value}</div>
        <div className="mt-1 text-xs font-bold uppercase text-white/46">{label}</div>
      </div>
    </div>
  );
}

function FindingCard({
  canComment,
  documentId,
  runId,
  finding
}: {
  canComment: boolean;
  documentId: string;
  runId: string;
  finding: EiaEvaluationFinding;
}) {
  const [comments, setComments] = useState<EiaEvaluationFindingComment[]>([]);
  const [commentValue, setCommentValue] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(findingStatusClass(finding.status))}>{finding.status}</Badge>
            <span className="text-xs font-black uppercase text-[#B6F7FF]">{finding.checklist_section}</span>
            <span className="text-xs text-white/42">Confidence {Math.round(finding.confidence_score * 100)}%</span>
          </div>
          <h3 className="mt-2 text-base font-bold leading-6 text-white">{finding.checklist_title}</h3>
        </div>
        <Badge className="border-white/12 bg-white/[0.05] text-white/74">{finding.adequacy}</Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextBlock title="Evidence Summary" body={finding.evidence_summary} />
        <TextBlock title="Analysis" body={finding.ai_analysis} />
      </div>

      {finding.missing_elements.length ? (
        <div className="mt-4 rounded-xl border border-red-400/18 bg-red-500/10 p-3">
          <div className="text-xs font-black uppercase text-red-100">Missing or weak elements</div>
          <ul className="mt-2 grid gap-2 text-sm text-red-50/92">
            {finding.missing_elements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {finding.recommendation ? (
        <div className="mt-4 rounded-xl border border-[#8BD15F]/18 bg-[#8BD15F]/10 p-3 text-sm text-[#E6F7D2]">
          <div className="text-xs font-black uppercase text-[#E6F7D2]">Recommendation</div>
          <p className="mt-2">{finding.recommendation}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <div className="text-xs font-black uppercase text-white/42">Evidence references</div>
        {finding.evidence_references.map((reference) => (
          <div key={`${reference.source_type}-${reference.chunk_id}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/68">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{reference.source_type}</Badge>
              {reference.subsection_number ? <span>{reference.subsection_number}</span> : null}
              {reference.source_document_filename ? <span>{reference.source_document_filename}</span> : null}
              {reference.page_number ? <span>Page {reference.page_number}</span> : null}
            </div>
            {reference.excerpt ? <p className="mt-2 leading-6 text-white/58">{reference.excerpt}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs font-black uppercase text-white/42">Reviewer comments</div>
          <Button type="button" size="sm" variant="ghost" onClick={() => void loadComments()}>
            <RotateCw />
            Refresh
          </Button>
        </div>
        {commentError ? <Alert className="mb-3 border-red-400/30 bg-red-500/10 text-red-100">{commentError}</Alert> : null}
        {loadingComments ? <Alert>Loading comments...</Alert> : null}
        {!comments.length && !loadingComments ? <Alert>No reviewer comments yet.</Alert> : null}
        <div className="grid gap-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-white/46">
                <span>{comment.user.full_name}</span>
                <span>{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/74">{comment.content}</p>
            </div>
          ))}
        </div>
        {canComment ? (
          <form className="mt-3 grid gap-3" onSubmit={submitComment}>
            <Textarea
              className="min-h-24"
              placeholder="Add reviewer notes for this finding."
              value={commentValue}
              onChange={(event) => setCommentValue(event.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={postingComment || !commentValue.trim()}>
                {postingComment ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
                Add Comment
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs font-black uppercase text-white/42">{title}</div>
      <p className="mt-2 text-sm leading-6 text-white/68">{body}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm font-semibold text-white/52">{label}</span>
      <span className="text-right text-sm text-white">{value}</span>
    </div>
  );
}

function findingStatusClass(status: string) {
  if (status === "COMPLIANT") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "PARTIALLY_COMPLIANT") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
  if (status === "NEEDS_IMPROVEMENT") {
    return "border-red-400/25 bg-red-500/10 text-red-100";
  }
  if (status === "MISSING") {
    return "border-red-500/30 bg-red-600/14 text-red-50";
  }
  return "border-[#67E8F9]/24 bg-[#67E8F9]/10 text-[#B6F7FF]";
}

function runStatusClass(status: string) {
  if (status === "COMPLETED" || status === "APPROVED") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "FAILED" || status === "CHANGES_REQUESTED") {
    return "border-red-400/25 bg-red-500/10 text-red-100";
  }
  if (status === "RUNNING" || status === "PENDING" || status === "REQUESTED") {
    return "border-[#67E8F9]/24 bg-[#67E8F9]/10 text-[#B6F7FF]";
  }
  return "border-white/12 bg-white/[0.05] text-white/68";
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
