import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";


export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "form-line-input flex w-full border px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
