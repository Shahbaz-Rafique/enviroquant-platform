"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CarouselServiceCard = {
  title: string;
  description: string;
  eyebrow?: string;
  mediaLabel?: string;
};

export function ServiceCarousel({ items }: Readonly<{ items: CarouselServiceCard[] }>) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const normalizedItems = useMemo(() => items.slice(0, 3), [items]);

  useEffect(() => {
    if (isHovered || reduceMotion) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      setActiveIndex((value) => (value + 1) % normalizedItems.length);
    }, 4200);

    return () => globalThis.clearInterval(timer);
  }, [isHovered, normalizedItems.length, reduceMotion]);

  const swipe = (direction: number) => {
    setActiveIndex((value) => (value + direction + normalizedItems.length) % normalizedItems.length);
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-4 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:px-8" aria-label="Services carousel">
      <div className="mb-5 flex items-center justify-between text-white/60">
        <p className="text-xs font-semibold uppercase tracking-[0.28em]">Interactive Carousel</p>
        <div className="hidden gap-2 sm:flex">
          <Button variant="ghost" size="icon" className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={() => swipe(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={() => swipe(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <motion.div
        className="relative flex min-h-[24rem] items-center justify-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragMomentum
        onDragEnd={(_, info) => {
          if (info.offset.x < -40) {
            swipe(1);
          }
          if (info.offset.x > 40) {
            swipe(-1);
          }
        }}
      >
        {normalizedItems.map((item, index) => {
          const relative = (index - activeIndex + normalizedItems.length) % normalizedItems.length;
          let position = 0;
          if (relative === 1) {
            position = 1;
          } else if (relative === 2) {
            position = -1;
          }
          const isCenter = position === 0;
          const translateX = `${position * 32}%`;

          return (
            <motion.button
              key={item.title}
              type="button"
              className={cn(
                "absolute w-[84%] max-w-[31rem] rounded-[1.8rem] border px-5 py-5 text-left outline-none transition-shadow duration-300 sm:w-[27rem]",
                isCenter
                  ? "border-[#00F5D4]/42 bg-[#061511]/95 shadow-[0_0_0_1px_rgba(0,245,212,0.22),0_0_58px_rgba(0,245,212,0.26),0_24px_85px_rgba(0,0,0,0.5)]"
                  : "border-white/10 bg-white/[0.035] shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
              )}
              style={{ zIndex: isCenter ? 3 : 1 }}
              animate={{
                x: translateX,
                scale: isCenter ? 1.12 : 0.89,
                opacity: isCenter ? 1 : 0.64,
                filter: isCenter ? "brightness(1.1)" : "brightness(0.92)"
              }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => setActiveIndex(index)}
              whileHover={reduceMotion ? undefined : { y: -8, scale: isCenter ? 1.14 : 0.94 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#67E8F9]/80">{item.eyebrow ?? "Living Service"}</span>
                <span className={cn("size-3 rounded-full", isCenter ? "bg-[#00F5D4] shadow-[0_0_16px_rgba(0,245,212,0.8)]" : "bg-white/30")} />
              </div>
              <div className="mb-4 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/10">
                <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-white/60">
                    {item.mediaLabel ?? "Vector Placeholder"}
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white">{item.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-white/72">{item.description}</p>
              <motion.div
                className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-[#00F5D4]/70 to-transparent"
                animate={reduceMotion ? undefined : { opacity: isCenter ? [0.3, 1, 0.3] : [0.18, 0.5, 0.18] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}