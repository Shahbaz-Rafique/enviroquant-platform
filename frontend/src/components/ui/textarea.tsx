import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-[#cfdcd6] bg-white px-4 py-3 text-sm text-[#18372c] outline-none placeholder:text-[#8a9993] focus-visible:border-[#2f7d57] focus-visible:ring-2 focus-visible:ring-[#2f7d57]/15 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
