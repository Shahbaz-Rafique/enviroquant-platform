"use client";

import { ArrowLeft, ArrowRight, Bot, CheckCircle2, FileText, Loader2, RefreshCcw, Save, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { TipTapEditor, type TipTapEditorHandle } from "@/components/Editor/TipTapEditor";
import { AttachmentsPanel } from "@/components/Sidebar/AttachmentsPanel";
import { ChecklistPanel } from "@/components/Sidebar/ChecklistPanel";
import { CommentsPanel } from "@/components/Workspace/CommentsPanel";
import { RevisionPanel } from "@/components/Workspace/RevisionPanel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import {
  canCommentOnEiaDocument,
  canEditEiaDocument,
  canReviewEiaDocument,
  hasPermission,
  PERMISSIONS
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type {
  EiaAttachment,
  EiaAuthoringAssistResponse,
  EiaChecklistItem,
  EiaDocumentMember,
  EiaSourceMapping,
  EiaSubSectionWorkspace as EiaSubSectionWorkspaceType,
  User
} from "@/lib/types";

type SubsectionWorkspaceProps = {
  documentId: string;
  projectId: string;
  subsectionId: string;
  user: User;
};

type EditorContent = {
  html: string;
  json: Record<string, unknown>;
};

type SaveOptions = {
  completionStatus?: string;
  progressPercentage?: number;
};

const emptyEditorContent: EditorContent = {
  html: "<p></p>",
  json: {
    type: "doc",
    content: [{ type: "paragraph" }]
  }
};

const statusOptions = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "COMPLETE", label: "Complete" }
];

