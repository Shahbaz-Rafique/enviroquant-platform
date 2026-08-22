"use client";

import { UploadCloud } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

type FileTriggerProps = {
  accept?: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  size?: ButtonProps["size"];
  title?: string;
  variant?: ButtonProps["variant"];
  onFileSelect: (file: File) => void;
};

export function FileTrigger({
  accept,
  className,
  disabled = false,
  children,
  size,
  title,
  variant = "secondary",
  onFileSelect
}: FileTriggerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onFileSelect(file);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        accept={accept}
        className="sr-only"
        disabled={disabled}
        hidden
        tabIndex={-1}
        type="file"
        onChange={selectFile}
      />
      <Button
        aria-label={title}
        className={className}
        disabled={disabled}
        size={size}
        title={title}
        type="button"
        variant={variant}
        onClick={() => inputRef.current?.click()}
      >
        {children ?? (
          <>
            <UploadCloud />
            Choose file
          </>
        )}
      </Button>
    </>
  );
}
