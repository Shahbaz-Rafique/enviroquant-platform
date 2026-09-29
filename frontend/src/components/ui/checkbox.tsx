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
      "grid size-5 shrink-0 place-items-center rounded border border-[#b9c9c1] bg-white text-white shadow-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#2f7d57]/20 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#2f7d57] data-[state=checked]:bg-[#2f7d57]",
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
