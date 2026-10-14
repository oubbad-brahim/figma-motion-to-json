import type {
  Animations,
  AppliedAnimationStyle,
  EasingName,
  IndexedKeyframeBinding,
  KeyframeBinding,
  KeyframePropertyFieldName,
  KeyframeValue,
  ManualKeyframe,
  ManualKeyframeTrack,
  MotionEasing,
  Timeline,
  VariableAlias,
} from "./types";

export const MOTION_SPEC_VERSION = "2.0";
export const PLUGIN_NAME = "figma-motion-to-json";
export const PLUGIN_VERSION = "1.0.0";
export const DEFAULT_FPS = 60;

/* ------------------------------------------------------------------ input */

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A Figma node flattened into plain data, so the transform stays pure. */
export interface SourceNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly path: string;
  readonly parentId: string | null;
  readonly bounds?: Bounds;
  readonly animations?: Animations;
  readonly animationStyles?: ReadonlyArray<AppliedAnimationStyle>;
}

export interface SceneFrame {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly timelines: ReadonlyArray<Timeline>;
}

export interface BuildOptions {
  readonly fps?: number;
  readonly fileName?: string;
  readonly pageName?: string;
  readonly selection?: readonly string[];
  readonly includeRaw?: boolean;
  readonly exportedAt?: string;
}

/* ----------------------------------------------------------------- output */

export type SpecEasing = MotionEasing | VariableAlias;

export interface SpecKeyframe {
  readonly id: string;
  /** Seconds, matching Figma's timeline. */
  readonly at: number;
  /** `at` converted to frames at `source.fps`. */
  readonly atFrame: number;
  readonly easing: SpecEasing;
  readonly value: KeyframeValue;
}

export interface SpecOperation {
  readonly id: string;
  readonly operation: ManualKeyframeTrack["keyframeOperation"];
  readonly keyframes: SpecKeyframe[];
}

export interface SpecKeyframeBinding {
  readonly baseValue: KeyframeValue;
  readonly duration: number;
  readonly durationFrames: number;
  readonly operations: SpecOperation[];
}

/**
 * Fields are optional because the Figma API genuinely allows a track to exist
 * as either direct keyframes, component-property bindings, or both.
 */
export interface SpecTrack {
  readonly property: string;
  /** Set when the property comes from an indexed collection (fills/strokes/effects). */
  readonly index?: number;
  /** Set when an indexed entry is animated per-field (e.g. an effect's RADIUS). */
  readonly field?: string;
  readonly baseValue?: KeyframeValue;
  readonly duration?: number;
  readonly durationFrames?: number;
  readonly operations?: SpecOperation[];
  readonly componentProperties?: Record<string, SpecKeyframeBinding>;
}

export interface SpecAppliedStyle {
  readonly type: "FIGMA" | "CUSTOM";
  readonly id: string;
  readonly styleId: string;
  readonly name: string;
  readonly description?: string;
  readonly duration?: number;
  readonly durationFrames?: number;
  readonly timelineOffset?: number;
  readonly timelineOffsetFrames?: number;
  readonly props?: Record<string, unknown>;
}

export interface SpecNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly path: string;
  readonly parentId: string | null;
  readonly bounds?: Bounds;
  readonly appliedStyles: SpecAppliedStyle[];
  readonly tracks: SpecTrack[];
}

export interface SpecLegend {
  readonly notes: string[];
  readonly units: Record<string, string>;
  readonly operations: Record<string, string>;
  readonly easings: Record<string, string>;
  readonly valueTypes: Record<string, string>;
  readonly indexedCollections: Record<string, string>;
}

export interface MotionSpec {
  readonly motionspec: string;
  readonly generator: {
    readonly plugin: string;
    readonly version: string;
    readonly exportedAt: string;
  };
  readonly source: {
    readonly fileName: string;
    readonly pageName: string;
    readonly fps: number;
    readonly selection: string[];
  };
  readonly scene: {
    readonly frame: {
      readonly id: string;
      readonly name: string;
      readonly width: number;
      readonly height: number;
    };
    readonly timeline: {
      readonly id: string;
      readonly duration: number;
      readonly durationFrames: number;
    } | null;
    readonly nodes: SpecNode[];
  };
  readonly legend: SpecLegend;
  _raw?: {
    readonly frame: { readonly timelines: ReadonlyArray<Timeline> };
    readonly nodes: ReadonlyArray<{
      readonly id: string;
      readonly path: string;
      readonly animations: Animations;
      readonly animationStyles: ReadonlyArray<AppliedAnimationStyle>;
    }>;
  };
}

