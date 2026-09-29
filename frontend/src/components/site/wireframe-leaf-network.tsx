"use client";

import { motion, useReducedMotion } from "framer-motion";

export function WireframeLeafNetwork({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 560 560"
      className={className}
      fill="none"
      animate={reduceMotion ? undefined : { y: [0, -6, 0], scale: [1, 1.02, 1] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <filter id="leafNetworkGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="11" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#leafNetworkGlow)" stroke="#00F5D4" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M282 428C226 348 172 286 144 206C116 126 156 72 228 62C299 52 360 100 380 172C399 244 354 338 282 428Z" />
        <path d="M282 426V86" />
        <path d="M282 150C250 130 214 120 176 116" />
        <path d="M282 182C324 154 360 140 398 136" />
        <path d="M282 216C240 210 202 198 164 188" />
        <path d="M282 252C330 238 366 226 404 220" />
        <path d="M282 288C240 282 208 272 176 262" />
        <path d="M282 322C326 304 362 292 394 286" />
        <path d="M282 356C242 346 214 336 190 324" />
        <path d="M282 390C320 374 350 362 378 350" />
      </g>
      <g fill="#67E8F9" fillOpacity="0.35">
        {[
          [144, 206],
          [228, 62],
          [380, 172],
          [404, 220],
          [176, 262],
          [394, 286],
          [190, 324],
          [378, 350]
        ].map(([cx, cy], index) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={4 + (index % 3)}
            animate={reduceMotion ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.85, 1.3, 0.85] }}
            transition={{ duration: 2.8 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </g>
    </motion.svg>
  );
}