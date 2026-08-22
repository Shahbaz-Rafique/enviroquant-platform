import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm border border-[#cbd8c4] bg-[#edf3e9] px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#4f7f3d]",
        className
      )}
      {...props}
    />
  );
}
