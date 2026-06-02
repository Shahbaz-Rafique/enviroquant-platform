"use client";

import { Bot, CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { TipTapEditor } from "@/components/Editor/TipTapEditor";
import { AttachmentsPanel } from "@/components/Sidebar/AttachmentsPanel";
import { ChecklistPanel } from "@/components/Sidebar/ChecklistPanel";
import { CommentsPanel } from "@/components/Workspace/CommentsPanel";
import { RevisionPanel } from "@/components/Workspace/RevisionPanel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
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
  EiaChecklistItem,
  EiaDocumentMember,
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
              progress_percentage: nextProgress
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
        setError(err instanceof Error ? err.message : "Subsection content could not be saved");
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
    if (!dirty || !canEdit || saving) {
      return;
    }
    const autosave = window.setTimeout(() => {
      void saveContent();
    }, 4000);
    return () => window.clearTimeout(autosave);
  }, [canEdit, dirty, saveContent, saving]);

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
            <span className="min-w-32 text-sm font-semibold text-white/52">{saveStatusText}</span>
            <Button disabled={!canEdit || saving} type="button" variant="secondary" onClick={() => void saveContent()}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Save
            </Button>
            <Button
              disabled={!canEdit || saving}
              type="button"
              onClick={() => void saveContent({ completionStatus: "COMPLETE", progressPercentage: 100 })}
            >
              <CheckCircle2 />
              Mark Complete
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <main className="grid gap-5" ref={editorRegionRef}>
          <div className="builder-panel overflow-hidden">
            <div className="grid gap-4 border-b border-white/10 p-4 lg:grid-cols-[minmax(0,1fr)_180px_170px]">
              <label className="grid gap-2 text-sm font-semibold text-white/78">
                Completion status
                <Select disabled={!canEdit} value={completionStatus} onValueChange={updateCompletionStatus}>
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
                  disabled={!canEdit}
                  max={100}
                  min={0}
                  value={Math.round(progressPercentage)}
                  onChange={updateProgressPercentage}
                />
              </label>
              <div className="grid content-end">
                <div className="h-10 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-100">
                  {Math.round(progressPercentage)}% complete
                </div>
              </div>
            </div>
            <div className="p-4">
              <TipTapEditor
                content={editorContent.html}
                editable={canEdit}
                onChange={updateEditorContent}
                onImageUpload={canUpload ? uploadEditorImage : undefined}
              />
            </div>
          </div>
        </main>

        <aside className="grid content-start gap-5">
          <ChecklistPanel
            activeSubsectionId={subsection.id}
            items={workspace.checklist_items}
            onAddressItem={addressChecklistItem}
          />
          <CommentsPanel
            canComment={canComment}
            canResolve={canResolve}
            subsectionId={subsection.id}
            user={user}
          />
          <AttachmentsPanel
            attachments={workspace.attachments}
            canUpload={canUpload}
            error={attachmentError}
            uploading={uploadingAttachment}
            onUpload={uploadPanelAttachment}
          />
          <RevisionPanel
            canRestore={canEdit}
            subsectionId={subsection.id}
            tenantId={user.tenant_id}
            onRestored={applyWorkspaceUpdate}
          />
          <section className="builder-panel overflow-hidden">
            <div className="builder-section-title flex items-center gap-2">
              <Bot className="size-5 text-[#B6F7FF]" />
              AI Assistant
            </div>
            <div className="grid gap-3 p-4 text-sm text-white/66">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-1 flex items-center gap-2 font-bold text-white">
                  <ShieldCheck className="size-4 text-[#8BD15F]" />
                  Draft review placeholder
                </div>
                <p>Checklist-aware drafting support will be connected here.</p>
              </div>
            </div>
          </section>
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
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "READY_FOR_REVIEW") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
  if (status === "IN_PROGRESS") {
    return "border-[#67E8F9]/24 bg-[#67E8F9]/10 text-[#B6F7FF]";
  }
  return "border-white/12 bg-white/[0.05] text-white/68";
}
