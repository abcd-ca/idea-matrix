/**
 * The Idea Matrix mark: a lightbulb whose glass is four cells with rounded
 * inner corners. One quarter-cell path drawn four times, plus the neck and
 * base. Fills with currentColor so it takes the text colour around it.
 * Chosen 2026-09-08; the same shape is the favicon in apps/web/src/app/icon.svg.
 */
const CELL = "M30.3 20.1 Q30.3 23.3 27.1 23.3 L13.08 23.3 A19 19 0 0 1 30.3 6.08 Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" fill="currentColor" className={className}>
      <path d={CELL} />
      <path d={CELL} transform="translate(64 0) scale(-1 1)" />
      <path d={CELL} transform="translate(0 50) scale(1 -1)" />
      <path d={CELL} transform="translate(64 50) scale(-1 -1)" />
      <path d="M22 40 h20 v6 h-20 z" />
      <rect x="24" y="49" width="16" height="4" rx="1" />
      <rect x="26" y="55" width="12" height="4" rx="2" />
    </svg>
  );
}
