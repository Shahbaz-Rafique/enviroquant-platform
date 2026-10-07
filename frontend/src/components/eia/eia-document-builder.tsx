"use client";

import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Copy,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FolderOpen,
  Gauge,
  LayoutList,
  Loader2,
  MessageSquare,
  PenLine,
  RefreshCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { EiaActivityFeed } from "@/components/eia/eia-activity-feed";
import { EiaAssignmentWorkflow } from "@/components/eia/eia-assignment-workflow";
import { AssigneeChip, CollaboratorStack, ResponsibilityCard } from "@/components/eia/eia-collaboration-indicators";
import { EiaManagementDashboard } from "@/components/eia/eia-management-dashboard";
import { EiaProgressOverview } from "@/components/eia/eia-progress-overview";
import { EiaReviewQueue } from "@/components/eia/eia-review-queue";
import { EiaSourceMappingPanel } from "@/components/eia/eia-source-mapping-panel";
import { SectionSuggestions } from "@/components/eia/section-suggestions";
import { EiaDelivery } from "@/components/eia/eia-delivery";
import { EiaTeamPanel } from "@/components/eia/eia-team-panel";
import { EiaWorkflowActions } from "@/components/eia/eia-workflow-actions";
import { EiaWorkflowStepper } from "@/components/eia/eia-workflow-stepper";
import { TipTapEditor } from "@/components/Editor/TipTapEditor";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Progress } from "@/components/ui/progress";
import { getAccessToken } from "@/lib/auth";
import { API_URL, ApiError, apiRequest } from "@/lib/api-client";
import { canAccessReviewPortal, canEditEiaDocument, canReviewEiaDocument, hasAnyRole, hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type {
  EiaActivityItem,
  EiaDocumentAssignmentsOverview,
  EiaDocumentMember,
  EiaDocumentProgress,
  EiaSectionAssignment,
  EiaAttachment,
  EiaDocumentStructure,
  EiaSection,
  EiaSubSection,
  EiaSubSectionAssignment,
  User
} from "@/lib/types";

type EiaDocumentBuilderProps = {
  documentId: string;
  projectId: string;
  user: User;
};

const statusOptions = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "REVISION_REQUIRED", label: "Revision required" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETE", label: "Approved" }
];

const insightTabs = [
  { value: "progress", label: "Progress", icon: BarChart3, requireManage: false },
  { value: "team", label: "Team", icon: Users, requireManage: true },
  { value: "sources", label: "Sources", icon: FileSearch, requireManage: true },
  { value: "activity", label: "Activity", icon: MessageSquare, requireManage: false }
] as const;

type InsightTab = (typeof insightTabs)[number]["value"];
type WorkspaceView = "dashboard" | "overview" | "assigned" | "team" | "review_queue" | "approval" | "editor";

