import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/*
 * The Volentify mark: a V whose left arm is the solid ground report and whose right arm is the
 * relay — hop segments that strengthen as they climb until the last one reaches the network
 * (the signal-orange node). Geometry matches public/brand/volentify-mark.svg (64-unit grid).
 */
const MARK_PATH =
  'M15.15 8.49H24.45L32.68 57.9H29.63ZM29.63 57.9L33.92 42.37H37.5L32.68 57.9Z' +
  'M34.97 38.61L37.77 28.49H41.8L38.66 38.61ZM38.8 24.72L41.97 13.31H46.51L42.97 24.72Z';
const NODE = { cx: 44.24, cy: 13.31, r: 5.41 };
const SIGNAL = '#FF6B00';

// Any explicit colour class from the caller replaces the default ivory (cn() does not dedupe).
const COLOUR_CLASS = /(^|\s)text-(ink|ivory|sand|stone|ash|signal|gold|critical|high|moderate|low|info|white|black|current|inherit)(\/|\s|$)/;

type LogoMarkProps = { className?: string; size?: number; style?: CSSProperties };

/** The symbol alone. Body uses currentColor; the network node stays signal orange. */
export function LogoMark({ className, size = 28, style }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={MARK_PATH} fill="currentColor" />
      <circle cx={NODE.cx} cy={NODE.cy} r={NODE.r} fill={SIGNAL} />
    </svg>
  );
}

type LogoProps = { className?: string; showWordmark?: boolean; size?: number };

/**
 * Mark + Instrument Serif wordmark. `size` is the mark's box in px; the wordmark is set at
 * 0.94 × size so the V of the mark sits just proud of the cap height (28 → 26.3px ≈ the old 1.65rem).
 */
export function Logo({ className, showWordmark = true, size = 28 }: LogoProps) {
  const recoloured = !!className && COLOUR_CLASS.test(className);
  return (
    <span
      role="img"
      aria-label="Volentify"
      className={cn('inline-flex items-center', !recoloured && 'text-ivory', className)}
      style={{ gap: showWordmark ? Math.round(size * 0.3) : undefined }}
    >
      {/* nudged up so the V centres on the wordmark's cap height, not its line box */}
      <LogoMark size={size} style={showWordmark ? { transform: 'translateY(-4%)' } : undefined} />
      {showWordmark && (
        <span aria-hidden="true" className="font-serif leading-none" style={{ fontSize: size * 0.94 }}>
          Volentify
        </span>
      )}
    </span>
  );
}

export default Logo;
