"use client";

import { CheckCircle2, FileSearch, Loader2, RefreshCcw, ShieldCheck, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { EiaSourceMapping, ProjectDocument } from "@/lib/types";

type EiaSourceMappingPanelProps = {
  documentId: string;
  projectId: string;
  canManage: boolean;
  onApplied: () => void;
};

export function EiaSourceMappingPanel({
  documentId,
  projectId,
  canManage,
  onApplied
}: EiaSourceMappingPanelProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [mappings, setMappings] = useState<EiaSourceMapping[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [sectionNumber, setSectionNumber] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionContent, setSectionContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMappingId, setActiveMappingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const legacyDocuments = useMemo(
    () =>
      documents.filter((document) =>
        ["previous_eia", "legacy_report", "eia_report"].includes(document.document_type)
      ),
    [documents]
  );

  const loadPanel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [documentData, mappingData] = await Promise.all([
        apiRequest<ProjectDocument[]>(`/projects/${projectId}/documents`),
        apiRequest<EiaSourceMapping[]>(`/eia-documents/${documentId}/source-mappings`)
      ]);
      setDocuments(documentData);
      setMappings(mappingData);
      setSelectedDocumentId((current) => current || documentData[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Source mappings could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [documentId, projectId]);

  useEffect(() => {
    loadPanel();
  }, [loadPanel]);

  async function submitDetection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocumentId || !canManage) {
      return;
    }

    const detectedSections =
      sectionTitle.trim() || sectionContent.trim() || sectionNumber.trim()
        ? [
            {
              section_number: sectionNumber.trim() || null,
              title: sectionTitle.trim() || "Legacy section",
              content: sectionContent.trim() || null,
              confidence: 0.8,
              metadata: { source: "manual_review_input" }
            }
          ]
        : [];

    setSaving(true);
    setError(null);
    try {
      const data = await apiRequest<EiaSourceMapping[]>(`/eia-documents/${documentId}/source-mappings/detect`, {
        method: "POST",
        body: JSON.stringify({
          source_document_id: selectedDocumentId,
          detection_method: detectedSections.length ? "manual_review_input" : "metadata_detected_sections",
          detected_sections: detectedSections
        })
      });
      setMappings(data);
      setSectionNumber("");
      setSectionTitle("");
      setSectionContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mapping detection could not be created");
    } finally {
      setSaving(false);
    }
  }

  async function autoStructureDocument() {
    if (!selectedDocumentId || !canManage) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/eia-documents/${documentId}/auto-structure`, {
        method: "POST",
        body: JSON.stringify({
          source_document_id: selectedDocumentId,
          apply_detected_content: true
        })
      });
      await Promise.all([loadPanel(), onApplied()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-structure could not be completed");
    } finally {
      setSaving(false);
    }
  }

  async function updateMapping(mapping: EiaSourceMapping, action: "confirm" | "apply" | "reject") {
    setActiveMappingId(mapping.id);
    setError(null);
    try {
      const path =
        action === "reject"
          ? `/eia-documents/${documentId}/source-mappings/${mapping.id}/reject`
          : `/eia-documents/${documentId}/source-mappings/${mapping.id}/confirm`;
      const updated = await apiRequest<EiaSourceMapping>(path, {
        method: "POST",
        body: JSON.stringify(
          action === "reject"
            ? { reason: "Rejected from document workspace" }
            : {
                apply_content: action === "apply",
                progress_percentage: action === "apply" ? Math.max(mapping.confidence_score * 100, 50) : undefined
              }
        )
      });
      setMappings((current) => current.map((item) => (item.id === mapping.id ? updated : item)));
      if (action === "apply") {
        onApplied();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mapping could not be updated");
    } finally {
      setActiveMappingId(null);
    }
  }

  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <FileSearch className="size-5 text-[#B6F7FF]" />
          Source Mapping
        </span>
        <Button aria-label="Refresh source mappings" size="icon" type="button" variant="secondary" onClick={loadPanel}>
          <RefreshCcw className={loading ? "animate-spin" : undefined} />
        </Button>
      </div>

      <div className="grid gap-4 p-4">
        {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

        {canManage ? (
          <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3" onSubmit={submitDetection}>
            <div className="grid gap-2">
              <Label htmlFor="source-document">Legacy document</Label>
              <Select
                disabled={saving || !legacyDocuments.length}
                value={selectedDocumentId}
                onValueChange={setSelectedDocumentId}
              >
                <SelectTrigger id="source-document">
                  <SelectValue placeholder="Select source document" />
                </SelectTrigger>
                <SelectContent>
                  {legacyDocuments.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.original_filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!legacyDocuments.length ? (
                <span className="text-xs font-medium text-white/52">Upload a previous EIA or legacy report first.</span>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
              <div className="grid gap-2">
                <Label htmlFor="detected-section-number">Section</Label>
                <Input
                  disabled={saving}
                  id="detected-section-number"
                  placeholder="1.1"
                  value={sectionNumber}
                  onChange={(event) => setSectionNumber(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="detected-section-title">Detected title</Label>
                <Input
                  disabled={saving}
                  id="detected-section-title"
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                />
              </div>
            </div>
            <Textarea
              className="min-h-28"
              disabled={saving}
              placeholder="Detected legacy content"
              value={sectionContent}
              onChange={(event) => setSectionContent(event.target.value)}
            />
            <Button disabled={saving || !selectedDocumentId} type="submit">
              {saving ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Create Suggestions
            </Button>
            <Button disabled={saving || !selectedDocumentId} type="button" variant="secondary" onClick={() => void autoStructureDocument()}>
              {saving ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Auto-Structure EIA
            </Button>
          </form>
        ) : null}

        <div className="grid max-h-[30rem] gap-3 overflow-y-auto">
          {loading ? <Alert>Loading source mappings...</Alert> : null}
          {!loading && !mappings.length ? <div className="text-sm text-white/52">No source mappings yet.</div> : null}
          {mappings.map((mapping) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-3" key={mapping.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">
                    {mapping.detected_section_number ? `${mapping.detected_section_number} - ` : ""}
                    {mapping.detected_title ?? "Detected section"}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs font-medium text-white/52">
                    {mapping.source_document_filename}
                  </div>
                </div>
                <Badge className={cn(statusClass(mapping.status))}>{mapping.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-sm text-white/74">
                {mapping.subsection_number
                  ? `${mapping.subsection_number}: ${mapping.subsection_title}`
                  : "Manual mapping needed"}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white/46">
                  Confidence {Math.round(mapping.confidence_score * 100)}%
                </span>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {mapping.subsection_id ? (
                      <>
                        <Button
                          disabled={activeMappingId === mapping.id}
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => updateMapping(mapping, "confirm")}
                        >
                          {activeMappingId === mapping.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                          Confirm
                        </Button>
                        <Button
                          disabled={activeMappingId === mapping.id}
                          size="sm"
                          type="button"
                          onClick={() => updateMapping(mapping, "apply")}
                        >
                          {activeMappingId === mapping.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                          Apply
                        </Button>
                      </>
                    ) : null}
                    <Button
                      disabled={activeMappingId === mapping.id}
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={() => updateMapping(mapping, "reject")}
                    >
                      {activeMappingId === mapping.id ? <Loader2 className="animate-spin" /> : <XCircle />}
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function statusClass(status: string) {
  if (status === "APPLIED" || status === "CONFIRMED") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "REJECTED") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }
  if (status === "NEEDS_REVIEW") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
  return "border-[#67E8F9]/24 bg-[#67E8F9]/10 text-[#B6F7FF]";
}
