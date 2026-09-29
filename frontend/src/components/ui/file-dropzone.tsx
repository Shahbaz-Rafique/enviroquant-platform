"use client";

import { UploadCloud } from "lucide-react";
import type { DragEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FileTrigger } from "@/components/ui/file-trigger";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  accept?: string;
  disabled?: boolean;
  file: File | null;
  description: string;
  onFileChange: (file: File | null) => void;
};

export function FileDropzone({
  accept,
  disabled = false,
  file,
  description,
  onFileChange
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (!disabled) {
      onFileChange(event.dataTransfer.files[0] ?? null);
    }
  }

  return (
    <div
      className={cn(
        "grid min-h-28 place-items-center rounded-2xl border border-dashed border-white/14 bg-white/[0.03] px-4 text-center transition-colors",
        dragActive && "border-[#67E8F9]/30 bg-white/[0.06]",
        disabled && "opacity-60"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
    >
      <div className="grid justify-items-center gap-3">
        <FileTrigger accept={accept} disabled={disabled} onFileSelect={onFileChange}>
          <UploadCloud />
          Choose file
        </FileTrigger>
        <p className="max-w-full truncate text-sm font-medium text-white/52">
          {file ? file.name : description}
        </p>
        {file ? (
          <Button disabled={disabled} size="sm" type="button" variant="ghost" onClick={() => onFileChange(null)}>
            Clear selection
          </Button>
        ) : null}
      </div>
    </div>
  );
}
