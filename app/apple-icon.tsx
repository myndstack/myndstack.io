import { iconResponse } from "@/lib/icon-mark";

/** iOS home-screen icon. 180 is the size iOS requests; it applies its own mask. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // Near full-bleed: the mark already carries ~10% internal margin, and iOS
  // rounds the corners itself, so it just needs a touch of breathing room.
  return iconResponse(180, 0.92);
}
