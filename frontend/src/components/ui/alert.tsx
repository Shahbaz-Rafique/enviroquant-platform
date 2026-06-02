import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white/78 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
