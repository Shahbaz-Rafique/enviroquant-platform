import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border border-[#67E8F9]/20 bg-[#67E8F9]/10 px-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#B6F7FF]",
        className
      )}
      {...props}
    />
  );
}
