/**
 * The soft flowing backdrop for the StackStory → Studio(Team) run — a handful of
 * large, slowly drifting lime glows over the ink, no grid and no dots.
 *
 * Pure CSS (styles + `auroraDrift*` keyframes live in globals.css), so it's a
 * plain server component with nothing to hydrate. A zero-height `sticky` anchor
 * pins a viewport-sized layer to the top of the screen through the run, so the
 * glow is uniform everywhere rather than pooling behind the tall pinned
 * StackStory; the layer sits at a negative z-index behind every section and
 * clips its own blobs. The run wrapper stays clip-free so StackStory's
 * `position: sticky` survives. Under reduced motion the global duration override
 * freezes the drift into a static gradient.
 */
export default function Aurora() {
  return (
    <div className="aurora-anchor" aria-hidden="true">
      <div className="aurora">
        <span className="aurora-blob aurora-1" />
        <span className="aurora-blob aurora-2" />
        <span className="aurora-blob aurora-3" />
        <span className="aurora-blob aurora-4" />
        <span className="aurora-blob aurora-5" />
      </div>
    </div>
  );
}
