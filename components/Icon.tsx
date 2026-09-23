/**
 * The site's standalone icons, drawn as one family: 2px stroke, square caps and
 * joins (the sharp-corner brand), currentColor. Arrows that sit inside a text
 * label ("Start a project →") stay typographic — they are part of the words.
 */
const PATHS = {
  menu: "M2.5 4h11M2.5 8h11M2.5 12h11",
  close: "M4 4l8 8M12 4l-8 8",
  plus: "M8 3v10M3 8h10",
  "arrow-up": "M8 13V3M3.5 7.5 8 3l4.5 4.5",
  "arrow-right": "M3 8h10M8.5 3.5 13 8l-4.5 4.5",
  check: "M4 8.5 7 11.5 12.5 5",
  "chevron-down": "M4 6l4 4 4-4",
} as const;

export type IconName = keyof typeof PATHS;

type Props = {
  readonly name: IconName;
  readonly className?: string;
};

export default function Icon({ name, className = "size-4" }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="none">
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
