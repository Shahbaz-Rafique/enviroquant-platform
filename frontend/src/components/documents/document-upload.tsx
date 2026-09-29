"use client";

import { ClipboardList, FileText, FileType, Loader2, Map, UploadCloud } from "lucide-react";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import type { ProjectDocument } from "@/lib/types";

type DocumentUploadProps = {
  projectId: string;
  canUpload?: boolean;
  onUploaded: (document: ProjectDocument) => void;
};

const fileTypes = [
  { label: "PDF Files", icon: FileText },
  { label: "Word Docs", icon: FileType },
  { label: "Maps & Plans", icon: Map },
  { label: "Reports", icon: ClipboardList }
];

export function DocumentUpload({ canUpload = true, projectId, onUploaded }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("eia_report");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpload) {
      setError("Your role can view documents but cannot upload new versions.");
      return;
    }

    const file = selectedFile;
    if (!file) {
      setError("Choose a PDF or Word document");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("document_type", documentType);

    setUploading(true);
    setError(null);

    try {
      const document = await apiRequest<ProjectDocument>(`/projects/${projectId}/documents/upload`, {
        method: "POST",
        body
      });
      setSelectedFile(null);
      onUploaded(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!canUpload) {
    return null;
  }

  return (
    <form onSubmit={submit}>
      {error ? <Alert className="mb-4 border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

      <div className="rounded-lg border border-[#dce6e1] bg-white p-4">
        <label className="mb-4 grid gap-2 text-sm font-semibold text-white/78 md:max-w-xs">
          Document type
          <Select disabled={uploading} value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eia_report">Current EIA report</SelectItem>
              <SelectItem value="previous_eia">Previous EIA</SelectItem>
              <SelectItem value="legacy_report">Legacy report</SelectItem>
              <SelectItem value="supporting_document">Supporting document</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#dce6e1] md:grid-cols-4">
          {fileTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.label} className="grid min-h-24 place-items-center border-r border-[#e3eae6] bg-[#f8faf9] p-4 last:border-r-0">
                <Icon className="mb-2 size-8 text-[#287451]" />
                <span className="text-sm font-bold text-[#52675e]">{type.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <FileDropzone
            accept=".pdf,.doc,.docx"
            description="Drag and drop a PDF or Word document here."
            disabled={uploading}
            file={selectedFile}
            onFileChange={(file) => {
              setSelectedFile(file);
              setError(null);
            }}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          Submit Upload
        </Button>
      </div>
    </form>
  );
}