/* ------------------------------------------------------------- the legend */

const PROPERTY_UNITS: Record<KeyframePropertyFieldName, string> = {
  CORNER_RADIUS: "px",
  STROKE_WEIGHT: "px",
  STACK_SPACING: "px",
  STACK_PADDING_LEFT: "px",
  STACK_PADDING_TOP: "px",
  STACK_PADDING_RIGHT: "px",
  STACK_PADDING_BOTTOM: "px",
  WIDTH: "px",
  HEIGHT: "px",
  RECTANGLE_TOP_LEFT_CORNER_RADIUS: "px",
  RECTANGLE_TOP_RIGHT_CORNER_RADIUS: "px",
  RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: "px",
  RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: "px",
  BORDER_TOP_WEIGHT: "px",
  BORDER_BOTTOM_WEIGHT: "px",
  BORDER_LEFT_WEIGHT: "px",
  BORDER_RIGHT_WEIGHT: "px",
  STACK_COUNTER_SPACING: "px",
  OPACITY: "0-1",
  GRID_ROW_GAP: "px",
  GRID_COLUMN_GAP: "px",
  TRANSLATION_X: "px offset from the node's base position",
  TRANSLATION_Y: "px offset from the node's base position",
  TRANSLATION_XY: "{ x, y } px offsets from the node's base position",
  ROTATION: "degrees",
  SCALE_X: "multiplier, 1 = 100%",
  SCALE_Y: "multiplier, 1 = 100%",
  SCALE_XY: "{ x, y } multipliers, 1 = 100%",
  PATH_TRIM_START: "0-1 fraction along the path",
  PATH_TRIM_END: "0-1 fraction along the path",
};

const OPERATION_HINTS: Record<ManualKeyframeTrack["keyframeOperation"], string> = {
  SET: "the keyframe value replaces the base value",
  OFFSET: "the keyframe value is added to the base value",
  SCALE: "the base value is multiplied by the keyframe value",
};

const EASING_HINTS: Record<EasingName | "VARIABLE_ALIAS", string> = {
  LINEAR: "constant speed (CSS: linear)",
  EASE_IN: "accelerates from rest (CSS: ease-in)",
  EASE_OUT: "decelerates to rest (CSS: ease-out)",
  EASE_IN_AND_OUT: "accelerates then decelerates (CSS: ease-in-out)",
  EASE_IN_BACK: "anticipates before moving (dips past the start value)",
  EASE_OUT_BACK: "overshoots the target value, then settles",
  EASE_IN_AND_OUT_BACK: "anticipates at the start and overshoots at the end",
  GENTLE: "Figma preset - has no published curve, approximate it",
  QUICK: "Figma preset - has no published curve, approximate it",
  BOUNCY: "Figma preset - has no published curve, approximate it",
  SLOW: "Figma preset - has no published curve, approximate it",
  CUSTOM_CUBIC_BEZIER:
    "exact curve - read easing.easingFunctionCubicBezier { x1, y1, x2, y2 }",
  CUSTOM_SPRING:
    "spring - read easing.easingFunctionSpring.bounce (0-1); 0 is stiff, 1 is very bouncy",
  HOLD: "hold the current value until the next keyframe",
  VARIABLE_ALIAS:
    "easing comes from a Figma variable; its id is given, the curve is not inlined",
};

const VALUE_TYPE_HINTS: Record<KeyframeValue["type"], string> = {
  FLOAT: "number",
  COLOR: "RGBA, channels 0-1, { r, g, b, a }",
  TEXT_DATA: "string",
  VECTOR: "vector data",
  BOOL: "boolean",
  CIRCLE: "{ x, y, radius }",
  LINE: "{ x, y, x2, y2 }",
  CIRCLE_POINT: "{ x, y, radius, angle }",
  COLOR_POINT: "{ x, y, color }",
};

const COLLECTION_HINTS: Record<string, string> = {
  fills:
    "keyed by fill index on the node; `index` says which fill the track animates",
  strokes:
    "keyed by stroke index on the node; `index` says which stroke the track animates",
  effects:
    "keyed by effect index on the node; `index` says which effect the track animates",
};

