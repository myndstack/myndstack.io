/**
 * Hand-authored monochrome brand glyphs (Lucide dropped brand icons).
 * All use `currentColor` so hover state is driven purely by the parent's colour.
 */

const PATHS: Record<string, React.ReactNode> = {
  X: (
    <path
      fill="currentColor"
      d="M18.244 2H21.5l-7.1 8.11L22.75 22h-6.56l-5.14-6.72L5.16 22H1.9l7.6-8.68L1.5 2h6.72l4.64 6.14L18.244 2zm-1.15 18h1.81L7.02 3.9H5.08L17.094 20z"
    />
  ),
  LinkedIn: (
    <path
      fill="currentColor"
      d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"
    />
  ),
  GitHub: (
    <path
      fill="currentColor"
      d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"
    />
  ),
  Instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="0" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </g>
  ),
};

export default function SocialIcon({ name, size }: { name: string; size?: number }) {
  const dimension = size ?? (name === "GitHub" ? 17 : 16);

  return (
    <svg width={dimension} height={dimension} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
