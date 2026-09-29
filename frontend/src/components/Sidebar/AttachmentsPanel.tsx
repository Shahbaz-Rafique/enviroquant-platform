"use client";

import { ExternalLink, FileImage, FileSpreadsheet, FileText, Loader2, Map, UploadCloud } from "lucide-react";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import type { EiaAttachment } from "@/lib/types";

type AttachmentsPanelProps = {
  attachments: EiaAttachment[];
  canUpload?: boolean;
  error?: string | null;
  uploading?: boolean;
  onUpload: (file: File) => Promise<void>;
};

const acceptedFiles = ".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt,.gif,.jpeg,.jpg,.png,.webp,.kml,.kmz,.geojson,.zip";

export function AttachmentsPanel({
  attachments,
  canUpload = true,
  error = null,
  uploading = false,
  onUpload
}: AttachmentsPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = selectedFile;
    if (!file || !canUpload) {
      return;
    }
    await onUpload(file);
    setSelectedFile(null);
  }

  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span>Evidence & supporting files</span>
        <span className="text-sm font-semibold text-white/52">{attachments.length}</span>
      </div>

      <div className="grid gap-4 p-4">
        {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

        {canUpload ? (
          <form className="grid gap-3" onSubmit={submit}>
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#dce6e1] sm:grid-cols-4">
              {[
                { icon: FileText, label: "PDF & Word" },
                { icon: FileSpreadsheet, label: "Spreadsheets" },
                { icon: FileImage, label: "Images & plans" },
                { icon: Map, label: "GIS data" }
              ].map(({ icon: Icon, label }) => (
                <div className="flex min-h-16 items-center justify-center gap-2 border-r border-[#e3eae6] bg-[#f8faf9] px-2 text-center text-xs font-semibold text-[#52675e] last:border-r-0" key={label}>
                  <Icon className="size-4 text-[#287451]" /> {label}
                </div>
              ))}
            </div>
            <FileDropzone
              accept={acceptedFiles}
              description="Documents, spreadsheets, images, plans or packaged GIS data"
              disabled={uploading}
              file={selectedFile}
              onFileChange={setSelectedFile}
            />
            <Button disabled={uploading || !selectedFile} type="submit">
              {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
              Upload evidence
            </Button>
          </form>
        ) : null}

        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
          {!attachments.length ? (
            <div className="p-3 text-sm text-white/52">No attachments yet.</div>
          ) : (
            attachments.map((attachment) => (
              <a
                className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-white/[0.06]"
                href={attachment.storage_path}
                key={attachment.id}
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#8BD15F]/18 bg-[#8BD15F]/12 text-[#C7F6A4]">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-white">{attachment.original_filename}</strong>
                    <span className="text-xs font-medium text-white/52">{formatBytes(attachment.size_bytes)}</span>
                  </span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-white/36" />
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
