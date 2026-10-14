# Motion to JSON

A Figma plugin that reads **Figma Motion** animations (timelines, applied animation
styles, and keyframe tracks) off the current selection and exports them as a
**MotionSpec** JSON file — a normalized, self-describing format designed to be
handed to an AI so it can turn the animation back into code.

This replaces the gradient/CSS behaviour of the plugin it was copied from. The
original plugin is untouched.

## What it exports

Pick a layer, run the plugin, and you get:

```jsonc
{
  "motionspec": "2.0",
  "generator": { "plugin": "figma-motion-to-json", "version": "1.0.0", "exportedAt": "..." },
  "source": { "fileName": "…", "pageName": "…", "fps": 60, "selection": ["1:23"] },
  "scene": {
    "frame":    { "id": "1:23", "name": "Card", "width": 320, "height": 200 },
    "timeline": { "id": "…", "duration": 1.2, "durationFrames": 72 },
    "nodes": [
      {
        "id": "1:24", "name": "Icon", "type": "VECTOR",
        "path": "Card / Icon", "parentId": "1:23",
        "bounds": { "x": 12, "y": 8, "width": 24, "height": 24 },
        "appliedStyles": [
          { "type": "FIGMA", "name": "Fade in", "styleId": "…",
            "duration": 0.6, "durationFrames": 36, "timelineOffset": 0, "props": {} }
        ],
        "tracks": [
          {
            "property": "OPACITY",
            "baseValue": { "type": "FLOAT", "value": 0 },
            "duration": 0.6, "durationFrames": 36,
            "operations": [
              { "id": "t1", "operation": "SET", "keyframes": [
                { "id": "k1", "at": 0,   "atFrame": 0,  "easing": { "type": "EASE_OUT" },
                  "value": { "type": "FLOAT", "value": 0 } },
                { "id": "k2", "at": 0.6, "atFrame": 36, "easing": { "type": "EASE_IN_AND_OUT" },
                  "value": { "type": "FLOAT", "value": 1 } }
              ]}
            ]
          }
        ]
      }
    ]
  },
  "legend": { "notes": [], "units": {}, "operations": {}, "easings": {}, "valueTypes": {}, "indexedCollections": {} },
  "_raw": { "frame": {}, "nodes": [] }
}
```

### Design decisions

- **Seconds and frames.** Figma's Motion timeline is in seconds. Every moment is
  duplicated as `atFrame`, derived from the `fps` set in the UI (default 60), so
  the file reads like a timeline either way.
- **Flat nodes.** `scene.nodes` is a flat list, not a tree. `path` gives the
  hierarchy (and the selector to generate), `parentId` links back to the parent.
- **`legend`.** Auto-generated from what the export actually contains: property
  units, what `SET`/`OFFSET`/`SCALE` mean, easing behaviour, value types, and how
  indexed collections work. This is the part that makes the file legible to an
  AI rather than just parseable.
- **`_raw`.** Off by default so the export stays lean. Tick *Raw data* to embed
  the untouched Figma payload (a lossless escape hatch).
- **Json presets are honest.** `GENTLE`, `QUICK`, `BOUNCY` and `SLOW` have no
  published curve, so the legend says to approximate them. `CUSTOM_CUBIC_BEZIER`
  and `CUSTOM_SPRING` carry their real values.

## UI

- **Copy JSON** — the MotionSpec, pretty-printed.
- **Copy prompt** — the MotionSpec wrapped in instructions for an AI. Edit the
  `Requested output:` line to pick a target (CSS `@keyframes`, GSAP, Framer
  Motion, Web Animations API, …).
- **Download** — saves `<frame-name>.motion.json`.
- **FPS** and **Raw data** controls re-export on change.

## Getting started

```sh
npm install
npm run build     # or: npm start  (watch mode)
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** and pick
`manifest.json`.

> The plugin `id` in `manifest.json` is a placeholder. Create the plugin in
> Figma first (**Plugins → Development → New plugin…**) and paste the real id in
> before publishing.

## Project layout

```
src/code/code.ts              plugin entry: walks the selection, posts the spec
src/code/motion/collect.ts    reads Figma nodes into plain data
src/code/motion/spec.ts       pure node-tree -> MotionSpec transform + legend
src/code/motion/types.ts      local mirror of the Figma Motion API types
src/ui/                       Vue UI: preview, copy, prompt, download
```

`spec.ts` is deliberately pure — it takes plain data and returns plain data, so
it is unit tested without a `figma` global.

## Tests

```sh
npm test          # vitest, 15 cases over the transform
npm run typecheck # tsc --noEmit
```

`vitest` is pinned to `0.22.x` because this project still builds with Vite 2.
If you upgrade Vite, you can upgrade vitest too.

## Caveats

- **The Figma Motion API is in Beta** and is documented as subject to change.
  All reads go through optional access and duck-typing, so a node without Motion
  data degrades to an empty export instead of throwing — but a future API change
  may still require updates here.
- Only the **current selection** is exported. Motion timelines live on frames, so
  the containing frame is resolved automatically and its timeline is included.
- **Download** depends on the plugin iframe allowing blob downloads. If nothing
  saves, use **Copy JSON** — it always works.
