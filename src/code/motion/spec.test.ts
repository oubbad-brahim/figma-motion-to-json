import { describe, expect, it } from "vitest";
import { buildMotionSpec, DEFAULT_FPS } from "./spec";
import type { SceneFrame, SourceNode, SpecTrack } from "./spec";
import type { Animations } from "./types";

const frame = (overrides: Partial<SceneFrame> = {}): SceneFrame => ({
  id: "1:1",
  name: "Card",
  width: 320,
  height: 200,
  timelines: [{ id: "tl-1", duration: 1.2 }],
  ...overrides,
});

const node = (overrides: Partial<SourceNode> = {}): SourceNode => ({
  id: "1:2",
  name: "Icon",
  type: "VECTOR",
  path: "Card / Icon",
  parentId: "1:1",
  ...overrides,
});

const opacityAnimation: Animations = {
  OPACITY: {
    baseValue: { type: "FLOAT", value: 0 },
    timelineDuration: 0.6,
    tracks: [
      {
        id: "t1",
        keyframeOperation: "SET",
        keyframes: [
          {
            id: "k1",
            timelinePosition: 0,
            easing: { type: "EASE_OUT" },
            value: { type: "FLOAT", value: 0 },
          },
          {
            id: "k2",
            timelinePosition: 0.6,
            easing: { type: "EASE_IN_AND_OUT" },
            value: { type: "FLOAT", value: 1 },
          },
        ],
      },
    ],
  },
};

const build = (nodes: SourceNode[], options = {}) =>
  buildMotionSpec(frame(), nodes, { exportedAt: "2026-01-01T00:00:00.000Z", ...options });

const trackOf = (spec: ReturnType<typeof build>, property: string): SpecTrack => {
  const track = spec.scene.nodes[0].tracks.find((t) => t.property === property);
  if (!track) {
    throw new Error(`no track for ${property}`);
  }
  return track;
};

