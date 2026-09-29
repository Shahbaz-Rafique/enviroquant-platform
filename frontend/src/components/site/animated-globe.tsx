"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedGlobe({
  className = "",
  variant = "plain"
}: {
  className?: string;
  variant?: "plain" | "plant";
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 560 560"
      className={className}
      fill="none"
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
    >
      <defs>
        <radialGradient id="globeCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00F5D4" stopOpacity="0.12" />
          <stop offset="62%" stopColor="#071713" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
        </radialGradient>
        <filter id="globeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.circle
        cx="280"
        cy="280"
        r="176"
        fill="url(#globeCore)"
        stroke="#67E8F9"
        strokeOpacity="0.55"
        strokeWidth="2"
        filter="url(#globeGlow)"
        animate={reduceMotion ? undefined : { scale: [1, 1.02, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <g stroke="#67E8F9" strokeOpacity="0.45" strokeWidth="1.2">
        <circle cx="280" cy="280" r="142" />
        <circle cx="280" cy="280" r="108" />
        <ellipse cx="280" cy="280" rx="176" ry="54" />
        <ellipse cx="280" cy="280" rx="176" ry="112" />
        <path d="M104 280H456" />
        <path d="M132 214C190 244 230 264 280 264C330 264 370 244 428 214" />
        <path d="M132 346C190 316 230 296 280 296C330 296 370 316 428 346" />
      </g>
      <g stroke="#00F5D4" strokeOpacity="0.5" strokeWidth="1.5">
        <path d="M168 170L233 230L318 195L388 252" />
        <path d="M156 312L240 290L312 350L408 320" />
        <path d="M170 382L222 322L274 364L334 300L396 352" />
      </g>
      <g>
        {[
          [170, 170],
          [233, 230],
          [318, 195],
          [388, 252],
          [156, 312],
          [240, 290],
          [312, 350],
          [408, 320],
          [170, 382],
          [222, 322],
          [274, 364],
          [334, 300],
          [396, 352]
        ].map(([cx, cy], index) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="5"
            fill={index % 2 === 0 ? "#67E8F9" : "#00F5D4"}
            animate={reduceMotion ? undefined : { opacity: [0.22, 1, 0.22], scale: [0.8, 1.35, 0.8] }}
            transition={{ duration: 3 + index * 0.08, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </g>
      {variant === "plant" ? (
        <g transform="translate(210 36)">
          <path d="M70 58C70 32 62 18 50 4" stroke="#00F5D4" strokeOpacity="0.95" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 4C34 16 20 28 10 48" stroke="#00F5D4" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 6C58 18 72 28 86 46" stroke="#67E8F9" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
          <motion.path
            d="M50 8C42 16 34 26 30 42"
            stroke="#67E8F9"
            strokeOpacity="0.7"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={reduceMotion ? undefined : { pathLength: [0.65, 1, 0.65] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="50"
            cy="8"
            r="4"
            fill="#00F5D4"
            animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.9, 1.35, 0.9] }}
            transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
      ) : null}
    </motion.svg>
  );
}