import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm border border-blue-200 bg-blue-50 px-2 text-xs font-bold uppercase tracking-normal text-blue-800",
        className
      )}
      {...props}
    />
  );
}
