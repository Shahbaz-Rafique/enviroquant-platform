"use client";

import { ClipboardCheck, Loader2, RefreshCcw, Trash2, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { AssigneeChip } from "@/components/eia/eia-collaboration-indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  EiaAssignmentUserSummary,
  EiaDocumentAssignmentsOverview,
  EiaDocumentMember,
  EiaSectionAssignment,
  EiaSubSectionAssignment,
} from "@/lib/types";

type EiaAssignmentWorkflowProps = {
  documentId: string;
  assignments: EiaDocumentAssignmentsOverview | null;
  members: EiaDocumentMember[];
  currentUserId: string;
  canManageAssignments: boolean;
  loading?: boolean;
  onAssignmentsChange: (next: EiaDocumentAssignmentsOverview) => void;
  onOpenSubsection: (subsectionId: string) => void;
};

type AssignmentDraft = {
  authorId: string;
  reviewerId: string;
  dueDate: string;
  isBlocked: boolean;
  blockedReason: string;
};

const emptyAssignmentValue = "__none__";

export function EiaAssignmentWorkflow({
  documentId,
  assignments,
  members,
  currentUserId,
  canManageAssignments,
  loading = false,
  onAssignmentsChange,
  onOpenSubsection,
}: EiaAssignmentWorkflowProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [subsectionDrafts, setSubsectionDrafts] = useState<Record<string, AssignmentDraft>>({});

  useEffect(() => {
    if (!assignments) {
      return;
    }
    const nextSectionDrafts: Record<string, AssignmentDraft> = {};
    const nextSubsectionDrafts: Record<string, AssignmentDraft> = {};

    for (const section of assignments.sections) {
      nextSectionDrafts[section.section_id] = {
        authorId: section.author_assignee?.id ?? emptyAssignmentValue,
        reviewerId: section.reviewer_assignee?.id ?? emptyAssignmentValue,
        dueDate: section.due_date ?? "",
        isBlocked: section.is_blocked,
        blockedReason: section.blocked_reason ?? "",
      };
      for (const subsection of section.subsections) {
        nextSubsectionDrafts[subsection.subsection_id] = {
          authorId: subsection.author_assignee?.id ?? emptyAssignmentValue,
          reviewerId: subsection.reviewer_assignee?.id ?? emptyAssignmentValue,
          dueDate: subsection.due_date ?? "",
          isBlocked: subsection.is_blocked,
          blockedReason: subsection.blocked_reason ?? "",
        };
      }
    }

    setSectionDrafts(nextSectionDrafts);
    setSubsectionDrafts(nextSubsectionDrafts);
  }, [assignments]);

  const memberOptions = useMemo(
    () =>
      members
        .map((member) => ({
          id: member.user_id,
          label: member.user.full_name,
          role: member.role,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [members],
  );

  async function refreshAssignments() {
    setBusyKey("refresh");
    setError(null);
    try {
      const next = await apiRequest<EiaDocumentAssignmentsOverview>(`/eia-documents/${documentId}/assignments`);
      onAssignmentsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignments could not be refreshed");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveSectionAssignment(sectionId: string) {
    const draft = sectionDrafts[sectionId];
    if (!draft) {
      return;
    }

    setBusyKey(`section-save:${sectionId}`);
    setError(null);
    try {
      const next = await apiRequest<EiaDocumentAssignmentsOverview>(
        `/eia-documents/${documentId}/sections/${sectionId}/assignments`,
        {
          method: "PUT",
          body: JSON.stringify({
            author_user_id: normalizeNullable(draft.authorId),
            reviewer_user_id: normalizeNullable(draft.reviewerId),
            due_date: draft.dueDate || null,
            is_blocked: draft.isBlocked,
            blocked_reason: draft.isBlocked ? draft.blockedReason || null : null,
          }),
        },
      );
      onAssignmentsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Section assignment could not be saved");
    } finally {
      setBusyKey(null);
    }
  }

  async function clearSectionAssignment(sectionId: string) {
    const section = assignments?.sections.find((item) => item.section_id === sectionId);
    if (!window.confirm(`Remove the section assignment for ${section?.title ?? "this section"}? Subsection overrides will remain in place.`)) {
      return;
    }
    setBusyKey(`section-clear:${sectionId}`);
    setError(null);
    try {
      const next = await apiRequest<EiaDocumentAssignmentsOverview>(
        `/eia-documents/${documentId}/sections/${sectionId}/assignments`,
        { method: "DELETE" },
      );
      onAssignmentsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Section assignment could not be cleared");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveSubsectionAssignment(subsectionId: string) {
    const draft = subsectionDrafts[subsectionId];
    if (!draft) {
      return;
    }

    setBusyKey(`subsection-save:${subsectionId}`);
    setError(null);
    try {
      const next = await apiRequest<EiaDocumentAssignmentsOverview>(
        `/eia-documents/${documentId}/subsections/${subsectionId}/assignments`,
        {
          method: "PUT",
          body: JSON.stringify({
            author_user_id: normalizeNullable(draft.authorId),
            reviewer_user_id: normalizeNullable(draft.reviewerId),
            due_date: draft.dueDate || null,
            is_blocked: draft.isBlocked,
            blocked_reason: draft.isBlocked ? draft.blockedReason || null : null,
          }),
        },
      );
      onAssignmentsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subsection assignment could not be saved");
    } finally {
      setBusyKey(null);
    }
  }

  async function clearSubsectionAssignment(subsectionId: string) {
    const subsection = assignments?.sections
      .flatMap((section) => section.subsections)
      .find((item) => item.subsection_id === subsectionId);
    if (!window.confirm(`Remove the subsection override for ${subsection?.title ?? "this subsection"}? It will inherit its section assignment.`)) {
      return;
    }
    setBusyKey(`subsection-clear:${subsectionId}`);
    setError(null);
    try {
      const next = await apiRequest<EiaDocumentAssignmentsOverview>(
        `/eia-documents/${documentId}/subsections/${subsectionId}/assignments`,
        { method: "DELETE" },
      );
      onAssignmentsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subsection assignment could not be cleared");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="builder-panel overflow-hidden">
      <div className="border-b border-[#e3eae6] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287451]">Collaborative development</p>
            <h3 className="mt-1 text-lg font-bold text-[#18372c]">Section ownership and assigned work</h3>
            <p className="mt-1 text-xs text-[#73827b]">Assign authors and reviewers by section or subsection, then track live responsibility and review readiness.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void refreshAssignments()}>
            {busyKey === "refresh" ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
        {loading ? <Alert>Loading assignment workflow...</Alert> : null}

        <article className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="size-4 text-[#287451]" />
            <h4 className="text-sm font-bold text-[#214238]">My Assigned Work</h4>
            <Badge className="ml-auto border-slate-200 bg-white text-slate-700">{assignments?.my_assigned_work.length ?? 0}</Badge>
          </div>
          {!assignments?.my_assigned_work.length ? (
            <p className="text-xs text-[#73827b]">No sections are currently assigned to you.</p>
          ) : (
            <div className="grid gap-2">
              {assignments.my_assigned_work.map((item) => (
                <button
                  key={item.subsection.subsection_id}
                  type="button"
                  onClick={() => onOpenSubsection(item.subsection.subsection_id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#dce6e1] bg-white px-3 py-2 text-left transition-colors hover:bg-[#f3f8f5]"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-[#287451]">
                      Section {item.section_number}
                    </span>
                    <span className="line-clamp-1 block text-sm font-semibold text-[#2b4a3e]">
                      {item.subsection.subsection_number} {item.subsection.title}
                    </span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1 text-[11px] font-semibold text-[#5f7369]">
                    <span>{toLabel(item.assignment_role)}</span>
                    <span className="flex items-center gap-2">
                      <Badge className={statusBadgeClass(item.subsection.completion_status)}>{toLabel(item.subsection.completion_status)}</Badge>
                      <span>{Math.round(item.subsection.progress_percentage)}%</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>

        {!assignments?.sections.length ? <Alert>No section assignments are available.</Alert> : null}

        <div className="grid gap-3">
          {assignments?.sections.map((section) => (
            <SectionAssignmentCard
              key={section.section_id}
              section={section}
              memberOptions={memberOptions}
              sectionDraft={sectionDrafts[section.section_id]}
              subsectionDrafts={subsectionDrafts}
              canManageAssignments={canManageAssignments}
              currentUserId={currentUserId}
              busyKey={busyKey}
              onSectionDraftChange={(draft) =>
                setSectionDrafts((current) => ({
                  ...current,
                  [section.section_id]: draft,
                }))
              }
              onSubsectionDraftChange={(subsectionId, draft) =>
                setSubsectionDrafts((current) => ({
                  ...current,
                  [subsectionId]: draft,
                }))
              }
              onSaveSection={() => void saveSectionAssignment(section.section_id)}
              onClearSection={() => void clearSectionAssignment(section.section_id)}
              onSaveSubsection={(subsectionId) => void saveSubsectionAssignment(subsectionId)}
              onClearSubsection={(subsectionId) => void clearSubsectionAssignment(subsectionId)}
              onOpenSubsection={onOpenSubsection}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type SectionAssignmentCardProps = {
  section: EiaSectionAssignment;
  memberOptions: Array<{ id: string; label: string; role: string }>;
  sectionDraft: AssignmentDraft | undefined;
  subsectionDrafts: Record<string, AssignmentDraft>;
  canManageAssignments: boolean;
  currentUserId: string;
  busyKey: string | null;
  onSectionDraftChange: (draft: AssignmentDraft) => void;
  onSubsectionDraftChange: (subsectionId: string, draft: AssignmentDraft) => void;
  onSaveSection: () => void;
  onClearSection: () => void;
  onSaveSubsection: (subsectionId: string) => void;
  onClearSubsection: (subsectionId: string) => void;
  onOpenSubsection: (subsectionId: string) => void;
};

function SectionAssignmentCard({
  section,
  memberOptions,
  sectionDraft,
  subsectionDrafts,
  canManageAssignments,
  currentUserId,
  busyKey,
  onSectionDraftChange,
  onSubsectionDraftChange,
  onSaveSection,
  onClearSection,
  onSaveSubsection,
  onClearSubsection,
  onOpenSubsection,
}: SectionAssignmentCardProps) {
  return (
    <article className="rounded-xl border border-[#dce6e1] bg-white">
      <div className="border-b border-[#ebf1ee] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#cfe0d7] bg-[#edf6f1] text-[#287451]">Section {section.section_number}</Badge>
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                {section.has_assignment ? "Section assignment" : "No section default"}
              </Badge>
              <Badge className={statusBadgeClass(section.completion_status)}>{toLabel(section.completion_status)}</Badge>
              <Badge className={reviewBadgeClass(section.review_status)}>{toLabel(section.review_status)}</Badge>
              {section.is_overdue ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">Overdue</Badge> : null}
              {section.is_blocked ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">Blocked</Badge> : null}
            </div>
            <h4 className="mt-2 text-base font-bold text-[#214238]">{section.title}</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <AssignmentRoleCard assignee={section.author_assignee} label="Section author" role="AUTHOR" />
              <AssignmentRoleCard assignee={section.reviewer_assignee} label="Section reviewer" role="REVIEWER" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52675e]">
              Responsible now: {sectionResponsibilityLabel(section)}
            </p>
            <p className="mt-1 text-xs text-[#6a7d74]">
              Last update: {formatLastUpdate(section.last_updated_at, section.last_updated_by?.full_name)}
            </p>
            <p className="mt-1 text-xs text-[#6a7d74]">
              Due: {formatDate(section.due_date)}{section.blocked_reason ? ` · ${section.blocked_reason}` : ""}
            </p>
          </div>
          <div className="min-w-[220px] rounded-lg border border-[#dce6e1] bg-[#f8faf9] px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#6a7d74]">
              <span>Section progress</span>
              <span>{Math.round(section.progress_percentage)}%</span>
            </div>
            <Progress className="h-1.5" value={section.progress_percentage} />
            <div className="mt-2 grid gap-1 text-[11px] font-medium text-[#6a7d74]">
              <p>Review: {toLabel(section.review_status)}</p>
              <p>Unresolved comments: {section.unresolved_comment_count}</p>
            </div>
          </div>
        </div>

        {canManageAssignments ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-[#dce6e1] bg-[#f8faf9] p-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_minmax(0,1fr)_auto_auto] xl:items-end">
            <label className="grid gap-1 text-xs font-semibold text-[#52675e]">
              Section author
              <Select
                value={sectionDraft?.authorId ?? emptyAssignmentValue}
                onValueChange={(value) =>
                  onSectionDraftChange({
                    ...(sectionDraft ?? draftFromAssignment(section)),
                    authorId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={emptyAssignmentValue}>Unassigned</SelectItem>
                  {memberOptions.filter(canBeAuthor).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.label} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#52675e]">
              Section reviewer
              <Select
                value={sectionDraft?.reviewerId ?? emptyAssignmentValue}
                onValueChange={(value) =>
                  onSectionDraftChange({
                    ...(sectionDraft ?? draftFromAssignment(section)),
                    reviewerId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={emptyAssignmentValue}>Unassigned</SelectItem>
                  {memberOptions.filter(canBeReviewer).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.label} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#52675e]">
              Due date
              <Input
                type="date"
                value={sectionDraft?.dueDate ?? ""}
                onChange={(event) => onSectionDraftChange({ ...(sectionDraft ?? draftFromAssignment(section)), dueDate: event.target.value })}
              />
            </label>

            <AssignmentBlockControl
              draft={sectionDraft ?? draftFromAssignment(section)}
              onChange={onSectionDraftChange}
            />

            <Button
              type="button"
              onClick={onSaveSection}
              disabled={busyKey === `section-save:${section.section_id}`}
            >
              {busyKey === `section-save:${section.section_id}` ? <Loader2 className="animate-spin" /> : <UserCheck />}
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClearSection}
              disabled={!section.has_assignment || busyKey === `section-clear:${section.section_id}`}
            >
              {busyKey === `section-clear:${section.section_id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      <div className="divide-y divide-[#edf1ee]">
        {section.subsections.map((subsection) => {
          const draft = subsectionDrafts[subsection.subsection_id] ?? {
            authorId: subsection.author_assignee?.id ?? emptyAssignmentValue,
            reviewerId: subsection.reviewer_assignee?.id ?? emptyAssignmentValue,
            dueDate: subsection.due_date ?? "",
            isBlocked: subsection.is_blocked,
            blockedReason: subsection.blocked_reason ?? "",
          };
          return (
            <SubsectionAssignmentRow
              key={subsection.subsection_id}
              subsection={subsection}
              draft={draft}
              memberOptions={memberOptions}
              busyKey={busyKey}
              canManageAssignments={canManageAssignments}
              isMine={
                subsection.author_assignee?.id === currentUserId ||
                subsection.reviewer_assignee?.id === currentUserId
              }
              onDraftChange={(next) => onSubsectionDraftChange(subsection.subsection_id, next)}
              onSave={() => onSaveSubsection(subsection.subsection_id)}
              onClear={() => onClearSubsection(subsection.subsection_id)}
              onOpen={() => onOpenSubsection(subsection.subsection_id)}
            />
          );
        })}
      </div>
    </article>
  );
}

type SubsectionAssignmentRowProps = {
  subsection: EiaSubSectionAssignment;
  draft: AssignmentDraft;
  memberOptions: Array<{ id: string; label: string; role: string }>;
  busyKey: string | null;
  canManageAssignments: boolean;
  isMine: boolean;
  onDraftChange: (next: AssignmentDraft) => void;
  onSave: () => void;
  onClear: () => void;
  onOpen: () => void;
};

function SubsectionAssignmentRow({
  subsection,
  draft,
  memberOptions,
  busyKey,
  canManageAssignments,
  isMine,
  onDraftChange,
  onSave,
  onClear,
  onOpen,
}: SubsectionAssignmentRowProps) {
  return (
    <div className={cn("grid gap-3 p-3", isMine && "bg-[#f5faf7]")}> 
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" className="min-w-0 text-left" onClick={onOpen}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#287451]">{subsection.subsection_number}</span>
            <Badge className={statusBadgeClass(subsection.completion_status)}>{toLabel(subsection.completion_status)}</Badge>
            <Badge className={reviewBadgeClass(subsection.review_status)}>{toLabel(subsection.review_status)}</Badge>
            <Badge className="border-slate-200 bg-slate-50 text-slate-700">
              {subsection.assignment_source === "SECTION" ? "Inherited from section" : toLabel(subsection.assignment_source)}
            </Badge>
            {subsection.is_overdue ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">Overdue</Badge> : null}
            {subsection.is_blocked ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">Blocked</Badge> : null}
            {isMine ? <Badge className="border-[#cfe0d7] bg-[#edf6f1] text-[#287451]">Assigned to me</Badge> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-[#334f45]">{subsection.title}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <AssignmentRoleCard assignee={subsection.author_assignee} label="Author" role="AUTHOR" />
            <AssignmentRoleCard assignee={subsection.reviewer_assignee} label="Reviewer" role="REVIEWER" />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#52675e]">
            Responsible now: {subsection.current_assignee?.full_name ?? "Unassigned"} ({toLabel(subsection.current_role)})
          </p>
          <p className="mt-1 text-[11px] text-[#6a7d74]">
            Last update: {formatLastUpdate(subsection.last_updated_at, subsection.last_updated_by?.full_name)}
          </p>
          <p className="mt-1 text-[11px] text-[#6a7d74]">
            Due: {formatDate(subsection.due_date)}{subsection.blocked_reason ? ` · ${subsection.blocked_reason}` : ""}
          </p>
        </button>

        <div className="w-full max-w-[220px] rounded-lg border border-[#dce6e1] bg-[#f8faf9] px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#6a7d74]">
            <span>Progress</span>
            <span>{Math.round(subsection.progress_percentage)}%</span>
          </div>
          <Progress className="h-1.5" value={subsection.progress_percentage} />
          <div className="mt-2 grid gap-1 text-[11px] text-[#6a7d74]">
            <p>Review: {toLabel(subsection.review_status)}</p>
            <p>Unresolved comments: {subsection.unresolved_comment_count}</p>
          </div>
        </div>
      </div>

      {canManageAssignments ? (
        <div className="grid gap-2 rounded-lg border border-[#dce6e1] bg-[#f8faf9] p-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_minmax(0,1fr)_auto_auto] xl:items-end">
          <label className="grid gap-1 text-xs font-semibold text-[#52675e]">
            Author
            <Select
              value={draft.authorId}
              onValueChange={(value) => onDraftChange({ ...draft, authorId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptyAssignmentValue}>Unassigned</SelectItem>
                {memberOptions.filter(canBeAuthor).map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.label} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#52675e]">
            Reviewer
            <Select
              value={draft.reviewerId}
              onValueChange={(value) => onDraftChange({ ...draft, reviewerId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reviewer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptyAssignmentValue}>Unassigned</SelectItem>
                {memberOptions.filter(canBeReviewer).map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.label} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#52675e]">
            Due date
            <Input type="date" value={draft.dueDate} onChange={(event) => onDraftChange({ ...draft, dueDate: event.target.value })} />
          </label>

          <AssignmentBlockControl draft={draft} onChange={onDraftChange} />

          <Button
            type="button"
            onClick={onSave}
            disabled={busyKey === `subsection-save:${subsection.subsection_id}`}
          >
            {busyKey === `subsection-save:${subsection.subsection_id}` ? <Loader2 className="animate-spin" /> : <UserCheck />}
            {subsection.assignment_source === "SUBSECTION" ? "Save changes" : "Save override"}
          </Button>
          {subsection.assignment_source === "SUBSECTION" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onClear}
              disabled={busyKey === `subsection-clear:${subsection.subsection_id}`}
            >
              {busyKey === `subsection-clear:${subsection.subsection_id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remove override
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AssignmentBlockControl({
  draft,
  onChange,
}: Readonly<{
  draft: AssignmentDraft;
  onChange: (next: AssignmentDraft) => void;
}>) {
  return (
    <div className="grid gap-1 text-xs font-semibold text-[#52675e]">
      <span>Work state</span>
      <div className="flex min-h-10 items-center gap-2">
        <Checkbox
          checked={draft.isBlocked}
          onCheckedChange={(checked) =>
            onChange({
              ...draft,
              isBlocked: checked === true,
              blockedReason: checked === true ? draft.blockedReason : "",
            })
          }
          aria-label="Mark assignment as blocked"
        />
        {draft.isBlocked ? (
          <Input
            value={draft.blockedReason}
            onChange={(event) => onChange({ ...draft, blockedReason: event.target.value })}
            placeholder="Blocking reason"
            aria-label="Blocking reason"
          />
        ) : (
          <span className="font-medium text-[#6a7d74]">On track</span>
        )}
      </div>
    </div>
  );
}

function AssignmentRoleCard({
  assignee,
  label,
  role,
}: Readonly<{
  assignee: EiaAssignmentUserSummary | null;
  label: string;
  role: "AUTHOR" | "REVIEWER";
}>) {
  return (
    <span className="rounded-lg border border-[#dce6e1] bg-[#f8faf9] px-3 py-2">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a8a83]">{label}</span>
      <AssigneeChip assignee={assignee} role={role} />
    </span>
  );
}

function draftFromAssignment(
  assignment: Pick<
    EiaSectionAssignment | EiaSubSectionAssignment,
    "author_assignee" | "reviewer_assignee" | "due_date" | "is_blocked" | "blocked_reason"
  >,
): AssignmentDraft {
  return {
    authorId: assignment.author_assignee?.id ?? emptyAssignmentValue,
    reviewerId: assignment.reviewer_assignee?.id ?? emptyAssignmentValue,
    dueDate: assignment.due_date ?? "",
    isBlocked: assignment.is_blocked,
    blockedReason: assignment.blocked_reason ?? "",
  };
}

function normalizeNullable(value: string) {
  return value === emptyAssignmentValue ? null : value;
}

function canBeAuthor(member: { role: string }) {
  return member.role.toUpperCase() === "EDITOR";
}

function canBeReviewer(member: { role: string }) {
  return member.role.toUpperCase() === "REVIEWER";
}

function toLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (["APPROVED", "COMPLETE"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["READY_FOR_REVIEW", "UNDER_REVIEW"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["IN_PROGRESS", "REVISION_REQUIRED"].includes(normalized)) {
    return "border-[#cfe0d7] bg-[#edf6f1] text-[#287451]";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function reviewBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMMENTS_OPEN") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "READY_FOR_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["APPROVED", "COMPLETED"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
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

function sectionResponsibilityLabel(section: EiaSectionAssignment) {
  const responsibilities = new Map<string, { name: string; role: string }>();
  for (const subsection of section.subsections) {
    if (subsection.current_assignee) {
      responsibilities.set(subsection.current_assignee.id, {
        name: subsection.current_assignee.full_name,
        role: subsection.current_role,
      });
    }
  }
  const active = [...responsibilities.values()];
  if (active.length === 1) {
    return `${active[0].name} (${toLabel(active[0].role)})`;
  }
  if (active.length > 1) {
    return `${active.length} specialists across assigned subsections`;
  }
  return "Unassigned";
}

function formatLastUpdate(value: string | null, userName?: string) {
  const timestamp = formatDateTime(value);
  return userName ? `${userName} · ${timestamp}` : timestamp;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "No due date";
  }
  return parsed.toLocaleDateString();
}
