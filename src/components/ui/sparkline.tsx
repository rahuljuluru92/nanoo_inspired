/** Hand-rolled SVG sparkline. Inherits the text colour (so it works on ink and paper); vermilion end dot is a fill only. */
export function Sparkline({ data, width = 120, height = 32, label }: { data: number[]; width?: number; height?: number; label: string }) {
  if (data.length < 2) return <div style={{ width, height }} aria-hidden="true" />;
  const max = Math.max(...data, 1);
  const pad = 3;
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (width - pad * 2), height - pad - (v / max) * (height - pad * 2)] as const);
  const last = pts[pts.length - 1]!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: "100%", height: "auto" }} role="img" aria-label={label}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--vermilion)" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}