export function SubsectionWorkspace({ documentId, projectId, subsectionId, user }: SubsectionWorkspaceProps) {
  const router = useRouter();
  const editorRegionRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<TipTapEditorHandle | null>(null);
  const [workspace, setWorkspace] = useState<EiaSubSectionWorkspaceType | null>(null);
  const [editorContent, setEditorContent] = useState<EditorContent>(emptyEditorContent);
  const [completionStatus, setCompletionStatus] = useState("NOT_STARTED");
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [documentRole, setDocumentRole] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantActionId, setAssistantActionId] = useState<string | null>(null);
  const [assistantSummary, setAssistantSummary] = useState<string | null>(null);
  const [assistantGuidance, setAssistantGuidance] = useState<string[]>([]);
  const [assistantEngine, setAssistantEngine] = useState<string | null>(null);
  const [sourceMappings, setSourceMappings] = useState<EiaSourceMapping[]>([]);

  const effectiveDocumentRole = documentRole ?? (hasPermission(user, PERMISSIONS.TENANT_MANAGE) ? "EDITOR" : null);
  const canEdit = canEditEiaDocument(effectiveDocumentRole);
  const canUpload = canEdit;
  const canComment = canCommentOnEiaDocument(effectiveDocumentRole);
  const canResolve = canReviewEiaDocument(effectiveDocumentRole);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<EiaSubSectionWorkspaceType>(
        `/eia-documents/subsections/${subsectionId}?tenant_id=${encodeURIComponent(user.tenant_id)}`
      );
      if (data.project_id !== projectId || data.eia_document_id !== documentId) {
        throw new Error("Subsection does not belong to this project EIA document");
      }
      setWorkspace(data);
      setEditorContent({
        html: data.subsection.content_html || data.subsection.content || "<p></p>",
        json: data.subsection.content_json ?? emptyEditorContent.json
      });
      setCompletionStatus(data.subsection.completion_status);
      setProgressPercentage(data.subsection.progress_percentage);
      setDirty(false);
      setSaveState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subsection workspace could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [documentId, projectId, subsectionId, user.tenant_id]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const loadDocumentRole = useCallback(async () => {
    try {
      const members = await apiRequest<EiaDocumentMember[]>(`/eia-documents/${documentId}/members`);
      setDocumentRole(members.find((member) => member.user_id === user.id)?.role ?? null);
    } catch {
      setDocumentRole(null);
    }
  }, [documentId, user.id]);

  useEffect(() => {
    loadDocumentRole();
  }, [loadDocumentRole]);

  const loadAssistantContext = useCallback(async () => {
    setAssistantLoading(true);
    setAssistantError(null);
    try {
      const mappings = await apiRequest<EiaSourceMapping[]>(`/eia-documents/${documentId}/source-mappings`);
      setSourceMappings(
        mappings
          .filter((mapping) => mapping.subsection_id === subsectionId && mapping.status !== "REJECTED")
          .sort((left, right) => right.confidence_score - left.confidence_score)
      );
    } catch (err) {
      setAssistantError(err instanceof Error ? err.message : "Assistant context could not be loaded");
    } finally {
      setAssistantLoading(false);
    }
  }, [documentId, subsectionId]);

  useEffect(() => {
    void loadAssistantContext();
  }, [loadAssistantContext]);

  const saveContent = useCallback(
    async (options: SaveOptions = {}) => {
      if (!workspace || !canEdit) {
        return;
      }

      const nextStatus = options.completionStatus ?? completionStatus;
      const nextProgress = options.progressPercentage ?? progressPercentage;

      setSaving(true);
      setError(null);
      setCompletionStatus(nextStatus);
      setProgressPercentage(nextProgress);

      try {
        const updated = await apiRequest<EiaSubSectionWorkspaceType>(
          `/eia-documents/subsections/${subsectionId}/content`,
          {
            method: "PUT",
            body: JSON.stringify({
              tenant_id: user.tenant_id,
              content_html: editorContent.html,
              content_json: editorContent.json,
              completion_status: nextStatus,
              progress_percentage: nextProgress,
              expected_updated_at: workspace.subsection.updated_at
            })
          }
        );
        setWorkspace(updated);
        setCompletionStatus(updated.subsection.completion_status);
        setProgressPercentage(updated.subsection.progress_percentage);
        setLastSavedAt(new Date().toLocaleTimeString());
        setDirty(false);
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        const message = err instanceof Error ? err.message : "Subsection content could not be saved";
        setError(
          message.toLowerCase().includes("updated by another collaborator")
            ? `${message} Your local draft has been preserved in this editor.`
            : message
        );
      } finally {
        setSaving(false);
      }
    },
    [
      canEdit,
      completionStatus,
      editorContent.html,
      editorContent.json,
      progressPercentage,
      subsectionId,
      user.tenant_id,
      workspace
    ]
  );

  useEffect(() => {
    if (!dirty || !canEdit || saving || saveState === "error") {
      return;
    }
    const autosave = window.setTimeout(() => {
      void saveContent();
    }, 4000);
    return () => window.clearTimeout(autosave);
  }, [canEdit, dirty, saveContent, saveState, saving]);

  const saveStatusText = useMemo(() => {
    if (saving) {
      return "Saving...";
    }
    if (saveState === "error") {
      return "Save failed";
    }
    if (dirty) {
      return "Unsaved changes";
    }
    return lastSavedAt ? `Saved at ${lastSavedAt}` : "Loaded";
  }, [dirty, lastSavedAt, saveState, saving]);

  function updateEditorContent(payload: EditorContent) {
    setEditorContent(payload);
    setDirty(true);
    setSaveState("idle");
  }

  function updateCompletionStatus(value: string) {
    setCompletionStatus(value);
    setDirty(true);
    setSaveState("idle");
  }

  function updateProgressPercentage(value: number) {
    setProgressPercentage(value);
    setDirty(true);
    setSaveState("idle");
  }

  function applyWorkspaceUpdate(updated: EiaSubSectionWorkspaceType) {
    setWorkspace(updated);
    setEditorContent({
      html: updated.subsection.content_html || updated.subsection.content || "<p></p>",
      json: updated.subsection.content_json ?? emptyEditorContent.json
    });
    setCompletionStatus(updated.subsection.completion_status);
    setProgressPercentage(updated.subsection.progress_percentage);
    setDirty(false);
    setSaveState("saved");
    setLastSavedAt(new Date().toLocaleTimeString());
  }

  const assistantChecklistItems = useMemo(
    () =>
      [...(workspace?.checklist_items ?? [])].sort(
        (left, right) => importanceRank(right.importance) - importanceRank(left.importance)
      ),
    [workspace?.checklist_items]
  );

  const coverageGaps = useMemo(
    () => assistantChecklistItems.filter((item) => item.compliance_status !== "Compliant"),
    [assistantChecklistItems]
  );

  const hasDraftContent = useMemo(() => hasMeaningfulHtml(editorContent.html), [editorContent.html]);

  const activeChecklistIndex = workspace?.checklist_items.findIndex((item) => item.subsection_id === subsectionId) ?? -1;
  const previousChecklistItem = activeChecklistIndex > 0 ? workspace?.checklist_items[activeChecklistIndex - 1] ?? null : null;
  const nextChecklistItem = activeChecklistIndex >= 0 ? workspace?.checklist_items[activeChecklistIndex + 1] ?? null : null;

  const uploadAttachment = useCallback(
    async (file: File, attachmentType = "supporting_evidence"): Promise<EiaAttachment> => {
      if (!workspace) {
        throw new Error("Subsection workspace is not loaded");
      }
      const body = new FormData();
      body.append("file", file);
      body.append("tenant_id", user.tenant_id);
      body.append("attachment_type", attachmentType);
      body.append("checklist_reference", workspace.subsection.subsection_number);

      setUploadingAttachment(true);
      setAttachmentError(null);
      try {
        const attachment = await apiRequest<EiaAttachment>(
          `/eia-documents/subsections/${subsectionId}/attachments`,
          {
            method: "POST",
            body
          }
        );
        setWorkspace((current) =>
          current
            ? {
                ...current,
                attachments: [attachment, ...current.attachments]
              }
            : current
        );
        return attachment;
      } finally {
        setUploadingAttachment(false);
      }
    },
    [subsectionId, user.tenant_id, workspace]
  );

  const uploadPanelAttachment = useCallback(
    async (file: File) => {
      try {
        await uploadAttachment(file);
      } catch (err) {
        setAttachmentError(err instanceof Error ? err.message : "Attachment upload failed");
      }
    },
    [uploadAttachment]
  );

  const uploadEditorImage = useCallback(
    async (file: File) => {
      const attachment = await uploadAttachment(file, "editor_image");
      return attachment.storage_path;
    },
    [uploadAttachment]
  );

  function addressChecklistItem(item: EiaChecklistItem) {
    if (item.subsection_id === subsectionId) {
      editorRegionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.push(`/projects/${projectId}/eia/${documentId}/subsection/${item.subsection_id}`);
  }

  function applyAssistantContent(nextHtml: string) {
    const normalized = nextHtml.trim() || "<p></p>";
    if (editorRef.current) {
      editorRef.current.setContent(normalized);
      return;
    }
    updateEditorContent({
      html: normalized,
      json: emptyEditorContent.json
    });
  }

  function mergeAssistantContent(action: string, generatedHtml: string) {
    if (action === "GENERATE_DRAFT" && !hasDraftContent) {
      applyAssistantContent(generatedHtml);
      return;
    }
    const nextHtml = hasDraftContent ? `${editorContent.html}${generatedHtml}` : generatedHtml;
    applyAssistantContent(nextHtml);
  }

  async function runAssistantAction(action: "OUTLINE" | "EVIDENCE_GAPS" | "GENERATE_DRAFT" | "IMPROVE_DRAFT") {
    if (!workspace || !canEdit) {
      return;
    }
    setAssistantActionId(action);
    setAssistantError(null);
    try {
      const response = await apiRequest<EiaAuthoringAssistResponse>(`/eia-documents/subsections/${subsectionId}/assistant`, {
        method: "POST",
        body: JSON.stringify({
          action,
          tenant_id: user.tenant_id
        })
      });
      mergeAssistantContent(action, response.generated_html);
      setAssistantSummary(response.summary);
      setAssistantGuidance(response.guidance_points);
      setAssistantEngine(`${response.engine} · ${response.model_version}`);
    } catch (err) {
      setAssistantError(err instanceof Error ? err.message : "Assistant guidance could not be generated");
    } finally {
      setAssistantActionId(null);
    }
  }

  async function applySuggestedDraft(mapping: EiaSourceMapping) {
    if (!canEdit) {
      return;
    }

    setAssistantActionId(mapping.id);
    setAssistantError(null);
    try {
      await apiRequest<EiaSourceMapping>(`/eia-documents/${documentId}/source-mappings/${mapping.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          apply_content: true,
          completion_status: completionStatus === "NOT_STARTED" ? "IN_PROGRESS" : completionStatus,
          progress_percentage: Math.max(progressPercentage, Math.round(mapping.confidence_score * 100), 50)
        })
      });
      await Promise.all([loadWorkspace(), loadAssistantContext()]);
    } catch (err) {
      setAssistantError(err instanceof Error ? err.message : "Suggested draft could not be applied");
    } finally {
      setAssistantActionId(null);
    }
  }

  if (loading) {
    return <Alert>Loading subsection workspace...</Alert>;
  }

  if (!workspace) {
    return <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error ?? "Workspace unavailable"}</Alert>;
  }

  const subsection = workspace.subsection;

  return (
    <div className="grid gap-5">
      {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

      <header className="builder-panel overflow-hidden">
        <div className="builder-section-title flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold uppercase text-[#B6F7FF]">
                Section {workspace.section_number} / {subsection.subsection_number}
              </span>
              <Badge className={cn(statusBadgeClass(completionStatus))}>{statusLabel(completionStatus)}</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-white">{subsection.title}</h1>
            <p className="mt-2 text-sm font-medium text-white/52">{workspace.eia_document_title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-32 text-sm font-semibold text-white/52">
              {canEdit ? saveStatusText : "Read-only access"}
            </span>
            {canEdit ? (
              <>
                <Button disabled={saving} type="button" variant="secondary" onClick={() => void saveContent()}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Save draft
                </Button>
                <Button
                  disabled={saving}
                  type="button"
                  onClick={() => void saveContent({ completionStatus: "COMPLETE", progressPercentage: 100 })}
                >
                  <CheckCircle2 />
                  Mark subsection complete
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2 border-t border-[#e3eae6] bg-[#f8faf9] px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-[#60736a]">
              <span>Subsection completion</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} />
          </div>
          <span className="text-xs font-semibold text-[#60736a]">{coverageGaps.length} checklist item{coverageGaps.length === 1 ? "" : "s"} need attention</span>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="grid gap-5" ref={editorRegionRef}>
          <div className="builder-panel overflow-hidden">
            <div className="grid gap-4 border-b border-white/10 p-4 lg:grid-cols-[minmax(0,1fr)_180px_170px]">
              {canEdit ? (
                <>
                  <label className="grid gap-2 text-sm font-semibold text-white/78">
                    Completion status
                    <Select value={completionStatus} onValueChange={updateCompletionStatus}>
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
                  <label className="grid gap-2 text-sm font-semibold text-white/78">
                    Progress
                    <NumberStepper
                      max={100}
                      min={0}
                      value={Math.round(progressPercentage)}
                      onChange={updateProgressPercentage}
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="grid gap-2 text-sm font-semibold text-white/78">
                    <span>Completion status</span>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white">
                      {statusLabel(completionStatus)}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm font-semibold text-white/78">
                    <span>Progress</span>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white">
                      {Math.round(progressPercentage)}%
                    </div>
                  </div>
                </>
              )}
              <div className="grid content-end">
                <div className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  {Math.round(progressPercentage)}% complete
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#18372c]">Add information</h2>
                <p className="mt-1 text-sm text-[#697a73]">Enter the subsection response and cite the evidence supporting each material statement.</p>
              </div>
              <TipTapEditor
                ref={editorRef}
                content={editorContent.html}
                editable={canEdit}
                onChange={updateEditorContent}
                onImageUpload={canUpload ? uploadEditorImage : undefined}
              />
            </div>
          </div>

          <AttachmentsPanel
            attachments={workspace.attachments}
            canUpload={canUpload}
            error={attachmentError}
            uploading={uploadingAttachment}
            onUpload={uploadPanelAttachment}
          />

          <div className="flex flex-col-reverse gap-3 rounded-xl border border-[#dce6e1] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              disabled={!previousChecklistItem}
              type="button"
              variant="secondary"
              onClick={() => previousChecklistItem && addressChecklistItem(previousChecklistItem)}
            >
              <ArrowLeft /> Previous
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canEdit ? (
                <Button disabled={saving} type="button" variant="secondary" onClick={() => void saveContent()}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} Save draft
                </Button>
              ) : null}
              <Button
                disabled={!nextChecklistItem}
                type="button"
                onClick={() => nextChecklistItem && addressChecklistItem(nextChecklistItem)}
              >
                Next subsection <ArrowRight />
              </Button>
            </div>
          </div>
        </main>

        <aside className="grid content-start gap-4 xl:sticky xl:top-20 xl:self-start">
          <section className="builder-panel order-1 overflow-hidden">
            <div className="builder-section-title flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Bot className="size-5 text-[#B6F7FF]" />
                Intelligence panel
              </span>
              {canEdit ? (
                <Button
                  aria-label="Refresh drafting assistant"
                  size="icon"
                  type="button"
                  variant="secondary"
                  onClick={() => void loadAssistantContext()}
                >
                  <RefreshCcw className={assistantLoading ? "animate-spin" : undefined} />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 p-4 text-sm text-white/66">
              {assistantError ? (
                <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{assistantError}</Alert>
              ) : null}
              {assistantSummary ? (
                <div className="rounded-2xl border border-[#67E8F9]/18 bg-[#67E8F9]/10 p-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#B6F7FF]">
                    {assistantEngine ?? "Assistant"}
                  </div>
                  <p className="mt-2 text-sm text-white">{assistantSummary}</p>
                  {assistantGuidance.length ? (
                    <ul className="mt-3 grid gap-2 text-xs text-white/72">
                      {assistantGuidance.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <AssistantStat label="Checklist" value={String(assistantChecklistItems.length)} />
                <AssistantStat label="Outstanding" value={String(coverageGaps.length)} />
                <AssistantStat label="Evidence" value={String(workspace.attachments.length)} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-1 flex items-center gap-2 font-bold text-white">
                  <ShieldCheck className="size-4 text-[#8BD15F]" />
                  Evidence-based assistance
                </div>
                <p>
                  Assistance identifies gaps and drafts content from available evidence. Compliance classifications remain transparent, checklist-driven and subject to human review.
                </p>
                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      disabled={assistantActionId !== null}
                      onClick={() => void runAssistantAction("OUTLINE")}
                    >
                      {assistantActionId === "OUTLINE" ? <Loader2 className="animate-spin size-4" /> : <Bot className="size-4" />}
                      {hasDraftContent ? "Append AI outline" : "Insert AI outline"}
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      disabled={assistantActionId !== null}
                      onClick={() => void runAssistantAction("EVIDENCE_GAPS")}
                    >
                      {assistantActionId === "EVIDENCE_GAPS" ? <Loader2 className="animate-spin size-4" /> : <FileText className="size-4" />}
                      Add AI evidence prompts
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      disabled={assistantActionId !== null}
                      onClick={() => void runAssistantAction("GENERATE_DRAFT")}
                    >
                      {assistantActionId === "GENERATE_DRAFT" ? <Loader2 className="animate-spin size-4" /> : <Bot className="size-4" />}
                      Generate draft
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      disabled={assistantActionId !== null || !hasDraftContent}
                      onClick={() => void runAssistantAction("IMPROVE_DRAFT")}
                    >
                      {assistantActionId === "IMPROVE_DRAFT" ? <Loader2 className="animate-spin size-4" /> : <Bot className="size-4" />}
                      Improve draft
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/46">
                  Coverage priorities
                </div>
                <div className="grid gap-2">
                  {assistantChecklistItems.map((item) => (
                    <article className="rounded-xl border border-white/10 bg-white/[0.04] p-3" key={item.mapping_id ?? item.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase text-[#B6F7FF]">{item.checklist_section}</span>
                        <Badge className={cn(statusBadgeClass(item.completion_status))}>{item.compliance_status}</Badge>
                        <Badge className="border-white/12 bg-white/[0.06] text-white/72">
                          {formatImportance(item.importance)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-5 text-white">{item.checklist_title}</p>
                      <p className="mt-2 text-xs font-medium text-white/52">
                        {item.progress_percentage >= 100
                          ? "Checklist item is covered. Tighten evidence references and commitments before sign-off."
                          : item.progress_percentage > 0
                            ? "Coverage exists, but the draft still needs clearer evidence, quantified statements, or commitments."
                            : "No meaningful subsection draft is recorded for this checklist item yet."}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/46">
                  Source-backed suggestions
                </div>
                {assistantLoading ? <Alert>Loading drafting suggestions...</Alert> : null}
                {!assistantLoading && !sourceMappings.length ? (
                  <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-3 text-sm text-white/56">
                    No mapped source suggestions are available for this subsection yet.
                  </div>
                ) : null}
                <div className="grid gap-2">
                  {sourceMappings.map((mapping) => (
                    <article className="rounded-xl border border-white/10 bg-white/[0.04] p-3" key={mapping.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {mapping.detected_section_number ? `${mapping.detected_section_number} - ` : ""}
                            {mapping.detected_title ?? "Legacy draft suggestion"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-white/52">{mapping.source_document_filename}</p>
                        </div>
                        <Badge className={cn(sourceMappingStatusClass(mapping.status))}>
                          {mapping.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-3 text-xs font-medium text-white/60">
                        {mapping.assistant_notes ?? "Suggested subsection match is ready for review."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white/46">
                          Confidence {Math.round(mapping.confidence_score * 100)}%
                        </span>
                        {canEdit && mapping.suggested_content_html ? (
                          <Button
                            disabled={assistantActionId === mapping.id || mapping.status === "APPLIED"}
                            size="sm"
                            type="button"
                            onClick={() => void applySuggestedDraft(mapping)}
                          >
                            {assistantActionId === mapping.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                            {mapping.status === "APPLIED" ? "Applied" : "Use suggested draft"}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <div className="order-2">
            <ChecklistPanel
              activeSubsectionId={subsection.id}
              items={workspace.checklist_items}
              onAddressItem={addressChecklistItem}
            />
          </div>
          <div className="order-3">
            <CommentsPanel
              canComment={canComment}
              canResolve={canResolve}
              subsectionId={subsection.id}
              user={user}
            />
          </div>
          <div className="order-4">
            <RevisionPanel
              canRestore={canEdit}
              subsectionId={subsection.id}
              tenantId={user.tenant_id}
              onRestored={applyWorkspaceUpdate}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? status.replaceAll("_", " ");
}

function statusBadgeClass(status: string) {
  if (status === "COMPLETE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "READY_FOR_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "IN_PROGRESS") {
    return "border-[#b9d8c8] bg-[#eaf5ef] text-[#236c4a]";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function AssistantStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/42">{label}</div>
    </div>
  );
}

function importanceRank(importance: string) {
  const normalized = importance.toUpperCase();
  if (normalized === "HIGH") {
    return 3;
  }
  if (normalized === "MEDIUM") {
    return 2;
  }
  return 1;
}

function formatImportance(importance: string) {
  const normalized = importance.toUpperCase();
  if (normalized === "HIGH") {
    return "High priority";
  }
  if (normalized === "MEDIUM") {
    return "Medium priority";
  }
  if (normalized === "LOW") {
    return "Low priority";
  }
  return importance.replaceAll("_", " ");
}

function hasMeaningfulHtml(content: string) {
  return Boolean(content.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim());
}

function sourceMappingStatusClass(status: string) {
  if (status === "APPLIED" || status === "CONFIRMED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "NEEDS_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}
