// Decorative line art for the stat tiles. Purely visual, hidden from screen readers.
// Each piece draws in the tile's accent colour through currentColor.
import { motion, useReducedMotion } from "motion/react";

// Bottom right of the tile, faded in from the left so it never fights the numbers.
const frame =
  "pointer-events-none absolute -right-1 -bottom-2 h-24 w-40 opacity-35 [mask-image:linear-gradient(to_right,transparent,black_55%)] sm:opacity-50 dark:opacity-30 dark:sm:opacity-40";

// Three turbines, the front one turning.
export function TurbineArt() {
  const still = useReducedMotion();
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-forecast`}>
      {[
        { x: 130, y: 34, s: 1, o: 0.55, speed: 7 },
        { x: 84, y: 52, s: 0.7, o: 0.3, speed: 9 },
        { x: 46, y: 66, s: 0.5, o: 0.18, speed: 11 },
      ].map((t) => (
        <g key={t.x} opacity={t.o} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
          <path d="M-2 0 L-4 90 L4 90 L2 0 Z" fill="currentColor" />
          {/* SVG's own rotate spins around the hub at (0, 0). */}
          <g>
            {!still && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={`${t.speed}s`} repeatCount="indefinite" />}
            {[0, 120, 240].map((a) => (
              <path key={a} d="M0 0 C 5 -10, 4 -30, 0 -40 C -2 -30, -3 -12, 0 0 Z" fill="currentColor" transform={`rotate(${a})`} />
            ))}
          </g>
          <circle r="3.5" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

// A wavy supply line with a dashed floor under it: the wind you can count on.
export function FloorArt() {
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-forecast`}>
      <defs>
        <linearGradient id="floor-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 52 C 30 32, 50 72, 80 54 S 130 30, 176 48 L176 112 L0 112 Z" fill="url(#floor-fill)" />
      <motion.path
        d="M0 52 C 30 32, 50 72, 80 54 S 130 30, 176 48"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />
      <line x1="0" y1="86" x2="176" y2="86" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5 5" />
    </svg>
  );
}

// Stacked blocks with a dashed block on top: the reserve held back.
export function ReserveArt() {
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-actual`}>
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x="104"
          width="56"
          height="18"
          rx="5"
          fill="currentColor"
          fillOpacity={0.18 + i * 0.1}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 92 - i * 22, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.1 }}
        />
      ))}
      <motion.rect
        x="104"
        y="26"
        width="56"
        height="18"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeDasharray="5 4"
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// A clock face with ticks, hands at the forecast's publish time.
export function ClockArt({ hour = 7.5 }: { hour?: number }) {
  const minuteAngle = (hour % 1) * 360;
  const hourAngle = (hour % 12) * 30;
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-forecast`}>
      <g transform="translate(130 64)" opacity="0.5">
        <circle r="44" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
        <circle r="30" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="3 5" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} y1="-44" y2={i % 3 === 0 ? -36 : -40} stroke="currentColor" strokeWidth="2" transform={`rotate(${i * 30})`} />
        ))}
        <line y2="-22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform={`rotate(${hourAngle})`} />
        <line y2="-34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${minuteAngle})`} />
        <circle r="4" fill="currentColor" />
      </g>
    </svg>
  );
}

// Dots scattered around a line: typical error.
export function ScatterArt() {
  const dots = [
    [70, 70], [84, 52], [96, 74], [104, 46], [116, 60], [124, 34], [134, 54], [142, 28], [150, 46], [160, 22], [110, 82], [88, 38], [140, 70], [158, 52],
  ];
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-forecast`}>
      <line x1="56" y1="88" x2="172" y2="22" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
      {dots.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="3.5"
          fill="currentColor"
          fillOpacity="0.45"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 + i * 0.04, type: "spring", stiffness: 400, damping: 18 }}
        />
      ))}
    </svg>
  );
}

// A small histogram with a long tail: large misses.
export function TailArt() {
  const bars = [8, 18, 34, 52, 40, 24, 14, 22, 10];
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-forecast`}>
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={64 + i * 12}
          width="9"
          rx="2.5"
          fill="currentColor"
          fillOpacity={i === 7 ? 0.65 : 0.3}
          initial={{ y: 100, height: 0 }}
          animate={{ y: 100 - h, height: h }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.05 }}
        />
      ))}
    </svg>
  );
}

// Two lines with a gap: the forecast riding above what turned up.
export function BiasArt() {
  return (
    <svg aria-hidden viewBox="0 0 176 112" className={`${frame} text-short`}>
      <path d="M40 58 C 70 46, 100 68, 130 54 S 165 50, 176 48" fill="none" stroke="var(--forecast)" strokeOpacity="0.7" strokeWidth="2.5" />
      <path d="M40 90 C 70 78, 100 100, 130 86 S 165 82, 176 80" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2.5" />
      <motion.g animate={{ y: [0, 4, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
        <line x1="110" y1="62" x2="110" y2="82" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" />
        <path d="M104 76 L110 84 L116 76" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
