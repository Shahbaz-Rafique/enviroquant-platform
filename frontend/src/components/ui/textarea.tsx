import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus-visible:ring-2 focus-visible:ring-[#67E8F9]/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
