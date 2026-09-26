import type { SVGProps } from "react";

/** Hand-drawn, square-capped 1.5 px line icons — deliberately not a stock icon set. */
const PATHS = {
  desk: "M4 6h16M4 12h10M4 18h16",
  campaigns: "M5 5h14v14H5zM5 10h14M10 10v9",
  wire: "M3 12h4l2-6 4 12 2-6h6",
  wallet: "M4 7h16v12H4zM4 7l3-3h10M15 13h5",
  offers: "M4 5h16v11H9l-5 4zM8 10h8",
  deals: "M4 6h5v12H4zM10 6h5v8h-5zM16 6h4v5h-4z",
  earnings: "M12 4v16M8 8c0-2 8-2 8 0s-8 2-8 4 8 2 8 0",
  kit: "M6 4h12v16H6zM9 9h6M9 13h6M9 17h3",
  bell: "M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M8 5l8 7-8 7",
  arrow: "M4 12h15M13 6l6 6-6 6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
