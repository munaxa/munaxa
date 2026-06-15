/**
 * Abstract hero illustration — a stylized "operations cockpit" graphic. Intentionally
 * generic (cards, charts, a calendar strip) so it communicates "unified school platform"
 * without depicting any real screens, data models, or UI from the product itself.
 */
export function HeroIllustration({
  className,
  ariaLabel,
}: {
  className?: string;
  ariaLabel: string;
}) {
  return (
    <svg
      viewBox="0 0 560 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="heroPanel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="heroBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" />
        </linearGradient>
      </defs>

      {/* Backdrop panel */}
      <rect x="20" y="20" width="520" height="440" rx="28" fill="url(#heroPanel)" />
      <rect
        x="20.5"
        y="20.5"
        width="519"
        height="439"
        rx="27.5"
        stroke="hsl(var(--border))"
        strokeOpacity="0.6"
      />

      {/* Top bar */}
      <rect x="52" y="52" width="220" height="22" rx="6" fill="hsl(var(--foreground) / 0.12)" />
      <circle cx="492" cy="63" r="11" fill="hsl(var(--accent))" />
      <circle cx="460" cy="63" r="11" fill="hsl(var(--primary))" />
      <circle cx="428" cy="63" r="11" fill="hsl(var(--aqua))" />

      {/* Stat cards row */}
      {[52, 196, 340, 484].map((x, i) => (
        <g key={x}>
          <rect
            x={x - 80}
            y="104"
            width="148"
            height="86"
            rx="14"
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
          />
          <rect
            x={x - 64}
            y="124"
            width="64"
            height="10"
            rx="5"
            fill="hsl(var(--muted-foreground) / 0.4)"
          />
          <rect
            x={x - 64}
            y="146"
            width="90"
            height="20"
            rx="6"
            fill={i % 2 === 0 ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--accent) / 0.7)'}
          />
        </g>
      ))}

      {/* Main chart panel */}
      <rect
        x="52"
        y="214"
        width="320"
        height="206"
        rx="16"
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
      />
      <rect
        x="76"
        y="238"
        width="140"
        height="12"
        rx="6"
        fill="hsl(var(--muted-foreground) / 0.4)"
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x={76 + i * 40}
          y={360 - (i % 4) * 22 - 24}
          width="22"
          height={(i % 4) * 22 + 24}
          rx="6"
          fill="url(#heroBar)"
          opacity={0.55 + (i % 3) * 0.15}
        />
      ))}
      <line x1="76" y1="384" x2="352" y2="384" stroke="hsl(var(--border))" strokeWidth="1.5" />

      {/* Side panel — schedule / list */}
      <rect
        x="392"
        y="214"
        width="128"
        height="206"
        rx="16"
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect
            x="412"
            y={244 + i * 32}
            width="12"
            height="12"
            rx="4"
            fill={i < 3 ? 'hsl(var(--aqua))' : 'hsl(var(--border))'}
          />
          <rect
            x="432"
            y={244 + i * 32}
            width="68"
            height="10"
            rx="5"
            fill="hsl(var(--muted-foreground) / 0.35)"
          />
        </g>
      ))}
    </svg>
  );
}
