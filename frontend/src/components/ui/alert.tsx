import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#d8e3de] bg-[#f7faf8] px-4 py-3 text-sm text-[#5f7169]",
        className
      )}
      {...props}
    />
  );
}
