import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7d57]/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "workspace-primary-action bg-[#287451] text-white shadow-sm hover:bg-[#1f6042]",
        secondary:
          "border border-[#cfdcd6] bg-white text-[#29483c] shadow-sm hover:bg-[#f3f7f5]",
        ghost: "text-[#52675e] hover:bg-[#edf4f0] hover:text-[#18372c]",
        destructive:
          "bg-[#C64E4E] text-white shadow-[0_12px_24px_rgba(198,78,78,0.24)] hover:-translate-y-0.5 hover:bg-[#D55D5D]",
        topbar:
          "border border-white/70 bg-white text-[#104A83] shadow-[0_10px_26px_rgba(255,255,255,0.14)] hover:bg-[#F4F9FF]",
        outline:
          "border border-[#9fc6b2] bg-transparent text-[#236c4a] hover:bg-[#edf6f1]"
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { buttonVariants };
