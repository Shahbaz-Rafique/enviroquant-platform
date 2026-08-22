import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f7f3d]/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "workspace-primary-action bg-[#315f36] text-white shadow-none hover:bg-[#274f2d]",
        secondary:
          "border border-[#d5dad5] bg-white text-[#26362e] shadow-none hover:bg-[#f4f5f2]",
        ghost: "text-[#68746e] hover:bg-[#eef1ec] hover:text-[#1b2922]",
        destructive:
          "bg-[#C64E4E] text-white shadow-[0_12px_24px_rgba(198,78,78,0.24)] hover:-translate-y-0.5 hover:bg-[#D55D5D]",
        topbar:
          "border border-white/70 bg-white text-[#104A83] shadow-[0_10px_26px_rgba(255,255,255,0.14)] hover:bg-[#F4F9FF]",
        outline:
          "border border-[#93aa83] bg-transparent text-[#456f36] hover:bg-[#edf3e9]"
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
