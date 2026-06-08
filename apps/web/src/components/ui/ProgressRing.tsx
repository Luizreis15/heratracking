type Props = {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
};

export function ProgressRing({
  value,
  max,
  size = 72,
  stroke = 5,
  className = "",
}: Props) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const done = value >= max && max > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={["shrink-0 -rotate-90", className].join(" ")}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={done ? "hsl(var(--hera-done))" : "hsl(var(--hera-cyan))"}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}
