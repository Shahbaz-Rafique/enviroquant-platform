import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#8BD15F] text-[#103526] shadow-[0_16px_32px_rgba(139,209,95,0.24)] hover:-translate-y-0.5 hover:bg-[#A4E374]",
        secondary:
          "border border-white/12 bg-white/[0.05] text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)] hover:bg-white/[0.09]",
        ghost: "text-white/74 hover:bg-white/[0.06] hover:text-white",
        destructive:
          "bg-[#C64E4E] text-white shadow-[0_12px_24px_rgba(198,78,78,0.24)] hover:-translate-y-0.5 hover:bg-[#D55D5D]",
        topbar:
          "border border-white/70 bg-white text-[#104A83] shadow-[0_10px_26px_rgba(255,255,255,0.14)] hover:bg-[#F4F9FF]",
        outline:
          "border border-[#8BD15F]/70 bg-transparent text-[#CBE9A0] hover:bg-[#8BD15F]/12 hover:text-white"
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9 px-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
