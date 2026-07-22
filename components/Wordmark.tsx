/* eslint-disable @next/next/no-img-element */

/** Intrinsic aspect of the wordmark SVGs (viewBox 801.9 × 521.9). */
const ASPECT = 801.9 / 521.9;

type Props = {
  variant?: "white" | "black";
  /** Rendered height in px; width follows the mark's aspect ratio. */
  height?: number;
  className?: string;
};

/**
 * Plain <img> rather than next/image: these are two tiny static SVGs, so the
 * optimizer has nothing to do and would only add a runtime wrapper.
 */
export default function Wordmark({ variant = "white", height = 22, className }: Props) {
  return (
    <img
      src={`/myndstack-wordmark-${variant}.svg`}
      alt="Myndstack"
      width={Math.round(height * ASPECT)}
      height={height}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
