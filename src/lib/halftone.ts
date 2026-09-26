/**
 * Procedural halftone portraits: a deterministic bust (head, neck, shoulders) rendered as a dot grid,
 * lit from a seeded direction. No photos, no real faces — the same seed always gives the same portrait.
 * Coordinates are in a 0–100 viewBox.
 */
export interface Dot {
  x: number;
  y: number;
  r: number;
}

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function rng(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function halftoneDots(seed: string, grid = 18): Dot[] {
  const rnd = rng(seed || "byline");
  const cell = 100 / grid;
  const cx = 0.5 + (rnd() - 0.5) * 0.1;
  const cy = 0.4 + (rnd() - 0.5) * 0.04;
  const hRx = 0.19 + rnd() * 0.05;
  const hRy = 0.24 + rnd() * 0.05;
  const sRx = 0.4 + rnd() * 0.06;
  const sRy = 0.26 + rnd() * 0.05;
  const sCx = 0.5 + (cx - 0.5) * 0.4;
  const hairLimit = -0.5 + rnd() * 0.5; // where the hair ends on the head, as a fraction of head height
  const hasHair = rnd() > 0.12;
  const angle = -Math.PI * (0.15 + 0.7 * rnd()); // light from above, left or right
  const lz = 0.7;
  const lx = Math.cos(angle) * 0.7;
  const ly = Math.sin(angle) * 0.7;
  const ln = Math.hypot(lx, ly, lz);
  const light = [lx / ln, ly / ln, lz / ln] as const;

  const dots: Dot[] = [];
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const u = (i + 0.5) / grid;
      const v = (j + 0.5) / grid;
      const nx = (u - cx) / hRx;
      const ny = (v - cy) / hRy;
      const d2 = nx * nx + ny * ny;
      const sx = (u - sCx) / sRx;
      const sy = (v - 1.02) / sRy;
      const s2 = sx * sx + sy * sy;

      let brightness: number | null = null;
      if (d2 <= 1) {
        const nz = Math.sqrt(Math.max(0, 1 - d2));
        const b = clamp01(nx * 0.9 * light[0] + ny * 0.9 * light[1] + nz * light[2]);
        brightness = 0.35 + 0.65 * b;
        if (hasHair && ny < hairLimit) brightness = 0.1 + 0.15 * b;
        const eye = Math.hypot(Math.abs(nx) - 0.42, ny + 0.02);
        if (eye < 0.2 && ny > hairLimit) brightness -= 0.22;
      } else if (Math.abs(u - cx) < 0.075 && v > cy + hRy * 0.8 && s2 > 1) {
        brightness = 0.22; // neck, in shadow under the chin
      } else if (s2 <= 1) {
        const nz = Math.sqrt(Math.max(0, 1 - s2));
        const b = clamp01(sx * 0.6 * light[0] + sy * 0.6 * light[1] + nz * light[2]);
        brightness = 0.28 + 0.5 * b;
      }
      if (brightness === null) continue;

      const r = cell * 0.62 * Math.pow(clamp01(1 - brightness), 0.9);
      if (r < cell * 0.09) continue;
      dots.push({ x: round(i * cell + cell / 2), y: round(j * cell + cell / 2), r: round(r) });
    }
  }
  return dots;
}

const round = (n: number) => Math.round(n * 100) / 100;