export function EiaDocumentBuilder({ documentId, projectId, user }: EiaDocumentBuilderProps) {
  const [document, setDocument] = useState<EiaDocumentStructure | null>(null);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string | null>(null);
  const [contentHtml, setContentHtml] = useState("<p></p>");
  const [contentJson, setContentJson] = useState<Record<string, unknown> | null>(null);
  const [editorContentSubsectionId, setEditorContentSubsectionId] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] = useState("NOT_STARTED");
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [progressSummary, setProgressSummary] = useState<EiaDocumentProgress | null>(null);
  const [assignmentOverview, setAssignmentOverview] = useState<EiaDocumentAssignmentsOverview | null>(null);
  const [members, setMembers] = useState<EiaDocumentMember[]>([]);
  const [activity, setActivity] = useState<EiaActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeInsight, setActiveInsight] = useState<InsightTab>("progress");
  const [showWorkspaceTools, setShowWorkspaceTools] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("overview");
  const [autoOpenAi, setAutoOpenAi] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"json" | "docx" | "pdf" | null>(null);
  const currentMemberRole = members.find((member) => member.user_id === user.id)?.role ?? null;
  const canManageMembers = hasAnyRole(user, ["owner", "admin"]);
  const isWorkflowManager = hasAnyRole(user, ["owner", "admin", "project_manager"]);
  const canManageAssignments = isWorkflowManager;
  const effectiveDocumentRole = currentMemberRole ?? (canManageAssignments || hasPermission(user, PERMISSIONS.TENANT_MANAGE) ? "EDITOR" : null);
  const canEdit = canEditEiaDocument(effectiveDocumentRole);
  const canReview = canAccessReviewPortal(user) && (
    canReviewEiaDocument(effectiveDocumentRole) || canManageAssignments
  );

  const visibleDocument = useMemo(() => {
    if (!document || canManageAssignments) {
      return document;
    }

    const assignedSubsectionIds = new Set(
      (assignmentOverview?.my_assigned_work ?? []).map((item) => item.subsection.subsection_id)
    );
    return {
      ...document,
      sections: document.sections
        .map((section) => ({
          ...section,
          subsections: section.subsections.filter((subsection) => assignedSubsectionIds.has(subsection.id))
        }))
        .filter((section) => section.subsections.length > 0)
    };
  }, [assignmentOverview, canManageAssignments, document]);

  const visibleAssignments = useMemo(() => {
    if (!assignmentOverview || canManageAssignments) {
      return assignmentOverview;
    }
    const assignedSubsectionIds = new Set(
      assignmentOverview.my_assigned_work.map((item) => item.subsection.subsection_id)
    );
    return {
      ...assignmentOverview,
      sections: assignmentOverview.sections
        .map((section) => ({
          ...section,
          subsections: section.subsections.filter((subsection) => assignedSubsectionIds.has(subsection.subsection_id))
        }))
        .filter((section) => section.subsections.length > 0)
    };
  }, [assignmentOverview, canManageAssignments]);

  const selectedSubsection = useMemo(() => {
    return visibleDocument?.sections.flatMap((section) => section.subsections).find(
      (subsection) => subsection.id === selectedSubsectionId
    ) ?? null;
  }, [selectedSubsectionId, visibleDocument]);

  const selectedSection = useMemo(() => {
    return visibleDocument?.sections.find((section) =>
      section.subsections.some((subsection) => subsection.id === selectedSubsectionId)
    ) ?? null;
  }, [selectedSubsectionId, visibleDocument]);

  const orderedSubsections = useMemo(
    () => visibleDocument?.sections.flatMap((section) => section.subsections) ?? [],
    [visibleDocument]
  );
  const selectedSubsectionIndex = orderedSubsections.findIndex((item) => item.id === selectedSubsectionId);
  const previousSubsection = selectedSubsectionIndex > 0 ? orderedSubsections[selectedSubsectionIndex - 1] : null;
  const nextSubsection = selectedSubsectionIndex >= 0 ? orderedSubsections[selectedSubsectionIndex + 1] ?? null : null;

  const progress = useMemo(() => {
    const subsections = visibleDocument?.sections.flatMap((section) => section.subsections) ?? [];
    if (progressSummary && canManageAssignments) {
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
      complete: subsections.filter((subsection) => ["APPROVED", "COMPLETE"].includes(subsection.completion_status)).length
    };
  }, [canManageAssignments, progressSummary, visibleDocument]);

  const sectionAssignmentsById = useMemo(
    () => new Map((visibleAssignments?.sections ?? []).map((section) => [section.section_id, section])),
    [visibleAssignments]
  );

  const subsectionAssignmentsById = useMemo(() => {
    const map = new Map<string, EiaSubSectionAssignment>();
    for (const section of visibleAssignments?.sections ?? []) {
      for (const subsection of section.subsections) {
        map.set(subsection.subsection_id, subsection);
      }
    }
    return map;
  }, [visibleAssignments]);

  const selectedSubsectionAssignment = selectedSubsectionId
    ? subsectionAssignmentsById.get(selectedSubsectionId) ?? null
    : null;
  const isAssignedAuthor = isWorkflowManager || selectedSubsectionAssignment?.author_assignee?.id === user.id;
  const canAuthorContent = canEdit && isAssignedAuthor && (isWorkflowManager || completionStatus === "IN_PROGRESS") && !saveConflict;
  const myAssignedCount = assignmentOverview?.my_assigned_work.length ?? 0;

  const refreshActivity = useCallback(async () => {
    setActivity(await apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`));
  }, [documentId]);

  const refreshMembers = useCallback(async () => {
    const nextMembers = await apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`);
    setMembers(nextMembers);
    await refreshActivity();
  }, [documentId, refreshActivity]);

  const refreshDashboardData = useCallback(async () => {
    const [nextProgress, nextMembers, nextActivity, nextAssignments] = await Promise.all([
      apiRequest<EiaDocumentProgress>(`/eia-documents/${documentId}/progress`),
      apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`),
      apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`),
      apiRequest<EiaDocumentAssignmentsOverview>(`/eia-documents/${documentId}/assignments`)
    ]);
    setProgressSummary(nextProgress);
    setMembers(nextMembers);
    setActivity(nextActivity);
    setAssignmentOverview(nextAssignments);
  }, [documentId]);

  const uploadEditorImage = useCallback(async (file: File): Promise<string> => {
    if (!selectedSubsectionId) {
      throw new Error("No subsection selected");
    }
    const body = new FormData();
    body.append("file", file);
    body.append("tenant_id", user.tenant_id);
    body.append("attachment_type", "editor_image");
    const attachment = await apiRequest<EiaAttachment>(
      `/eia-documents/subsections/${selectedSubsectionId}/attachments`,
      { method: "POST", body }
    );
    return attachment.storage_path;
  }, [selectedSubsectionId, user.tenant_id]);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, nextProgress, nextMembers, nextActivity, nextAssignments] = await Promise.all([
        apiRequest<EiaDocumentStructure>(`/eia-documents/${documentId}`),
        apiRequest<EiaDocumentProgress>(`/eia-documents/${documentId}/progress`),
        apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`),
        apiRequest<EiaActivityItem[]>(`/eia-documents/${documentId}/activity`),
        apiRequest<EiaDocumentAssignmentsOverview>(`/eia-documents/${documentId}/assignments`)
      ]);
      setDocument(data);
      setProgressSummary(nextProgress);
      setMembers(nextMembers);
      setActivity(nextActivity);
      setAssignmentOverview(nextAssignments);
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
    if (loading || canManageAssignments) {
      return;
    }
    const firstVisibleSubsection = visibleDocument?.sections[0]?.subsections[0] ?? null;
    const selectionIsVisible = visibleDocument?.sections.some((section) =>
      section.subsections.some((subsection) => subsection.id === selectedSubsectionId)
    );
    if (!selectionIsVisible) {
      setSelectedSubsectionId(firstVisibleSubsection?.id ?? null);
    }
  }, [canManageAssignments, loading, selectedSubsectionId, visibleDocument]);

  useEffect(() => {
    const syncViewFromHash = () => {
      if (window.location.hash.startsWith("#subsection-")) {
        const raw = window.location.hash.slice("#subsection-".length);
        const [subsectionId, query] = raw.split("?");
        setSelectedSubsectionId(subsectionId);
        setWorkspaceView("editor");
        if (query?.includes("ai=1")) {
          setAutoOpenAi(true);
        }
        return;
      }
      const viewByHash: Record<string, WorkspaceView> = {
        "#structure": "overview",
        "#assignments": "assigned",
        "#team": "team",
        "#review-queue": "review_queue",
        "#approval": "approval",
      };
      const nextView = viewByHash[window.location.hash];
      if (nextView && (canReview || !["review_queue", "approval"].includes(nextView))) {
        setWorkspaceView(nextView);
      }
    };
    syncViewFromHash();
    window.addEventListener("hashchange", syncViewFromHash);
    return () => window.removeEventListener("hashchange", syncViewFromHash);
  }, [canReview]);

  useEffect(() => {
    if (!selectedSubsection) {
      setEditorContentSubsectionId(null);
      return;
    }
    setContentHtml(selectedSubsection.content_html || selectedSubsection.content || "<p></p>");
    setContentJson(selectedSubsection.content_json ?? null);
    setEditorContentSubsectionId(selectedSubsection.id);
    setCompletionStatus(selectedSubsection.completion_status);
    setProgressPercentage(selectedSubsection.progress_percentage);
    setSavedAt(null);
    setSaveConflict(false);
  // Only reset editor when switching subsections, not on every save update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubsectionId]);

  useEffect(() => {
    if (workspaceView !== "editor" || !selectedSubsection || saving) {
      return;
    }

    const checkCurrentVersion = async () => {
      try {
        const latest = await apiRequest<EiaSubSection>(
          `/eia-documents/${documentId}/subsections/${selectedSubsection.id}`
        );
        if (latest.updated_at === selectedSubsection.updated_at) {
          return;
        }
        const originalHtml = selectedSubsection.content_html || selectedSubsection.content || "<p></p>";
        const hasLocalChanges =
          contentHtml !== originalHtml ||
          progressPercentage !== selectedSubsection.progress_percentage;
        if (hasLocalChanges) {
          setSaveConflict(true);
          return;
        }
        setDocument((current) => replaceSubsection(current, latest));
      } catch {
        // A failed background check must not interrupt the current draft.
      }
    };

    const interval = window.setInterval(() => void checkCurrentVersion(), 15_000);
    return () => window.clearInterval(interval);
  }, [contentHtml, documentId, progressPercentage, saving, selectedSubsection, workspaceView]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubsection || !document) {
      return;
    }
    if (saveConflict) {
      setError("A newer version is available. Copy your draft or load the latest version before continuing.");
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
            content_html: contentHtml,
            content_json: contentJson,
            completion_status: completionStatus,
            progress_percentage: progressPercentage,
            expected_updated_at: selectedSubsection.updated_at
          })
        }
      );
      setDocument((current) => replaceSubsection(current, updated));
      setSavedAt(new Date().toLocaleTimeString());
      void refreshDashboardData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subsection could not be saved";
      if (err instanceof ApiError && err.status === 409 && message.toLowerCase().includes("another collaborator")) {
        setSaveConflict(true);
      }
      setError(
        message.toLowerCase().includes("updated by another collaborator")
          ? `${message} Your unsaved draft is still in the editor.`
          : message
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadLatestSelectedSubsection() {
    if (!selectedSubsection) {
      return;
    }
    setError(null);
    try {
      const latest = await apiRequest<EiaSubSection>(
        `/eia-documents/${documentId}/subsections/${selectedSubsection.id}`
      );
      setDocument((current) => replaceSubsection(current, latest));
      setContentHtml(latest.content_html || latest.content || "<p></p>");
      setContentJson(latest.content_json ?? null);
      setCompletionStatus(latest.completion_status);
      setProgressPercentage(latest.progress_percentage);
      setSaveConflict(false);
      setSavedAt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Latest subsection version could not be loaded");
    }
  }

  let saveStatusText = "Read-only access";
  if (canAuthorContent) {
    saveStatusText = savedAt ? `Saved at ${savedAt}` : "Changes are saved when you select Save draft";
  } else if (canEdit && !isAssignedAuthor) {
    saveStatusText = `Assigned to ${selectedSubsectionAssignment?.author_assignee?.full_name ?? "another specialist"}`;
  }

  async function downloadCompiledDocument(format: "json" | "docx" | "pdf") {
    setExportingFormat(format);
    setError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/eia-documents/${documentId}/export.${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`Compiled EIA export failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `enviroquant-eia-${documentId}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compiled EIA export failed");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <div className="grid gap-4">
      <header className="builder-panel px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={cn(statusBadgeClass(document?.status ?? "draft"))}>
                {document?.status ?? "draft"}
              </Badge>
              <span className="text-xs font-semibold text-[#72827b]">
                {progress.complete} of {progress.total} checklist items complete
              </span>
            </div>
            <h1 className="break-words text-2xl font-bold tracking-[-0.02em] text-[#18372c]">
              {document?.title ?? "Loading EIA document"}
            </h1>
          </div>
          <div className="grid w-full max-w-md gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b7d75]">Document team</span>
              <CollaboratorStack currentUserId={user.id} members={members} />
            </div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#52675e]">Document progress</span>
              <strong className="text-[#18372c]">{Math.round(progressSummary?.progress_percentage ?? 0)}%</strong>
            </div>
            <Progress value={progressSummary?.progress_percentage ?? 0} />
          </div>
        </div>
      </header>

      <EiaDelivery
        documentId={documentId}
        title={document?.title ?? "EIA report"}
        canEmail={hasAnyRole(user, ["owner", "admin", "project_manager", "consultant"])}
        initialSummaryHtml={(() => {
          const summary = document?.document_metadata?.ai_executive_summary;
          if (!summary || typeof summary !== "object" || !("html" in summary)) return null;
          return typeof summary.html === "string" ? summary.html : null;
        })()}
      />

      <nav id="eia-workflow" className="builder-panel p-3" aria-label="EIA workflow">
        <div className="flex flex-wrap items-center gap-2">
          <WorkflowLink active={workspaceView === "overview"} icon={<LayoutList />} label="Write sections" meta="Build your report" onClick={() => setWorkspaceView("overview")} />
          {canReview ? <WorkflowLink active={workspaceView === "review_queue"} icon={<FileSearch />} label="Review" meta="Check submitted work" onClick={() => setWorkspaceView("review_queue")} /> : null}
          <WorkflowAnchor href={`/projects/${projectId}/documents`} icon={<FolderOpen />} label="Evidence" meta="Upload supporting files" />
          <Button className="sm:ml-auto" type="button" variant={workspaceView === "editor" ? "default" : "secondary"} onClick={() => setWorkspaceView("editor")}><PenLine />Open editor</Button>
        </div>
        <details className="mt-3 border-t border-[#e3eae6] pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#52675e]">Progress, assignments and team</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <WorkflowLink active={workspaceView === "dashboard"} icon={<Gauge />} label="Progress" meta={`${Math.round(progressSummary?.progress_percentage ?? 0)}% complete`} onClick={() => setWorkspaceView("dashboard")} />
            <WorkflowLink active={workspaceView === "assigned"} icon={<Users />} label="Assignments" meta={`${myAssignedCount} assigned to you`} onClick={() => setWorkspaceView("assigned")} />
            {canManageMembers ? <WorkflowLink active={workspaceView === "team"} icon={<UserPlus />} label="Manage team" meta={`${members.length} members`} onClick={() => setWorkspaceView("team")} /> : null}
            {canReview ? <WorkflowLink active={workspaceView === "approval"} icon={<FileCheck2 />} label="Approvals" meta="Section decisions" onClick={() => setWorkspaceView("approval")} /> : null}
          </div>
        </details>
      </nav>

      {error && !saveConflict ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
      {saveConflict ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="flex items-center gap-2"><ShieldCheck className="size-4" /> Editing paused to protect newer work</strong>
              <p className="mt-1 text-xs">Another collaborator saved this subsection after you opened it. Your local draft is preserved and has not overwritten their changes.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(contentHtml)}>
                <Copy /> Copy my draft
              </Button>
              <Button type="button" size="sm" onClick={() => void loadLatestSelectedSubsection()}>
                <RefreshCcw /> Load latest
              </Button>
            </div>
          </div>
        </Alert>
      ) : null}

      {workspaceView === "editor" && selectedSubsection ? (
        <SectionSuggestions
          key={selectedSubsection.section_id}
          documentId={documentId}
          sectionId={selectedSubsection.section_id}
          autoOpen={autoOpenAi}
          onInsertDraft={(subsectionId, html) => {
            setSelectedSubsectionId(subsectionId);
            setContentHtml(html);
            setContentJson(null);
            // Inserting a draft means work has started — allow saving immediately
            if (completionStatus === "NOT_STARTED" || completionStatus === "ASSIGNED") {
              setCompletionStatus("IN_PROGRESS");
            }
          }}
        />
      ) : null}

      {workspaceView === "dashboard" ? (
        <EiaManagementDashboard
          assignments={visibleAssignments}
          document={visibleDocument}
          loading={loading}
          progress={progressSummary}
          onOpenSubsection={(subsectionId) => {
            setSelectedSubsectionId(subsectionId);
            setWorkspaceView("editor");
            void loadDocument();
          }}
        />
      ) : null}

      {workspaceView === "overview" ? (
        <EiaStructureOverview
          assignments={visibleAssignments}
          document={visibleDocument}
          loading={loading}
          onOpenSubsection={(subsectionId) => {
            setSelectedSubsectionId(subsectionId);
            setWorkspaceView("editor");
          }}
        />
      ) : null}

      {workspaceView === "assigned" ? (
        <EiaAssignmentWorkflow
          assignments={visibleAssignments}
          canManageAssignments={canManageAssignments}
          currentUserId={user.id}
          documentId={documentId}
          loading={loading}
          members={members}
          onAssignmentsChange={(next) => {
            setAssignmentOverview(next);
            void loadDocument();
          }}
          onOpenSubsection={(subsectionId) => {
            setSelectedSubsectionId(subsectionId);
            setWorkspaceView("editor");
            void loadDocument();
          }}
        />
      ) : null}

      {workspaceView === "team" ? (
        <EiaTeamPanel
          canManage={canManageMembers}
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

      {workspaceView === "review_queue" && canReview ? (
        <EiaReviewQueue
          documentId={documentId}
          onOpenSubsection={(subsectionId) => {
            setSelectedSubsectionId(subsectionId);
            setWorkspaceView("editor");
            void loadDocument();
          }}
        />
      ) : null}

      {workspaceView === "approval" && canReview ? (
        <EiaReviewQueue
          documentId={documentId}
          mode="approval"
          onOpenSubsection={(subsectionId) => {
            setSelectedSubsectionId(subsectionId);
            setWorkspaceView("editor");
            void loadDocument();
          }}
        />
      ) : null}

      {workspaceView === "editor" ? (
      <section className="grid min-h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="builder-panel self-start overflow-hidden lg:sticky lg:top-20">
          <div className="border-b border-[#e3eae6] px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-bold text-[#18372c]">
                <BookOpenCheck className="size-4 text-[#287451]" />
                EIA sections
              </span>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{progress.complete}/{progress.total}</Badge>
            </div>
          </div>

          <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-2 scrollbar-thin">
            {loading ? <Alert>Loading checklist...</Alert> : null}
            {!loading && !visibleDocument?.sections.length ? (
              <Alert>You do not have any assigned EIA sections yet.</Alert>
            ) : null}
            {visibleDocument?.sections.map((section) => (
              <div key={section.id}>
                {(() => {
                  const sectionAssignment = sectionAssignmentsById.get(section.id);
                  const sectionActive = selectedSection?.id === section.id;
                  return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all",
                    sectionActive
                      ? "bg-[#eaf5ef] text-[#1f6848] shadow-sm ring-1 ring-[#287451]/10"
                      : "text-[#52675e] hover:bg-[#f2f7f4]"
                  )}
                  onClick={() => setSelectedSubsectionId(section.subsections[0]?.id ?? null)}
                  type="button"
                >
                  <span className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md border text-xs font-bold transition-colors",
                    sectionActive
                      ? "border-[#287451]/20 bg-[#287451] text-white"
                      : "border-[#cfe0d7] bg-white text-[#287451]"
                  )}>
                    {section.section_number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 leading-5">{formatSectionTitle(section.title)}</span>
                    <AssigneeChip
                      assignee={sectionAssignment?.current_assignee ?? null}
                      className="mt-1.5"
                      role={sectionAssignment?.current_role ?? "UNASSIGNED"}
                    />
                  </span>
                </button>
                  );
                })()}
                {selectedSection?.id === section.id ? (
                  <div className="mb-2 ml-5 mt-1 grid gap-0.5 border-l-2 border-[#287451]/15 pl-3">
                  {section.subsections.map((subsection) => {
                    const active = selectedSubsectionId === subsection.id;
                    const StatusIcon = iconForCompletionStatus(subsection.completion_status);
                    return (
                      <button
                        className={cn(
                          "flex items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all",
                          active
                            ? "eia-section-menu-active bg-[#287451] shadow-md hover:bg-[#287451]"
                            : "text-[#697a73] hover:bg-[#f4f7f5]"
                        )}
                        key={subsection.id}
                        onClick={() => setSelectedSubsectionId(subsection.id)}
                        type="button"
                      >
                        <StatusIcon className={cn("mt-0.5 size-3.5 shrink-0", active ? "text-white/80" : statusIconClass(subsection.completion_status))} />
                        <span className="min-w-0">
                          <span className={cn("block font-bold", active ? "text-white" : "text-[#52675e]")}>{subsection.subsection_number}</span>
                          <span className="mt-0.5 line-clamp-2 block leading-4">{subsection.title}</span>
                          <AssigneeChip
                            assignee={subsectionAssignmentsById.get(subsection.id)?.current_assignee ?? null}
                            className="mt-1"
                            inverse={active}
                            role={subsectionAssignmentsById.get(subsection.id)?.current_role ?? "UNASSIGNED"}
                          />
                        </span>
                      </button>
                    );
                  })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 content-start gap-4">
        <form className="builder-panel min-w-0 self-start overflow-hidden" onSubmit={submit}>
          <div className="border-b border-[#e3eae6] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf5ef] px-2.5 py-1 text-xs font-bold text-[#287451]">
                {selectedSection ? `Section ${selectedSection.section_number}` : "Section"}
              </span>
              <Badge className={cn(statusBadgeClass(completionStatus))}>{statusLabel(completionStatus)}</Badge>
            </div>
            <h2 className="mt-3 text-lg font-bold leading-snug text-[#18372c] sm:text-xl">
              {selectedSubsection?.subsection_number ? `${selectedSubsection.subsection_number}. ` : ""}
              {selectedSubsection?.title ?? "Select a subsection"}
            </h2>
            {!isAssignedAuthor && !isWorkflowManager ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                <ShieldCheck className="size-3.5 shrink-0" />
                Read-only: this subsection is assigned to another specialist.
              </div>
            ) : null}
            <div className="mt-3">
              <EiaWorkflowStepper status={completionStatus} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ResponsibilityCard
                assignee={selectedSubsectionAssignment?.current_assignee ?? null}
                role={selectedSubsectionAssignment?.current_role ?? "UNASSIGNED"}
              />
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <Button
                  className="h-9 text-xs"
                  type="button"
                  variant="secondary"
                  onClick={() => setShowWorkspaceTools((current) => !current)}
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span className="hidden sm:inline">{showWorkspaceTools ? "Hide tools" : "Workspace tools"}</span>
                  <span className="sm:hidden">Tools</span>
                </Button>
                {selectedSubsection ? (
                  <Button className="h-9 text-xs" asChild variant="secondary">
                    <Link href={`/projects/${projectId}/eia/${documentId}/subsection/${selectedSubsection.id}`}>
                      <ExternalLink className="size-3.5" />
                      <span className="hidden sm:inline">Open subsection</span>
                      <span className="sm:hidden">Open</span>
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-b border-[#e3eae6] bg-[#f8faf9] px-4 py-3 sm:grid-cols-[auto_auto_1fr] sm:items-end sm:gap-4 sm:px-5">
            {canEdit || canReview ? (
              <>
                <div className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                  <span>Controlled status</span>
                  <div className="rounded-lg border border-[#dce6e1] bg-white px-3 py-2 text-sm font-semibold text-[#29483c]">
                    {statusLabel(completionStatus)}
                  </div>
                </div>
                {canAuthorContent ? (
                  <label className="grid w-full gap-1.5 text-xs font-semibold text-[#52675e] sm:w-36">
                    Progress
                    <NumberStepper
                      max={100}
                      min={0}
                      value={progressPercentage}
                      onChange={setProgressPercentage}
                    />
                  </label>
                ) : (
                  <div className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                    <span>Progress</span>
                    <div className="rounded-lg border border-[#dce6e1] bg-white px-3 py-2 text-sm font-semibold text-[#29483c]">
                      {progressPercentage}%
                    </div>
                  </div>
                )}
                {selectedSubsection ? (
                  <div className="sm:ml-auto">
                    <EiaWorkflowActions
                      canAuthor={isAssignedAuthor}
                      canReview={canReview}
                      status={completionStatus}
                      subsectionId={selectedSubsection.id}
                      onTransition={(updated) => {
                        setDocument((current) => replaceSubsection(current, updated));
                        setCompletionStatus(updated.completion_status);
                        setProgressPercentage(updated.progress_percentage);
                        void refreshDashboardData();
                      }}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                  <span>Completion status</span>
                  <div className="rounded-lg border border-[#dce6e1] bg-white px-3 py-2 text-sm font-semibold text-[#29483c]">
                    {statusLabel(completionStatus)}
                  </div>
                </div>
                <div className="grid gap-1.5 text-xs font-semibold text-[#52675e]">
                  <span>Progress</span>
                  <div className="rounded-lg border border-[#dce6e1] bg-white px-3 py-2 text-sm font-semibold text-[#29483c]">
                    {progressPercentage}%
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#344f44]">Assessment response</span>
              <span className="text-[11px] font-medium text-[#8a9a93]">{saveStatusText}</span>
            </div>
            {selectedSubsection && editorContentSubsectionId === selectedSubsection.id ? (
              <TipTapEditor
                key={`${selectedSubsection.id}:${selectedSubsection.updated_at}`}
                content={contentHtml}
                editable={canAuthorContent}
                onChange={({ html, json }) => {
                  setContentHtml(html);
                  setContentJson(json);
                }}
                onImageUpload={canAuthorContent ? uploadEditorImage : undefined}
              />
            ) : selectedSubsection ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-[#cfdcd6] bg-white text-sm font-medium text-[#60736a]">
                Loading subsection response…
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-[#cfdcd6] bg-white text-sm text-[#8a9a93]">
                Select a subsection to start editing
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e3eae6] bg-[#f8faf9] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <Button
              className="h-9 w-full text-xs sm:w-auto"
              disabled={!previousSubsection}
              type="button"
              variant="secondary"
              onClick={() => previousSubsection && setSelectedSubsectionId(previousSubsection.id)}
            >
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <div className="flex gap-2">
              {canAuthorContent ? (
                <Button className="h-9 flex-1 text-xs sm:flex-none" type="submit" disabled={!selectedSubsection || saving}>
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save draft
                </Button>
              ) : null}
              <Button
                className="h-9 text-xs"
                type="button"
                variant="secondary"
                disabled={exportingFormat !== null}
                onClick={() => void downloadCompiledDocument("pdf")}
              >
                {exportingFormat === "pdf" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button
                className="h-9 flex-1 text-xs sm:flex-none"
                disabled={!nextSubsection}
                type="button"
                onClick={() => nextSubsection && setSelectedSubsectionId(nextSubsection.id)}
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </form>

        {showWorkspaceTools ? (
          <section className="builder-panel overflow-hidden">
              <div className="border-b border-[#e3eae6] px-4 py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#18372c]">Workspace tools</h3>
                    <p className="mt-0.5 text-xs text-[#74847d]">Progress tracking and activity feed.</p>
                  </div>
                <div className="flex flex-wrap gap-1 rounded-lg bg-[#f2f6f4] p-1">
                  {insightTabs.filter((tab) => !tab.requireManage || canManageMembers).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        className={cn(
                          "flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all",
                          activeInsight === tab.value
                            ? "bg-white text-[#236c4a] shadow-sm ring-1 ring-[#236c4a]/10"
                            : "text-[#66776f] hover:bg-white/60"
                        )}
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveInsight(tab.value)}
                      >
                        <Icon className="size-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
            <div className="p-4">
            {activeInsight === "progress" ? <EiaProgressOverview progress={progressSummary} /> : null}
            {activeInsight === "team" && canManageMembers ? (
              <EiaTeamPanel
                canManage={canManageMembers}
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
            {activeInsight === "sources" && canManageMembers ? (
              <EiaSourceMappingPanel
                canManage={canEdit}
                documentId={documentId}
                projectId={projectId}
                subsectionVersions={Object.fromEntries(
                  (document?.sections ?? []).flatMap((section) =>
                    section.subsections.map((subsection) => [subsection.id, subsection.updated_at])
                  )
                )}
                onApplied={loadDocument}
              />
            ) : null}
            {activeInsight === "activity" ? <EiaActivityFeed activity={activity} /> : null}
            </div>
          </section>
        ) : null}
        </div>
      </section>
      ) : null}
    </div>
  );
}

function EiaStructureOverview({
  assignments,
  document,
  loading,
  onOpenSubsection
}: Readonly<{
  assignments: EiaDocumentAssignmentsOverview | null;
  document: EiaDocumentStructure | null;
  loading: boolean;
  onOpenSubsection: (subsectionId: string) => void;
}>) {
  const sections = document?.sections ?? [];
  const subsections = sections.flatMap((section) => section.subsections);
  const completed = subsections.filter((item) => ["APPROVED", "COMPLETE"].includes(item.completion_status)).length;
  const inProgress = subsections.filter((item) => item.completion_status === "IN_PROGRESS").length;
  const ready = subsections.filter((item) => item.completion_status === "READY_FOR_REVIEW").length;
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const showAllSections = selectedSectionId === "__all__";
  const selectedSection = showAllSections
    ? null
    : sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const sectionAssignmentById = useMemo(
    () => new Map((assignments?.sections ?? []).map((section) => [section.section_id, section])),
    [assignments]
  );

  return (
    <section className="builder-panel overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-[#e3eae6] px-5 py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287451]">EIA overview</p>
          <h2 className="mt-1 text-xl font-bold text-[#18372c]">Write your EIA</h2>
          <p className="mt-1 text-sm text-[#697a73]">Choose a section, check what to add, then open a subsection to write. Your saved work becomes the Word report.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <OverviewCount label="Complete" value={completed} tone="green" />
          <OverviewCount label="In progress" value={inProgress} tone="blue" />
          <OverviewCount label="Ready for review" value={ready} tone="amber" />
          <OverviewCount label="Total" value={subsections.length} tone="slate" />
        </div>
      </header>

      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
        {loading ? <Alert>Loading complete EIA structure...</Alert> : null}
        {!loading && !sections.length ? <Alert>No EIA sections are available.</Alert> : null}

        {sections.length ? (
          <aside className="border-b border-[#dce6e1] bg-[#f7f9f8] p-2 lg:border-b-0 lg:border-r" aria-label="EIA sections">
            <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#809088]">Sections</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              <button
                aria-current={showAllSections ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-3 text-left text-xs font-bold transition-colors",
                  showAllSections ? "eia-section-menu-active bg-[#287451]" : "text-[#52675e] hover:bg-white",
                )}
                type="button"
                onClick={() => setSelectedSectionId("__all__")}
              >
                Complete structure
                <span className={cn("mt-1 block text-[10px] font-medium", showAllSections ? "opacity-75" : "text-[#7b8a83]")}>{sections.length} sections · {subsections.length} subsections</span>
              </button>
              {sections.map((section) => {
                const stats = sectionProgress(section);
                const active = selectedSection?.id === section.id;
                const assignment = sectionAssignmentById.get(section.id);
                return (
                  <button
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group rounded-lg px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#287451]/30 focus-visible:ring-offset-1",
                      active ? "eia-section-menu-active bg-[#287451] shadow-sm" : "text-[#52675e] hover:bg-white"
                    )}
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    type="button"
                  >
                    <span className="flex items-start gap-2.5">
                      <span className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-md border text-xs font-bold",
                        active ? "border-white/30 bg-white/10" : "border-[#cfe0d7] bg-white text-[#287451]"
                      )}>
                        {section.section_number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="line-clamp-2 block text-xs leading-4">{formatSectionTitle(section.title)}</strong>
                        <span className={cn("mt-1 block text-[10px]", active ? "opacity-75" : "text-[#7b8a83]")}>
                          {stats.complete}/{stats.total} complete · {stats.percentage}%
                        </span>
                        <span className={cn("mt-1 block text-[10px]", active ? "opacity-75" : "text-[#7b8a83]")}>
                          {assignment?.current_assignee?.full_name ?? "Unassigned"} ({statusLabel(assignment?.current_role ?? "UNASSIGNED")})
                        </span>
                      </span>
                    </span>
                    <span className={cn("mt-2 block h-1 overflow-hidden rounded-full", active ? "bg-white/20" : "bg-[#dce9e2]")}>
                      <span className={cn("block h-full rounded-full", active ? "eia-active-progress" : "bg-[#287451]")} style={{ width: `${stats.percentage}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        ) : null}

        {selectedSection ? (
          <div className="min-w-0"><div className="p-4"><SectionSuggestions key={selectedSection.id} documentId={document!.id} sectionId={selectedSection.id} /></div>
          <SectionDetailPanel
            assignment={sectionAssignmentById.get(selectedSection.id) ?? null}
            onOpenSubsection={onOpenSubsection}
            section={selectedSection}
          /></div>
        ) : null}
        {showAllSections && document ? (
          <AllSectionsPanel
            assignments={sectionAssignmentById}
            onOpenSubsection={onOpenSubsection}
            sections={sections}
            documentId={document!.id}
          />
        ) : null}
      </div>
    </section>
  );
}

