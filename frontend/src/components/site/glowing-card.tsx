"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlowingCard({
  children,
  className,
  delay = 0,
  hoverScale = 1.02,
  intensity = "strong",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: number;
  intensity?: "normal" | "strong";
}) {
  const reduceMotion = useReducedMotion();
  const intensityClass =
    intensity === "normal"
      ? "border-white/20 bg-[rgba(119,_166,_60,_0.08)]"
      : "border-white/30 bg-[rgba(119,_166,_60,_0.1)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : { scale: hoverScale, y: -4 }}
      className={cn(
        "group relative rounded-[15px] border-2 p-6 backdrop-blur-sm transition-all duration-500",
        intensityClass,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