const LEGEND_NOTES: readonly string[] = [
  "Times (`at`) are in seconds; `atFrame` is the same moment at `source.fps` frames per second.",
  "`duration` and `durationFrames` describe how long a binding runs, not when it starts.",
  "The easing on a keyframe governs the segment from that keyframe to the next one.",
  "Figma preset easings (GENTLE, QUICK, BOUNCY, SLOW) have no published curve; approximate them or swap in a CUSTOM_SPRING.",
  "`scene.nodes` is a flat list. Use `path` for the layer hierarchy and build the selector from it.",
];

/* --------------------------------------------------------------- helpers */

const round = (value: number, decimals = 4): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const seconds = (value: number | undefined): number | undefined =>
  value === undefined ? undefined : round(value);

const frames = (value: number | undefined, fps: number): number | undefined =>
  value === undefined ? undefined : Math.round(value * fps);

/** Duck-type test for a real `KeyframeBinding`. */
const isBinding = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as { tracks?: unknown }).tracks);

const pick = (
  source: Record<string, string>,
  keys: ReadonlySet<string>
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const hint = source[key];
    if (hint !== undefined) {
      result[key] = hint;
    }
  }
  return result;
};

/* ------------------------------------------------------------- transform */

const normalizeKeyframe = (keyframe: ManualKeyframe, fps: number): SpecKeyframe => ({
  id: keyframe.id,
  at: round(keyframe.timelinePosition),
  atFrame: Math.round(keyframe.timelinePosition * fps),
  easing: keyframe.easing,
  value: keyframe.value,
});

const normalizeBinding = (binding: KeyframeBinding, fps: number): SpecKeyframeBinding => {
  const timelineDuration = binding.timelineDuration ?? 0;

  return {
    baseValue: binding.baseValue,
    duration: round(timelineDuration),
    durationFrames: Math.round(timelineDuration * fps),
    operations: (binding.tracks ?? []).map((track) => ({
      id: track.id,
      operation: track.keyframeOperation,
      keyframes: (track.keyframes ?? []).map((keyframe) =>
        normalizeKeyframe(keyframe, fps)
      ),
    })),
  };
};

const normalizeIndexedBinding = (
  collection: "fills" | "strokes" | "effects",
  index: number,
  value: IndexedKeyframeBinding,
  fps: number
): SpecTrack[] => {
  const record = value as unknown as Record<string, unknown>;

  if (isBinding(record)) {
    return [
      {
        property: collection,
        index,
        ...normalizeBinding(record as unknown as KeyframeBinding, fps),
      },
    ];
  }

  const rawProps = record.properties as
    | Record<string, KeyframeBinding>
    | undefined;

  const componentProperties = rawProps
    ? Object.fromEntries(
        Object.entries(rawProps).map(([name, binding]) => [
          name,
          normalizeBinding(binding, fps),
        ])
      )
    : undefined;

  // For effects the record can also carry one binding per effect field.
  const fieldEntries = Object.entries(record).filter(
    ([key, fieldValue]) => key !== "properties" && isBinding(fieldValue)
  );

  if (fieldEntries.length === 0) {
    return componentProperties
      ? [{ property: collection, index, componentProperties }]
      : [];
  }

  return fieldEntries.map(([field, fieldValue]) => {
    const track: SpecTrack = {
      property: collection,
      index,
      field,
      ...normalizeBinding(fieldValue as unknown as KeyframeBinding, fps),
    };

    return componentProperties ? { ...track, componentProperties } : track;
  });
};

const normalizeAnimations = (
  animations: Animations | undefined,
  fps: number
): SpecTrack[] => {
  if (!animations) {
    return [];
  }

  const tracks: SpecTrack[] = [];

  for (const [key, value] of Object.entries(
    animations as unknown as Record<string, unknown>
  )) {
    if (value === undefined || value === null) {
      continue;
    }

    if (key === "fills" || key === "strokes" || key === "effects") {
      for (const [index, binding] of Object.entries(
        value as Record<string, IndexedKeyframeBinding>
      )) {
        tracks.push(
          ...normalizeIndexedBinding(key, Number(index), binding, fps)
        );
      }
      continue;
    }

    if (isBinding(value)) {
      tracks.push({
        property: key,
        ...normalizeBinding(value as unknown as KeyframeBinding, fps),
      });
    }
  }

  return tracks;
};

