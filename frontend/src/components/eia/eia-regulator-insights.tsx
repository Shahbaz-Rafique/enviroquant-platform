"use client";

import { AlertTriangle, BarChart3, GitCompareArrows, Scale, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  EiaDocument,
  EiaDocumentCrossComparison,
  EiaRegulatorOverview
} from "@/lib/types";

type EiaRegulatorInsightsProps = {
  projectId: string;
};

export function EiaRegulatorInsights({ projectId }: EiaRegulatorInsightsProps) {
  const [overview, setOverview] = useState<EiaRegulatorOverview | null>(null);
  const [documents, setDocuments] = useState<EiaDocument[]>([]);
  const [leftDocumentId, setLeftDocumentId] = useState<string>("NONE");
  const [rightDocumentId, setRightDocumentId] = useState<string>("NONE");
  const [comparison, setComparison] = useState<EiaDocumentCrossComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, documentData] = await Promise.all([
        apiRequest<EiaRegulatorOverview>(`/eia-documents/project/${projectId}/regulator-insights`),
        apiRequest<EiaDocument[]>(`/eia-documents/project/${projectId}`)
      ]);
      setOverview(overviewData);
      setDocuments(documentData);
      setLeftDocumentId((current) => current !== "NONE" ? current : documentData[0]?.id ?? "NONE");
      setRightDocumentId((current) => current !== "NONE" ? current : documentData[1]?.id ?? documentData[0]?.id ?? "NONE");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regulator insights could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadComparison = useCallback(async () => {
    if (leftDocumentId === "NONE" || rightDocumentId === "NONE" || leftDocumentId === rightDocumentId) {
      setComparison(null);
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const payload = await apiRequest<EiaDocumentCrossComparison>(
        `/eia-documents/project/${projectId}/regulator-compare?left_document_id=${encodeURIComponent(leftDocumentId)}&right_document_id=${encodeURIComponent(rightDocumentId)}`
      );
      setComparison(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cross-document comparison could not be loaded");
    } finally {
      setComparing(false);
    }
  }, [leftDocumentId, projectId, rightDocumentId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  return (
    <div className="grid gap-5">
      {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
      {loading ? <Alert>Loading regulator insights...</Alert> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<ShieldCheck />} label="Benchmarked EIAs" value={String(overview?.benchmark_documents.length ?? 0)} />
        <MetricCard icon={<BarChart3 />} label="Trend Points" value={String(overview?.trend_points.length ?? 0)} />
        <MetricCard icon={<Scale />} label="Recent Decisions" value={String(overview?.recent_decisions.length ?? 0)} />
        <MetricCard icon={<GitCompareArrows />} label="Comparison Mode" value={comparison ? "Ready" : "Select"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quality Benchmark</CardTitle>
            <CardDescription>Rank EIA documents by the latest completed evaluation score and latest approval outcome.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!overview?.benchmark_documents.length ? <Alert>No evaluated EIA documents available for benchmarking.</Alert> : null}
            {overview?.benchmark_documents.map((item, index) => (
              <div key={item.eia_document_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase text-[#B6F7FF]">Rank {index + 1}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{item.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-white">{item.latest_score}/10</div>
                    <div className="text-xs text-white/56">{item.latest_appraisal ?? "No appraisal"}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{item.document_status}</Badge>
                  {item.approval_status ? <Badge className={cn(statusBadgeClass(item.approval_status))}>{item.approval_status}</Badge> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Trend</CardTitle>
            <CardDescription>Track the latest evaluation trajectory across documents in this project.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!overview?.trend_points.length ? <Alert>No completed evaluation runs available yet.</Alert> : null}
            {overview?.trend_points.map((point) => (
              <div key={point.run_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{point.eia_document_title}</div>
                    <div className="mt-1 text-xs text-white/52">{new Date(point.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-white">{point.overall_score}/10</div>
                    <div className="text-xs text-white/56">{point.overall_appraisal ?? "-"}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cross-EIA Comparison</CardTitle>
            <CardDescription>Compare two evaluated EIA documents using their latest completed review run.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-white/72">
                Left document
                <Select value={leftDocumentId} onValueChange={setLeftDocumentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select EIA document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select EIA document</SelectItem>
                    {documents.map((document) => (
                      <SelectItem key={document.id} value={document.id}>
                        {document.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-white/72">
                Right document
                <Select value={rightDocumentId} onValueChange={setRightDocumentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select EIA document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select EIA document</SelectItem>
                    {documents.map((document) => (
                      <SelectItem key={document.id} value={document.id}>
                        {document.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            {comparing ? <Alert>Loading cross-document comparison...</Alert> : null}
            {!comparison && !comparing ? <Alert>Select two different evaluated EIA documents to compare.</Alert> : null}
            {comparison ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <MetricCard icon={<GitCompareArrows />} label="Left Score" value={`${comparison.left_score}/10`} compact />
                  <MetricCard icon={<GitCompareArrows />} label="Right Score" value={`${comparison.right_score}/10`} compact />
                  <MetricCard icon={<AlertTriangle />} label="Delta" value={`${comparison.delta >= 0 ? "+" : ""}${comparison.delta}`} compact />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {comparison.section_deltas.map((section) => (
                    <div key={section.section_number} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs font-black uppercase text-[#B6F7FF]">Section {section.section_number}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{section.section_title}</div>
                      <div className="mt-3 text-sm text-white/68">
                        Left {section.current_score}/10 · Right {section.baseline_score}/10
                      </div>
                      <div className={cn("mt-2 text-sm font-bold", section.delta >= 0 ? "text-emerald-200" : "text-red-100")}>
                        Delta {section.delta >= 0 ? "+" : ""}
                        {section.delta}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Decisions</CardTitle>
            <CardDescription>Recent formal review decisions and submission trail for regulator auditability.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!overview?.recent_decisions.length ? <Alert>No formal review decisions recorded yet.</Alert> : null}
            {overview?.recent_decisions.map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge className={cn(statusBadgeClass(decision.status))}>{decision.status}</Badge>
                  <span className="text-xs text-white/56">{new Date(decision.requested_at).toLocaleString()}</span>
                </div>
                {decision.request_note ? <p className="mt-3 text-sm text-white/72">{decision.request_note}</p> : null}
                {decision.decision_note ? <p className="mt-2 text-sm text-white/62">{decision.decision_note}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  compact = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-[#B6F7FF]">{icon}</div>
      <div className={cn("font-black text-white", compact ? "mt-3 text-xl" : "mt-4 text-3xl")}>{value}</div>
      <div className="mt-1 text-xs font-bold uppercase text-white/46">{label}</div>
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "CHANGES_REQUESTED") {
    return "border-red-400/25 bg-red-500/10 text-red-100";
  }
  if (status === "REQUESTED") {
    return "border-[#67E8F9]/24 bg-[#67E8F9]/10 text-[#B6F7FF]";
  }
  return "border-white/12 bg-white/[0.05] text-white/68";
}
