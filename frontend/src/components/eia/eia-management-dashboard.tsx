"use client";

import { AlertTriangle, ArrowRight, Clock3, Flag, ListChecks } from "lucide-react";
import { useMemo } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  EiaDocumentAssignmentsOverview,
  EiaDocumentProgress,
  EiaDocumentStructure,
  EiaSection,
  EiaSectionAssignment,
} from "@/lib/types";

type EiaManagementDashboardProps = {
  document: EiaDocumentStructure | null;
  progress: EiaDocumentProgress | null;
  assignments: EiaDocumentAssignmentsOverview | null;
  loading: boolean;
  onOpenSubsection: (subsectionId: string) => void;
};

type SectionAttention = {
  section: EiaSection;
  assignment: EiaSectionAssignment | null;
  progressPercentage: number;
  completionStatus: string;
  flags: string[];
  targetSubsectionId: string | null;
};

const overdueDays = 14;

export function EiaManagementDashboard({ document, progress, assignments, loading, onOpenSubsection }: EiaManagementDashboardProps) {
  const sectionAssignmentById = useMemo(
    () => new Map((assignments?.sections ?? []).map((item) => [item.section_id, item])),
    [assignments],
  );
  const sectionProgressById = useMemo(
    () => new Map((progress?.sections ?? []).map((item) => [item.section_id, item])),
    [progress],
  );

  const sectionAttention = useMemo(() => {
    const sections = document?.sections ?? [];
    return sections.map((section) => {
      const assignment = sectionAssignmentById.get(section.id) ?? null;
      const progressEntry = sectionProgressById.get(section.id);
      const progressPercentage = progressEntry ? Math.round(progressEntry.progress_percentage) : inferSectionProgress(section);
      const completionStatus = assignment?.completion_status ?? inferSectionStatus(section, progressPercentage);
      const flags = computeSectionFlags(assignment, completionStatus);
      const targetSubsectionId = pickAttentionSubsectionId(section, assignment, flags);
      return {
        section,
        assignment,
        progressPercentage,
        completionStatus,
        flags,
        targetSubsectionId,
      } satisfies SectionAttention;
    });
  }, [document?.sections, sectionAssignmentById, sectionProgressById]);

  const attentionSections = sectionAttention.filter((item) => item.flags.length > 0);

  const dashboardCounts = useMemo(() => {
    return {
      overdue: sectionAttention.filter((item) => item.flags.includes("OVERDUE")).length,
      blocked: sectionAttention.filter((item) => item.flags.includes("BLOCKED")).length,
      unassigned: sectionAttention.filter((item) => item.flags.includes("UNASSIGNED")).length,
      reviewReady: sectionAttention.filter((item) => item.flags.includes("REVIEW_READY")).length,
    };
  }, [sectionAttention]);

  const overallCompletion = Math.round(progress?.progress_percentage ?? 0);

  return (
    <section className="builder-panel overflow-hidden">
      <header className="border-b border-[#e3eae6] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287451]">Management dashboard</p>
            <h2 className="mt-1 text-xl font-bold text-[#18372c]">Overall EIA progress and section risks</h2>
            <p className="mt-1 text-sm text-[#697a73]">Track completion, identify blocked/overdue/unassigned work, and jump directly to sections requiring attention.</p>
          </div>
          <div className="w-full max-w-sm rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#52675e]">Overall completion</span>
              <strong className="text-[#18372c]">{overallCompletion}%</strong>
            </div>
            <Progress value={overallCompletion} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CountBadge icon={<Clock3 className="size-4" />} label="Overdue" value={dashboardCounts.overdue} tone="amber" />
          <CountBadge icon={<AlertTriangle className="size-4" />} label="Blocked" value={dashboardCounts.blocked} tone="rose" />
          <CountBadge icon={<Flag className="size-4" />} label="Unassigned" value={dashboardCounts.unassigned} tone="slate" />
          <CountBadge icon={<ListChecks className="size-4" />} label="Review-ready" value={dashboardCounts.reviewReady} tone="emerald" />
        </div>
      </header>

      <div className="grid gap-4 p-4">
        {loading ? <Alert>Loading management dashboard...</Alert> : null}

        <article className="rounded-xl border border-[#dce6e1] bg-white">
          <div className="border-b border-[#edf1ef] px-4 py-3">
            <h3 className="text-sm font-bold text-[#214238]">Major section status</h3>
          </div>
          <div className="divide-y divide-[#edf1ef]">
            {sectionAttention.map((item) => (
              <div key={item.section.id} className="grid gap-2 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-[#cfe0d7] bg-[#edf6f1] text-[#287451]">Section {item.section.section_number}</Badge>
                    <Badge className={statusBadgeClass(item.completionStatus)}>{labelize(item.completionStatus)}</Badge>
                    {item.flags.map((flag) => (
                      <Badge key={flag} className={flagBadgeClass(flag)}>{labelize(flag)}</Badge>
                    ))}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-[#29483c]">{item.section.title}</p>
                  <p className="mt-1 text-xs text-[#6f8078]">
                    Assignee: {item.assignment?.current_assignee?.full_name ?? "Unassigned"} ({labelize(item.assignment?.current_role ?? "UNASSIGNED")})
                  </p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#6f8078]">
                    <span>Progress</span>
                    <span>{item.progressPercentage}%</span>
                  </div>
                  <Progress className="h-1.5" value={item.progressPercentage} />
                </div>
                <div className="text-xs text-[#6f8078] lg:text-right">
                  Last update: {formatDateTime(item.assignment?.last_updated_at ?? null)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[#dce6e1] bg-white">
          <div className="border-b border-[#edf1ef] px-4 py-3">
            <h3 className="text-sm font-bold text-[#214238]">Sections requiring attention</h3>
          </div>
          <div className="p-4">
            {!attentionSections.length ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">No urgent section attention flags right now.</Alert>
            ) : (
              <div className="grid gap-2">
                {attentionSections.map((item) => (
                  <div key={item.section.id} className="flex flex-col gap-2 rounded-lg border border-[#dce6e1] bg-[#f8faf9] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#29483c]">
                        Section {item.section.section_number}: {item.section.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.flags.map((flag) => (
                          <Badge key={flag} className={flagBadgeClass(flag)}>{labelize(flag)}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      disabled={!item.targetSubsectionId}
                      onClick={() => item.targetSubsectionId && onOpenSubsection(item.targetSubsectionId)}
                    >
                      Open attention item
                      <ArrowRight />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function computeSectionFlags(assignment: EiaSectionAssignment | null, completionStatus: string) {
  const flags: string[] = [];

  if (isOverdue(assignment, completionStatus)) {
    flags.push("OVERDUE");
  }
  if (isBlocked(assignment)) {
    flags.push("BLOCKED");
  }
  if (isUnassigned(assignment)) {
    flags.push("UNASSIGNED");
  }
  if (isReviewReady(assignment, completionStatus)) {
    flags.push("REVIEW_READY");
  }

  return flags;
}

function pickAttentionSubsectionId(section: EiaSection, assignment: EiaSectionAssignment | null, flags: string[]) {
  if (!section.subsections.length) {
    return null;
  }

  const attentionFirst = assignment?.subsections.find((subsection) => subsection.unresolved_comment_count > 0)
    ?? assignment?.subsections.find((subsection) => subsection.current_assignee === null)
    ?? assignment?.subsections.find((subsection) => subsection.review_status === "READY_FOR_REVIEW")
    ?? assignment?.subsections[0]
    ?? null;

  if (attentionFirst) {
    return attentionFirst.subsection_id;
  }

  if (flags.length > 0) {
    return section.subsections[0].id;
  }
  return null;
}

function inferSectionProgress(section: EiaSection) {
  if (!section.subsections.length) {
    return 0;
  }
  const total = section.subsections.reduce((sum, item) => sum + item.progress_percentage, 0);
  return Math.round(total / section.subsections.length);
}

function inferSectionStatus(section: EiaSection, progressPercentage: number) {
  const statuses = new Set(section.subsections.map((item) => item.completion_status));
  if (statuses.size === 1 && statuses.has("COMPLETE")) {
    return "COMPLETE";
  }
  if (statuses.has("READY_FOR_REVIEW")) {
    return "READY_FOR_REVIEW";
  }
  if (statuses.has("IN_PROGRESS") || progressPercentage > 0) {
    return "IN_PROGRESS";
  }
  return "NOT_STARTED";
}

function isOverdue(assignment: EiaSectionAssignment | null, completionStatus: string) {
  if (!assignment?.last_updated_at || completionStatus === "COMPLETE") {
    return false;
  }
  const lastUpdated = new Date(assignment.last_updated_at);
  if (Number.isNaN(lastUpdated.getTime())) {
    return false;
  }
  const now = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;
  const daysSinceUpdate = Math.floor((now - lastUpdated.getTime()) / msInDay);
  return daysSinceUpdate >= overdueDays;
}

function isBlocked(assignment: EiaSectionAssignment | null) {
  if (!assignment) {
    return false;
  }
  return assignment.review_status === "COMMENTS_OPEN" || assignment.unresolved_comment_count > 0;
}

function isUnassigned(assignment: EiaSectionAssignment | null) {
  return !assignment?.current_assignee;
}

function isReviewReady(assignment: EiaSectionAssignment | null, completionStatus: string) {
  if (assignment?.review_status === "READY_FOR_REVIEW") {
    return true;
  }
  return completionStatus === "READY_FOR_REVIEW";
}

function CountBadge({ icon, label, value, tone }: Readonly<{ icon: React.ReactNode; label: string; value: number; tone: "amber" | "rose" | "slate" | "emerald" }>) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", toneClass[tone])}>
      {icon}
      <span className="text-xs font-semibold">{label}</span>
      <strong className="ml-auto text-sm">{value}</strong>
    </div>
  );
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "READY_FOR_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "IN_PROGRESS") {
    return "border-[#cfe0d7] bg-[#edf6f1] text-[#287451]";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function flagBadgeClass(flag: string) {
  const normalized = flag.toUpperCase();
  if (normalized === "OVERDUE") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "BLOCKED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "REVIEW_READY") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function labelize(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }
  return parsed.toLocaleString();
}
