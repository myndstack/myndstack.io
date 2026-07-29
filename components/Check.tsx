/**
 * Feature-list checkmark — replaces the `▸` text glyph that was standing in as
 * an icon across the marketing sections. Inherits `currentColor` so the parent
 * drives the colour (lime in feature lists). Sharp, thin stroke to match the
 * site's engineered look.
 */
export default function Check({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
    </svg>
  );
}
