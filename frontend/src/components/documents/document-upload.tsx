"use client";

import { ClipboardList, FileText, FileType, Loader2, Map, UploadCloud } from "lucide-react";
import { DragEvent, FormEvent, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setSelectedFile(file);
    setError(null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files[0]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpload) {
      setError("Your role can view documents but cannot upload new versions.");
      return;
    }

    const file = selectedFile ?? inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF or Word document");
      return;
    }

    const body = new FormData();
    body.append("file", file);

    setUploading(true);
    setError(null);

    try {
      const document = await apiRequest<ProjectDocument>(`/projects/${projectId}/documents/upload`, {
        method: "POST",
        body
      });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedFile(null);
      onUploaded(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? <Alert className="mb-4 border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

      <div className="rounded-md border border-slate-300 bg-white p-4">
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 md:grid-cols-4">
          {fileTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.label} className="grid min-h-24 place-items-center border-r border-slate-200 p-4 last:border-r-0">
                <Icon className="mb-2 size-9 text-blue-700" />
                <span className="text-sm font-bold text-slate-800">{type.label}</span>
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            "mt-4 grid min-h-28 place-items-center rounded-md border border-dashed border-blue-300 bg-blue-50/60 px-4 text-center transition-colors",
            dragActive && "border-blue-600 bg-blue-100",
            !canUpload && "opacity-60"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            className="sr-only"
            id="document"
            type="file"
            accept=".pdf,.doc,.docx"
            disabled={!canUpload}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <div>
            <Button asChild type="button" disabled={!canUpload || uploading}>
              <label htmlFor="document" className="cursor-pointer">
                {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                Upload Files
              </label>
            </Button>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {selectedFile ? selectedFile.name : "Drag & drop files here or click to upload."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={!canUpload || uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          Submit Upload
        </Button>
      </div>
    </form>
  );
}
