"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid size-5 shrink-0 place-items-center rounded-lg border border-white/14 bg-white/[0.03] text-[#103526] shadow-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#67E8F9]/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#8BD15F] data-[state=checked]:bg-[#8BD15F]",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check className="size-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
