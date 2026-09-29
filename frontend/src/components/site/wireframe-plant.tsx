"use client";

import { motion, useReducedMotion } from "framer-motion";

export function WireframePlant({
  className = "",
  variant = "sprout"
}: {
  className?: string;
  variant?: "sprout" | "fern" | "leaf";
}) {
  const reduceMotion = useReducedMotion();

  const commonAnimation = reduceMotion
    ? undefined
    : {
        y: [0, -8, 0],
        scale: [1, 1.03, 1]
      };

  if (variant === "leaf") {
    return (
      <motion.svg
        viewBox="0 0 520 520"
        className={className}
        fill="none"
        animate={commonAnimation}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <filter id="leafGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#leafGlow)" stroke="#00F5D4" strokeOpacity="0.85" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M262 420C210 347 154 285 128 208C103 133 136 78 216 66C301 53 367 102 385 176C406 261 353 341 262 420Z" />
          <path d="M261 412V94" />
          <path d="M258 214C227 182 190 166 156 160" />
          <path d="M259 238C299 199 332 186 366 183" />
          <path d="M260 274C220 252 186 241 152 241" />
          <path d="M260 310C302 283 338 269 375 265" />
          <path d="M260 344C224 333 198 322 172 308" />
          <path d="M260 378C299 360 332 343 360 328" />
        </g>
        <motion.circle
          cx="261"
          cy="238"
          r="10"
          fill="#67E8F9"
          fillOpacity="0.35"
          animate={reduceMotion ? undefined : { opacity: [0.25, 0.95, 0.25], scale: [1, 1.35, 1] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>
    );
  }

  return (
    <motion.svg
      viewBox="0 0 520 520"
      className={className}
      fill="none"
      animate={commonAnimation}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <filter id="plantGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#plantGlow)" stroke="#67E8F9" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M259 420V248" />
        <path d="M259 306C230 282 197 270 158 266" />
        <path d="M259 300C287 273 321 257 362 252" />
        <path d="M259 258C230 216 194 184 154 166" />
        <path d="M259 258C290 212 326 180 364 160" />
        <path d="M259 208C245 180 230 160 212 144" />
        <path d="M259 208C278 180 299 160 320 144" />
        <path d="M164 426H356" />
        <path d="M197 426V448H323V426" />
        <path d="M197 448C205 464 224 474 259 474C294 474 313 464 323 448" />
      </g>
      <g fill="#00F5D4" fillOpacity="0.4" stroke="#00F5D4" strokeOpacity="0.8" strokeWidth="1.5">
        <motion.circle cx="259" cy="248" r="6" animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.85, 1.3, 0.85] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.circle cx="364" cy="160" r="5" animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.9, 1.2, 0.9] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.circle cx="154" cy="166" r="5" animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.9, 1.2, 0.9] }} transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }} />
      </g>
      <motion.g
        stroke="#67E8F9"
        strokeOpacity="0.55"
        strokeWidth="1"
        animate={reduceMotion ? undefined : { opacity: [0.45, 0.95, 0.45] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M260 128C290 145 314 168 331 195" />
        <path d="M259 128C231 145 206 168 188 195" />
        <path d="M260 180C289 197 313 217 331 241" />
        <path d="M259 180C231 197 205 217 188 241" />
      </motion.g>
    </motion.svg>
  );
}