const normalizeStyle = (
  style: AppliedAnimationStyle,
  fps: number
): SpecAppliedStyle => {
  if (style.type === "FIGMA") {
    return {
      type: "FIGMA",
      id: style.id,
      styleId: style.styleId,
      name: style.name,
      description: style.description,
      duration: seconds(style.duration),
      durationFrames: frames(style.duration, fps),
      timelineOffset: seconds(style.timelineOffset),
      timelineOffsetFrames: frames(style.timelineOffset, fps),
      props: style.props as Record<string, unknown> | undefined,
    };
  }

  return {
    type: "CUSTOM",
    id: style.id,
    styleId: style.styleId,
    name: style.name,
    timelineOffset: seconds(style.timelineOffset),
    timelineOffsetFrames: frames(style.timelineOffset, fps),
  };
};

const buildLegend = (nodes: readonly SpecNode[]): SpecLegend => {
  const units = new Set<string>();
  const operations = new Set<string>();
  const easings = new Set<string>();
  const valueTypes = new Set<string>();
  const indexedCollections = new Set<string>();

  const readOperations = (ops: readonly SpecOperation[]) => {
    for (const operation of ops) {
      operations.add(operation.operation);
      for (const keyframe of operation.keyframes) {
        easings.add(keyframe.easing.type);
        valueTypes.add(keyframe.value.type);
      }
    }
  };

  for (const node of nodes) {
    for (const track of node.tracks) {
      if (track.index !== undefined) {
        indexedCollections.add(track.property);
      }

      if (PROPERTY_UNITS[track.property as KeyframePropertyFieldName]) {
        units.add(track.property);
      }

      if (track.baseValue) {
        valueTypes.add(track.baseValue.type);
      }

      readOperations(track.operations ?? []);

      for (const binding of Object.values(track.componentProperties ?? {})) {
        valueTypes.add(binding.baseValue.type);
        readOperations(binding.operations);
      }
    }
  }

  return {
    notes: [...LEGEND_NOTES],
    units: pick(PROPERTY_UNITS as Record<string, string>, units),
    operations: pick(OPERATION_HINTS as Record<string, string>, operations),
    easings: pick(EASING_HINTS as Record<string, string>, easings),
    valueTypes: pick(VALUE_TYPE_HINTS as Record<string, string>, valueTypes),
    indexedCollections: pick(COLLECTION_HINTS, indexedCollections),
  };
};

/**
 * Turn Figma Motion data into a MotionSpec.
 *
 * Pure on purpose: it takes plain data and returns plain data, so it can be
 * unit tested without a `figma` global.
 */
export const buildMotionSpec = (
  frame: SceneFrame,
  nodes: readonly SourceNode[],
  options: BuildOptions = {}
): MotionSpec => {
  const fps =
    options.fps !== undefined && options.fps > 0 ? options.fps : DEFAULT_FPS;

  const specNodes: SpecNode[] = nodes.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    path: node.path,
    parentId: node.parentId,
    bounds: node.bounds,
    appliedStyles: (node.animationStyles ?? []).map((style) =>
      normalizeStyle(style, fps)
    ),
    tracks: normalizeAnimations(node.animations, fps),
  }));

  const primaryTimeline = frame.timelines[0];

  const spec: MotionSpec = {
    motionspec: MOTION_SPEC_VERSION,
    generator: {
      plugin: PLUGIN_NAME,
      version: PLUGIN_VERSION,
      exportedAt: options.exportedAt ?? new Date().toISOString(),
    },
    source: {
      fileName: options.fileName ?? "",
      pageName: options.pageName ?? "",
      fps,
      selection: [...(options.selection ?? [])],
    },
    scene: {
      frame: {
        id: frame.id,
        name: frame.name,
        width: round(frame.width),
        height: round(frame.height),
      },
      timeline: primaryTimeline
        ? {
            id: primaryTimeline.id,
            duration: round(primaryTimeline.duration),
            durationFrames: Math.round(primaryTimeline.duration * fps),
          }
        : null,
      nodes: specNodes,
    },
    legend: buildLegend(specNodes),
  };

  if (options.includeRaw) {
    spec._raw = {
      frame: { timelines: frame.timelines },
      nodes: nodes.map((node) => ({
        id: node.id,
        path: node.path,
        animations: node.animations ?? {},
        animationStyles: node.animationStyles ?? [],
      })),
    };
  }

  return spec;
};
