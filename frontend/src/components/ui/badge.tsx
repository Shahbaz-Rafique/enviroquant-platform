import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border border-[#b9d8c8] bg-[#eaf5ef] px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#236c4a]",
        className
      )}
      {...props}
    />
  );
}