describe("buildMotionSpec", () => {
  it("wraps the frame, timeline and generator metadata", () => {
    const spec = build([]);

    expect(spec.motionspec).toBe("2.0");
    expect(spec.source.fps).toBe(DEFAULT_FPS);
    expect(spec.scene.frame).toEqual({
      id: "1:1",
      name: "Card",
      width: 320,
      height: 200,
    });
    expect(spec.scene.timeline).toEqual({
      id: "tl-1",
      duration: 1.2,
      durationFrames: 72,
    });
  });

  it("reports a null timeline when the frame has none", () => {
    const spec = buildMotionSpec(frame({ timelines: [] }), []);

    expect(spec.scene.timeline).toBeNull();
  });

  it("converts seconds to frames using the requested fps", () => {
    const spec = build([node({ animations: opacityAnimation })], { fps: 30 });

    expect(spec.source.fps).toBe(30);
    expect(spec.scene.timeline?.durationFrames).toBe(36);
    expect(trackOf(spec, "OPACITY").durationFrames).toBe(18);
    expect(trackOf(spec, "OPACITY").operations?.[0].keyframes[1].atFrame).toBe(18);
  });

  it("keeps both seconds and frames on every keyframe", () => {
    const spec = build([node({ animations: opacityAnimation })]);
    const keyframes = trackOf(spec, "OPACITY").operations?.[0].keyframes ?? [];

    expect(keyframes.map((k) => [k.at, k.atFrame])).toEqual([
      [0, 0],
      [0.6, 36],
    ]);
    expect(keyframes[1].easing).toEqual({ type: "EASE_IN_AND_OUT" });
    expect(keyframes[1].value).toEqual({ type: "FLOAT", value: 1 });
  });

  it("preserves OFFSET and SCALE keyframe operations", () => {
    const animations: Animations = {
      TRANSLATION_Y: {
        baseValue: { type: "FLOAT", value: 12 },
        timelineDuration: 0.4,
        tracks: [
          {
            id: "t1",
            keyframeOperation: "OFFSET",
            keyframes: [
              {
                id: "k1",
                timelinePosition: 0,
                easing: { type: "LINEAR" },
                value: { type: "FLOAT", value: 20 },
              },
            ],
          },
          {
            id: "t2",
            keyframeOperation: "SCALE",
            keyframes: [
              {
                id: "k2",
                timelinePosition: 0.4,
                easing: { type: "LINEAR" },
                value: { type: "FLOAT", value: 2 },
              },
            ],
          },
        ],
      },
    };

    const track = trackOf(build([node({ animations })]), "TRANSLATION_Y");

    expect(track.baseValue).toEqual({ type: "FLOAT", value: 12 });
    expect(track.operations?.map((op) => op.operation)).toEqual(["OFFSET", "SCALE"]);
  });

  it("preserves spring and cubic-bezier easings", () => {
    const animations: Animations = {
      SCALE_XY: {
        baseValue: { type: "FLOAT", value: 1 },
        timelineDuration: 0.5,
        tracks: [
          {
            id: "t1",
            keyframeOperation: "SET",
            keyframes: [
              {
                id: "k1",
                timelinePosition: 0,
                easing: {
                  type: "CUSTOM_SPRING",
                  easingFunctionSpring: { bounce: 0.35 },
                },
                value: { type: "FLOAT", value: 1 },
              },
              {
                id: "k2",
                timelinePosition: 0.5,
                easing: {
                  type: "CUSTOM_CUBIC_BEZIER",
                  easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0.3, y2: 1 },
                },
                value: { type: "FLOAT", value: 1.4 },
              },
            ],
          },
        ],
      },
    };

    const keyframes =
      trackOf(build([node({ animations })]), "SCALE_XY").operations?.[0].keyframes ?? [];

    expect(keyframes[0].easing).toEqual({
      type: "CUSTOM_SPRING",
      easingFunctionSpring: { bounce: 0.35 },
    });
    expect(keyframes[1].easing).toEqual({
      type: "CUSTOM_CUBIC_BEZIER",
      easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0.3, y2: 1 },
    });
  });

  it("keeps variable-aliased easings intact", () => {
    const animations: Animations = {
      ROTATION: {
        baseValue: { type: "FLOAT", value: 0 },
        timelineDuration: 0.3,
        tracks: [
          {
            id: "t1",
            keyframeOperation: "SET",
            keyframes: [
              {
                id: "k1",
                timelinePosition: 0,
                easing: { type: "VARIABLE_ALIAS", id: "VariableID:9" },
                value: { type: "FLOAT", value: 90 },
              },
            ],
          },
        ],
      },
    };

    const keyframes =
      trackOf(build([node({ animations })]), "ROTATION").operations?.[0].keyframes ?? [];

    expect(keyframes[0].easing).toEqual({
      type: "VARIABLE_ALIAS",
      id: "VariableID:9",
    });
  });

  it("expands component-property driven fill bindings", () => {
    const animations: Animations = {
      fills: {
        0: {
          properties: {
            "Fill color": {
              baseValue: { type: "COLOR", value: { r: 1, g: 0, b: 0, a: 1 } },
              timelineDuration: 0.4,
              tracks: [
                {
                  id: "t1",
                  keyframeOperation: "SET",
                  keyframes: [
                    {
                      id: "k1",
                      timelinePosition: 0.4,
                      easing: { type: "LINEAR" },
                      value: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    const track = trackOf(build([node({ animations })]), "fills");

    expect(track.index).toBe(0);
    expect(track.baseValue).toBeUndefined();
    expect(Object.keys(track.componentProperties ?? {})).toEqual(["Fill color"]);
    expect(track.componentProperties?.["Fill color"].durationFrames).toBe(24);
  });

  it("expands per-field effect bindings", () => {
    const animations: Animations = {
      effects: {
        0: {
          RADIUS: {
            baseValue: { type: "FLOAT", value: 4 },
            timelineDuration: 0.5,
            tracks: [
              {
                id: "t1",
                keyframeOperation: "SET",
                keyframes: [
                  {
                    id: "k1",
                    timelinePosition: 0.5,
                    easing: { type: "LINEAR" },
                    value: { type: "FLOAT", value: 24 },
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const spec = build([node({ animations })]);
    const track = spec.scene.nodes[0].tracks[0];

    expect(track.property).toBe("effects");
    expect(track.field).toBe("RADIUS");
    expect(track.index).toBe(0);
    expect(track.baseValue).toEqual({ type: "FLOAT", value: 4 });
    expect(track.operations?.[0].keyframes[0].value).toEqual({
      type: "FLOAT",
      value: 24,
    });
    expect(spec.legend.indexedCollections.effects).toBeDefined();
  });

  it("labels FIGMA and CUSTOM applied styles", () => {
    const nodes = [
      node({
        animationStyles: [
          {
            type: "FIGMA",
            id: "s1",
            styleId: "figma-fade",
            name: "Fade in",
            duration: 0.5,
            timelineOffset: 0.25,
            props: { direction: "up" },
          },
          {
            type: "CUSTOM",
            id: "s2",
            styleId: "custom-1",
            name: "My spring",
            timelineOffset: 0.1,
          },
        ],
      }),
    ];

    const styles = build(nodes).scene.nodes[0].appliedStyles;

    expect(styles[0]).toEqual({
      type: "FIGMA",
      id: "s1",
      styleId: "figma-fade",
      name: "Fade in",
      description: undefined,
      duration: 0.5,
      durationFrames: 30,
      timelineOffset: 0.25,
      timelineOffsetFrames: 15,
      props: { direction: "up" },
    });

    expect(styles[1]).toEqual({
      type: "CUSTOM",
      id: "s2",
      styleId: "custom-1",
      name: "My spring",
      timelineOffset: 0.1,
      timelineOffsetFrames: 6,
    });
    expect(styles[1].duration).toBeUndefined();
  });

  it("derives the legend from what the export actually uses", () => {
    const spec = build([node({ animations: opacityAnimation })]);
    const { legend } = spec;

    expect(Object.keys(legend.units)).toEqual(["OPACITY"]);
    expect(Object.keys(legend.operations)).toEqual(["SET"]);
    expect(Object.keys(legend.easings).sort()).toEqual([
      "EASE_IN_AND_OUT",
      "EASE_OUT",
    ]);
    expect(Object.keys(legend.valueTypes)).toEqual(["FLOAT"]);
    expect(legend.indexedCollections).toEqual({});
    expect(legend.notes.length).toBeGreaterThan(0);
  });

  it("omits the legend entries that are not used", () => {
    const spec = build([]);

    expect(spec.legend.units).toEqual({});
    expect(spec.legend.operations).toEqual({});
    expect(spec.legend.easings).toEqual({});
    expect(spec.legend.valueTypes).toEqual({});
  });

  it("collects indexedCollections when indexed tracks are present", () => {
    const animations: Animations = {
      strokes: {
        1: {
          baseValue: { type: "FLOAT", value: 0 },
          timelineDuration: 0.2,
          tracks: [],
        },
      },
    };

    const spec = build([node({ animations })]);

    expect(spec.legend.indexedCollections).toEqual({ strokes: expect.any(String) });
  });

  it("only embeds the raw Figma payload when asked", () => {
    const nodes = [node({ animations: opacityAnimation })];

    expect(build(nodes)._raw).toBeUndefined();
    expect(build(nodes, { includeRaw: true })._raw).toBeDefined();
    expect(build(nodes, { includeRaw: true })._raw?.nodes[0].id).toBe("1:2");
  });

  it("produces no tracks for a node without animations", () => {
    const spec = build([node()]);

    expect(spec.scene.nodes[0].tracks).toEqual([]);
    expect(spec.scene.nodes[0].appliedStyles).toEqual([]);
  });
});
