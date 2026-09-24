/**
 * The sheet's frame: two rails and "+" marks at the safe area's corners —
 * the drawing sheet every scene is set on. Fixed, decorative, pinned layout
 * only (layer 4).
 */
export default function Frame() {
  return (
    <div className="frame" aria-hidden="true">
      <span className="frame-rail frame-rail--l" />
      <span className="frame-rail frame-rail--r" />
      <span className="frame-mark frame-mark--tl" />
      <span className="frame-mark frame-mark--tr" />
      <span className="frame-mark frame-mark--bl" />
      <span className="frame-mark frame-mark--br" />
    </div>
  );
}