function AllSectionsPanel({
  documentId,
  assignments,
  onOpenSubsection,
  sections,
}: Readonly<{
  documentId: string;
  assignments: Map<string, EiaSectionAssignment>;
  onOpenSubsection: (subsectionId: string) => void;
  sections: EiaSection[];
}>) {
  return (
    <div className="grid gap-3 bg-[#f8faf9] p-4 md:p-5">
      {sections.map((section) => {
        const stats = sectionProgress(section);
        const assignment = assignments.get(section.id);
        const subsectionAssignments = new Map(
          (assignment?.subsections ?? []).map((item) => [item.subsection_id, item]),
        );
        return (
          <article className="overflow-hidden rounded-xl border border-[#dce6e1] bg-white" key={section.id}>
            <header className="flex flex-col gap-3 border-b border-[#e7edea] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#287451]">Section {section.section_number}</p>
                <h3 className="mt-0.5 text-sm font-bold text-[#18372c]">{formatSectionTitle(section.title)}</h3>
                <p className="mt-1 text-xs text-[#6a7d74]">Responsible: {assignment?.current_assignee?.full_name ?? "Unassigned"}</p>
              </div>
              <div className="w-full sm:w-40">
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#6a7d74]"><span>{stats.complete}/{stats.total} approved</span><span>{stats.percentage}%</span></div>
                <Progress className="h-1.5" value={stats.percentage} />
              </div>
            </header>
            <div className="p-4"><SectionSuggestions documentId={documentId} sectionId={section.id} /></div>
            <div className="divide-y divide-[#edf1ef]">
              {section.subsections.map((subsection) => {
                const assignmentItem = subsectionAssignments.get(subsection.id);
                return (
                  <button
                    className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-[#f8faf9] sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center"
                    key={subsection.id}
                    type="button"
                    onClick={() => onOpenSubsection(subsection.id)}
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-xs text-[#287451]">{subsection.subsection_number}</strong>
                        <Badge className={statusBadgeClass(subsection.completion_status)}>{statusLabel(subsection.completion_status)}</Badge>
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium text-[#344f44]">{subsection.title}</span>
                      <span className="mt-1 block text-[11px] text-[#73827b]">{assignmentItem?.current_assignee?.full_name ?? "Unassigned"} · {assignmentItem?.unresolved_comment_count ?? 0} open comments</span>
                    </span>
                    <span>
                      <span className="mb-1 flex justify-between text-[10px] font-semibold text-[#73827b]"><span>Progress</span><span>{Math.round(subsection.progress_percentage)}%</span></span>
                      <Progress className="h-1.5" value={subsection.progress_percentage} />
                    </span>
                    <ChevronRight className="hidden size-4 text-[#9aaaa2] sm:block" />
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SectionDetailPanel({
  assignment,
  section,
  onOpenSubsection
}: Readonly<{
  assignment: EiaSectionAssignment | null;
  section: EiaSection;
  onOpenSubsection: (subsectionId: string) => void;
}>) {
  const stats = sectionProgress(section);
  const subsectionAssignmentById = useMemo(
    () => new Map((assignment?.subsections ?? []).map((subsection) => [subsection.subsection_id, subsection])),
    [assignment]
  );

  return (
    <article className="min-w-0 bg-white">
      <div className="border-b border-[#e3eae6] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="eia-section-menu-active grid size-10 shrink-0 place-items-center rounded-lg bg-[#287451] text-sm font-bold">
            {section.section_number}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287451]">Section {section.section_number}</p>
            <h3 className="mt-1 text-xl font-bold leading-6 text-[#18372c]">{formatSectionTitle(section.title)}</h3>
            <p className="mt-1 text-xs font-semibold text-[#5f7369]">
              Responsible now: {assignment?.current_assignee?.full_name ?? "Unassigned"} ({statusLabel(assignment?.current_role ?? "UNASSIGNED")})
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#697a73]">
              <span>{stats.complete} of {stats.total} subsections complete</span>
              <strong className="text-[#29483c]">{stats.percentage}%</strong>
            </div>
            <Progress className="mt-2 h-1.5" value={stats.percentage} />
          </div>
        </div>
      </div>

      <div className="border-b border-[#edf1ef] bg-[#f8faf9] px-5 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#29483c]">Subsections</h4>
            <p className="mt-0.5 text-xs text-[#74847d]">Select an item to open it in the focused authoring workspace.</p>
          </div>
          {section.subsections[0] ? (
            <Button size="sm" type="button" onClick={() => onOpenSubsection(section.subsections[0].id)}>
              {stats.percentage > 0 ? "Continue section" : "Begin section"} <ChevronRight />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-[#edf1ef]">
        {section.subsections.map((subsection) => {
          const assignmentItem = subsectionAssignmentById.get(subsection.id);
          return (
            <button
              className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#f6faf7] md:px-6"
              key={subsection.id}
              onClick={() => onOpenSubsection(subsection.id)}
              type="button"
            >
              <StatusDot status={subsection.completion_status} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#287451]">{subsection.subsection_number}</span>
                  <Badge className={statusBadgeClass(subsection.completion_status)}>{statusLabel(subsection.completion_status)}</Badge>
                </span>
                <span className="mt-1 block text-sm font-medium leading-5 text-[#52675e]">{subsection.title}</span>
                <span className="mt-1 block text-[11px] font-medium text-[#73827b]">
                  {assignmentItem?.current_assignee?.full_name ?? "Unassigned"} ({statusLabel(assignmentItem?.current_role ?? "UNASSIGNED")})
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#73827b]">
                  <span>Review: {statusLabel(assignmentItem?.review_status ?? "NOT_STARTED")}</span>
                  <span>{assignmentItem?.unresolved_comment_count ?? 0} open comments</span>
                  <span>Updated {formatDateTime(assignmentItem?.last_updated_at ?? subsection.updated_at)}</span>
                </span>
              </span>
              <span className="hidden w-28 shrink-0 sm:block">
                <span className="mb-1 flex justify-between text-[10px] font-semibold text-[#7b8a83]"><span>Progress</span><span>{Math.round(subsection.progress_percentage)}%</span></span>
                <Progress className="h-1.5" value={subsection.progress_percentage} />
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#9aaaa2] transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </article>
  );
}

function sectionProgress(section: EiaSection) {
  const total = section.subsections.length;
  const complete = section.subsections.filter((item) => ["APPROVED", "COMPLETE"].includes(item.completion_status)).length;
  const percentage = total
    ? Math.round(section.subsections.reduce((sum, item) => sum + item.progress_percentage, 0) / total)
    : 0;
  return { total, complete, percentage };
}

function WorkflowLink({ active, icon, label, meta, onClick }: Readonly<{ active: boolean; icon: ReactNode; label: string; meta: string; onClick: () => void }>) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
        active ? "bg-[#e8f3ed] text-[#236c4a]" : "text-[#61746b] hover:bg-[#f3f7f5]"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="[&_svg]:size-4">{icon}</span>
      <span><strong className="block text-xs">{label}</strong><span className="block text-[10px] opacity-70">{meta}</span></span>
    </button>
  );
}

function WorkflowAnchor({ href, icon, label, meta }: Readonly<{ href: string; icon: ReactNode; label: string; meta: string }>) {
  return (
    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#61746b] transition-colors hover:bg-[#f3f7f5]" href={href}>
      <span className="[&_svg]:size-4">{icon}</span>
      <span><strong className="block text-xs">{label}</strong><span className="block text-[10px] opacity-70">{meta}</span></span>
    </Link>
  );
}

function OverviewCount({ label, value, tone }: Readonly<{ label: string; value: number; tone: "green" | "blue" | "amber" | "slate" }>) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-[#c9dfd3] bg-[#edf6f1] text-[#287451]",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600"
  };
  return <span className={cn("rounded-full border px-2.5 py-1", tones[tone])}>{value} {label}</span>;
}

function StatusDot({ status }: Readonly<{ status: string }>) {
  let colorClass = "bg-slate-300";
  if (["APPROVED", "COMPLETE"].includes(status)) {
    colorClass = "bg-emerald-500";
  } else if (["READY_FOR_REVIEW", "UNDER_REVIEW"].includes(status)) {
    colorClass = "bg-amber-500";
  } else if (["IN_PROGRESS", "REVISION_REQUIRED"].includes(status)) {
    colorClass = "bg-[#287451]";
  }
  return <span className={cn("size-2.5 shrink-0 rounded-full", colorClass)} />;
}

function iconForCompletionStatus(status: string) {
  if (["APPROVED", "COMPLETE"].includes(status)) {
    return CheckCircle2;
  }
  if (["IN_PROGRESS", "READY_FOR_REVIEW", "UNDER_REVIEW", "REVISION_REQUIRED"].includes(status)) {
    return CircleDashed;
  }
  return Clock3;
}

function statusIconClass(status: string) {
  if (["APPROVED", "COMPLETE"].includes(status)) {
    return "text-emerald-600";
  }
  if (["READY_FOR_REVIEW", "UNDER_REVIEW"].includes(status)) {
    return "text-amber-600";
  }
  if (["IN_PROGRESS", "REVISION_REQUIRED"].includes(status)) {
    return "text-[#287451]";
  }
  return "text-[#9aa8a1]";
}

function formatSectionTitle(title: string) {
  if (title !== title.toUpperCase()) {
    return title;
  }
  const normalized = title.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? status.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "not available";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "not available" : parsed.toLocaleString();
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETE" || normalized === "PUBLISHED" || normalized === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "CHANGES_REQUESTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized === "READY_FOR_REVIEW" || normalized === "IN_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "IN_PROGRESS" || normalized === "DRAFT") {
    return "border-slate-200 bg-slate-100 text-slate-600";
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
