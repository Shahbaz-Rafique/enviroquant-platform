"use client";

import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileSearch,
  FileText,
  Loader2,
  MessageSquare,
  Save,
  ShieldCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { EiaActivityFeed } from "@/components/eia/eia-activity-feed";
import { EiaProgressOverview } from "@/components/eia/eia-progress-overview";
import { EiaSourceMappingPanel } from "@/components/eia/eia-source-mapping-panel";
import { EiaTeamPanel } from "@/components/eia/eia-team-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { canEditEiaDocument, hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type {
  EiaActivityItem,
  EiaDocumentMember,
  EiaDocumentProgress,
  EiaDocumentStructure,
  EiaSubSection,
  User
} from "@/lib/types";

type EiaDocumentBuilderProps = {
  documentId: string;
  projectId: string;
  user: User;
};

const statusOptions = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "COMPLETE", label: "Complete" }
];

const insightTabs = [
  { value: "progress", label: "Progress", icon: BarChart3 },
  { value: "team", label: "Team", icon: Users },
  { value: "sources", label: "Sources", icon: FileSearch },
  { value: "activity", label: "Activity", icon: MessageSquare }
] as const;

type InsightTab = (typeof insightTabs)[number]["value"];

export function EiaDocumentBuilder({ documentId, projectId, user }: EiaDocumentBuilderProps) {
  const [document, setDocument] = useState<EiaDocumentStructure | null>(null);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [completionStatus, setCompletionStatus] = useState("NOT_STARTED");
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [progressSummary, setProgressSummary] = useState<EiaDocumentProgress | null>(null);
  const [members, setMembers] = useState<EiaDocumentMember[]>([]);
  const [activity, setActivity] = useState<EiaActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeInsight, setActiveInsight] = useState<InsightTab>("progress");
  const currentMemberRole = members.find((member) => member.user_id === user.id)?.role ?? null;
  const effectiveDocumentRole = currentMemberRole ?? (hasPermission(user, PERMISSIONS.TENANT_MANAGE) ? "EDITOR" : null);
  const canEdit = canEditEiaDocument(effectiveDocumentRole);

  const selectedSubsection = useMemo(() => {
    return document?.sections.flatMap((section) => section.subsections).find(
      (subsection) => subsection.id === selectedSubsectionId
    ) ?? null;
  }, [document, selectedSubsectionId]);

  const selectedSection = useMemo(() => {
    return document?.sections.find((section) =>
      section.subsections.some((subsection) => subsection.id === selectedSubsectionId)
    ) ?? null;
  }, [document, selectedSubsectionId]);

  const progress = useMemo(() => {
    const subsections = document?.sections.flatMap((section) => section.subsections) ?? [];
    if (progressSummary) {
      return {
        total: progressSummary.total_subsections,
        complete: progressSummary.completed_subsections
      };
    }
    if (!subsections.length) {
      return { total: 0, complete: 0 };
    }
    return {
      total: subsections.length,
      complete: subsections.filter((subsection) => subsection.completion_status === "COMPLETE").length
    };
  }, [document, progressSummary]);

  const documentStats = useMemo(() => {
    const sections = document?.sections ?? [];
    const subsections = sections.flatMap((section) => section.subsections);
    return {
      sections: sections.length,
      subsections: subsections.length,
      readyForReview: subsections.filter((subsection) => subsection.completion_status === "READY_FOR_REVIEW").length,
      inProgress: subsections.filter((subsection) => subsection.completion_status === "IN_PROGRESS").length
    };
  }, [document]);

  const activeInsightLabel = insightTabs.find((tab) => tab.value === activeInsight)?.label ?? "Insights";

  const refreshActivity = useCallback(async () => {
    setActivity(await apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`));
  }, [documentId]);

  const refreshMembers = useCallback(async () => {
    const nextMembers = await apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`);
    setMembers(nextMembers);
    await refreshActivity();
  }, [documentId, refreshActivity]);

  const refreshDashboardData = useCallback(async () => {
    const [nextProgress, nextMembers, nextActivity] = await Promise.all([
      apiRequest<EiaDocumentProgress>(`/eia-documents/${documentId}/progress`),
      apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`),
      apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`)
    ]);
    setProgressSummary(nextProgress);
    setMembers(nextMembers);
    setActivity(nextActivity);
  }, [documentId]);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, nextProgress, nextMembers, nextActivity] = await Promise.all([
        apiRequest<EiaDocumentStructure>(`/eia-documents/${documentId}`),
        apiRequest<EiaDocumentProgress>(`/eia-documents/${documentId}/progress`),
        apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`),
        apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`)
      ]);
      setDocument(data);
      setProgressSummary(nextProgress);
      setMembers(nextMembers);
      setActivity(nextActivity);
      const firstSubsection = data.sections[0]?.subsections[0] ?? null;
      setSelectedSubsectionId((current) => current ?? firstSubsection?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "EIA document could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    if (!selectedSubsection) {
      return;
    }
    setContent(selectedSubsection.content);
    setCompletionStatus(selectedSubsection.completion_status);
    setProgressPercentage(selectedSubsection.progress_percentage);
    setSavedAt(null);
  }, [selectedSubsection]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubsection || !document) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<EiaSubSection>(
        `/eia-documents/${document.id}/subsections/${selectedSubsection.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            content,
            completion_status: completionStatus,
            progress_percentage: progressPercentage
          })
        }
      );
      setDocument((current) => replaceSubsection(current, updated));
      setSavedAt(new Date().toLocaleTimeString());
      void refreshDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subsection could not be saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-workspace">
        <div className="grid gap-5 border-b border-slate-200 p-5 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-blue-200 bg-blue-50 text-blue-800">Structured EIA</Badge>
              <Badge className={cn(statusBadgeClass(document?.status ?? "draft"))}>
                {document?.status ?? "draft"}
              </Badge>
              <span className="text-xs font-semibold uppercase text-slate-500">
                {progress.complete}/{progress.total} complete
              </span>
            </div>
            <h1 className="truncate text-2xl font-bold leading-tight text-slate-950">
              {document?.title ?? "Loading EIA document"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Work through  checklist method section by section, keep draft changes traceable,
              and promote detailed editing to the focused subsection workspace.
            </p>
          </div>

          <div className="grid min-w-72 gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-700">Overall Progress</span>
              <span className="text-2xl font-black text-slate-950">
                {Math.round(progressSummary?.progress_percentage ?? 0)}%
              </span>
            </div>
            <Progress value={progressSummary?.progress_percentage ?? 0} />
          </div>
        </div>

        <div className="grid divide-y divide-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
          <MetricTile icon={<BookOpenCheck />} label="Sections" value={documentStats.sections || 8} />
          <MetricTile icon={<FileText />} label="Checklist Items" value={documentStats.subsections || progress.total} />
          <MetricTile icon={<Clock3 />} label="In Progress" value={documentStats.inProgress} />
          <MetricTile icon={<ShieldCheck />} label="Ready for Review" value={documentStats.readyForReview} />
        </div>
      </section>

      {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

      <section className="grid min-h-[calc(100vh-11rem)] gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="builder-panel sticky top-20 self-start overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-bold text-slate-950">
                <BookOpenCheck className="size-5 text-blue-700" />
                Checklist
              </span>
              <Badge>{progress.complete}/{progress.total}</Badge>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">Select a subsection to draft or review.</p>
          </div>

          <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-3">
            {loading ? <Alert>Loading checklist...</Alert> : null}
            {document?.sections.map((section) => (
              <div className="mb-4" key={section.id}>
                <div className="sticky top-0 z-10 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-700">
                  {section.section_number}. {section.title}
                </div>
                <div className="mt-2 grid gap-1">
                  {section.subsections.map((subsection) => {
                    const active = selectedSubsectionId === subsection.id;
                    const StatusIcon = iconForCompletionStatus(subsection.completion_status);
                    return (
                      <button
                        className={cn(
                          "group grid gap-1 rounded-sm border border-transparent px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50",
                          active && "border-blue-300 bg-blue-50 shadow-sm"
                        )}
                        key={subsection.id}
                        onClick={() => setSelectedSubsectionId(subsection.id)}
                        type="button"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black uppercase text-blue-700">
                            {subsection.subsection_number}
                          </span>
                          <StatusIcon
                            className={cn("size-4 shrink-0", statusIconClass(subsection.completion_status))}
                          />
                        </span>
                        <span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">
                          {subsection.title}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {Math.round(subsection.progress_percentage)}% complete
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <form className="builder-panel min-w-0 self-start overflow-hidden" onSubmit={submit}>
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black uppercase text-blue-700">
                    {selectedSection ? `Section ${selectedSection.section_number}` : "Section"}
                  </span>
                  <Badge className={cn(statusBadgeClass(completionStatus))}>{statusLabel(completionStatus)}</Badge>
                </div>
                <h2 className="mt-2 text-xl font-bold leading-tight text-slate-950">
                  {selectedSubsection?.subsection_number ? `${selectedSubsection.subsection_number}. ` : ""}
                  {selectedSubsection?.title ?? "Select a subsection"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSubsection ? (
                  <Button asChild variant="secondary">
                    <Link href={`/projects/${projectId}/eia/${documentId}/subsection/${selectedSubsection.id}`}>
                      <ExternalLink />
                      Focus Workspace
                    </Link>
                  </Button>
                ) : null}
                <Button type="submit" disabled={!canEdit || !selectedSubsection || saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Save Draft
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 border-b border-slate-200 bg-slate-50 p-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Completion status
              <Select disabled={!canEdit} value={completionStatus} onValueChange={setCompletionStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Progress
              <NumberStepper
                disabled={!canEdit}
                max={100}
                min={0}
                value={progressPercentage}
                onChange={setProgressPercentage}
              />
            </label>
            <div className="grid content-end">
              <div className="h-10 rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500">
                {savedAt ? `Saved ${savedAt}` : "Not saved this session"}
              </div>
            </div>
          </div>

          <div className="p-5">
            <Textarea
              className="min-h-[560px] resize-y rounded-md border-slate-300 bg-white text-base leading-7"
              disabled={!canEdit || !selectedSubsection}
              placeholder="Draft structured EIA content for this checklist item. Include evidence references, quantified details, assumptions, and source notes."
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
        </form>

        <aside className="xl:col-span-2 2xl:col-span-1">
          <div className="sticky top-20 grid content-start gap-4">
            <section className="builder-panel overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-slate-950">Workspace Insights</span>
                  <Badge>{activeInsightLabel}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {insightTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        className={cn(
                          "flex h-9 items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold uppercase text-slate-600 transition-colors hover:bg-blue-50",
                          activeInsight === tab.value && "border-blue-300 bg-blue-50 text-blue-800"
                        )}
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveInsight(tab.value)}
                      >
                        <Icon className="size-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
            {activeInsight === "progress" ? <EiaProgressOverview progress={progressSummary} /> : null}
            {activeInsight === "team" ? (
              <EiaTeamPanel
                canManage={canEdit}
                currentUserId={user.id}
                documentId={documentId}
                loading={loading}
                members={members}
                onMembersChange={(nextMembers) => {
                  setMembers(nextMembers);
                  void refreshActivity();
                }}
                onRefresh={refreshMembers}
              />
            ) : null}
            {activeInsight === "sources" ? (
              <EiaSourceMappingPanel
                canManage={canEdit}
                documentId={documentId}
                projectId={projectId}
                onApplied={loadDocument}
              />
            ) : null}
            {activeInsight === "activity" ? <EiaActivityFeed activity={activity} /> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700 [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <div className="text-2xl font-black leading-none text-slate-950">{value}</div>
        <div className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function iconForCompletionStatus(status: string) {
  if (status === "COMPLETE") {
    return CheckCircle2;
  }
  if (status === "IN_PROGRESS" || status === "READY_FOR_REVIEW") {
    return CircleDashed;
  }
  return Clock3;
}

function statusIconClass(status: string) {
  if (status === "COMPLETE") {
    return "text-emerald-600";
  }
  if (status === "READY_FOR_REVIEW") {
    return "text-amber-600";
  }
  if (status === "IN_PROGRESS") {
    return "text-blue-600";
  }
  return "text-slate-400";
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? status.replaceAll("_", " ");
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETE" || normalized === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "READY_FOR_REVIEW" || normalized === "IN_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "IN_PROGRESS" || normalized === "DRAFT") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function replaceSubsection(
  document: EiaDocumentStructure | null,
  updated: EiaSubSection
): EiaDocumentStructure | null {
  if (!document) {
    return document;
  }

  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      subsections: section.subsections.map((subsection) =>
        subsection.id === updated.id ? updated : subsection
      )
    }))
  };
}
