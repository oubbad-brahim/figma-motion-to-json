/**
 * Local mirror of the Figma Motion plugin API types.
 *
 * The Motion API is still in Beta, so we describe the shapes we read ourselves
 * instead of depending on `@figma/plugin-typings` shipping them. Everything is
 * read through optional access, which keeps the plugin working (and compiling)
 * even if the API surface shifts underneath us.
 *
 * Source: https://developers.figma.com/docs/plugins/api/Motion/
 */

/** An easing can be aliased to a variable instead of being inlined. */
export interface VariableAlias {
  readonly type: "VARIABLE_ALIAS";
  readonly id: string;
}

export type EasingName =
  | "EASE_IN"
  | "EASE_OUT"
  | "EASE_IN_AND_OUT"
  | "LINEAR"
  | "EASE_IN_BACK"
  | "EASE_OUT_BACK"
  | "EASE_IN_AND_OUT_BACK"
  | "CUSTOM_CUBIC_BEZIER"
  | "GENTLE"
  | "QUICK"
  | "BOUNCY"
  | "SLOW"
  | "CUSTOM_SPRING"
  | "HOLD";

export interface EasingFunctionBezier {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface NormalizedSpring {
  readonly bounce: number;
}

export interface MotionEasing {
  readonly type: EasingName;
  readonly easingFunctionCubicBezier?: EasingFunctionBezier;
  readonly easingFunctionSpring?: NormalizedSpring;
}

export type KeyframeValue =
  | { readonly type: "FLOAT"; readonly value: number }
  | { readonly type: "COLOR"; readonly value: RGBA }
  | { readonly type: "TEXT_DATA"; readonly value: string }
  | { readonly type: "VECTOR"; readonly value: unknown }
  | { readonly type: "BOOL"; readonly value: boolean }
  | {
      readonly type: "CIRCLE";
      readonly value: { readonly x: number; readonly y: number; readonly radius: number };
    }
  | {
      readonly type: "LINE";
      readonly value: {
        readonly x: number;
        readonly y: number;
        readonly x2: number;
        readonly y2: number;
      };
    }
  | {
      readonly type: "CIRCLE_POINT";
      readonly value: {
        readonly x: number;
        readonly y: number;
        readonly radius: number;
        readonly angle: number;
      };
    }
  | {
      readonly type: "COLOR_POINT";
      readonly value: { readonly x: number; readonly y: number; readonly color: RGBA };
    };

export interface ManualKeyframe {
  readonly id: string;
  readonly timelinePosition: number;
  readonly easing: MotionEasing | VariableAlias;
  readonly value: KeyframeValue;
}

export interface ManualKeyframeTrack {
  readonly id: string;
  readonly keyframeOperation: "SET" | "OFFSET" | "SCALE";
  readonly keyframes: ReadonlyArray<ManualKeyframe>;
}

export interface KeyframeBinding {
  readonly baseValue: KeyframeValue;
  readonly timelineDuration: number;
  readonly tracks: ReadonlyArray<ManualKeyframeTrack>;
}

export type EffectKeyframeFieldName =
  | "OFFSET_X"
  | "OFFSET_Y"
  | "RADIUS"
  | "SPREAD"
  | "COLOR"
  | "REFRACTION_RADIUS"
  | "SPECULAR_ANGLE"
  | "SPECULAR_INTENSITY"
  | "CHROMATIC_ABERRATION"
  | "SPLAY"
  | "REFRACTION_INTENSITY"
  | "START_RADIUS"
  | "NOISE_SIZE_X"
  | "NOISE_SIZE_Y"
  | "DENSITY"
  | "EFFECT_OPACITY"
  | "SECONDARY_COLOR";

/**
 * `fills` / `strokes` / `effects` accept a binding directly, or delegate to a
 * component property, or (for effects) mix per-field tracks with a component
 * property. We keep the union open and duck-type it at read time.
 */
export type EffectKeyframeBindings = Partial<
  Record<EffectKeyframeFieldName, KeyframeBinding>
> & {
  readonly properties?: Record<string, KeyframeBinding>;
};

export type IndexedKeyframeBinding =
  | KeyframeBinding
  | { readonly properties: Record<string, KeyframeBinding> }
  | EffectKeyframeBindings;

export type KeyframePropertyFieldName =
  | "CORNER_RADIUS"
  | "STROKE_WEIGHT"
  | "STACK_SPACING"
  | "STACK_PADDING_LEFT"
  | "STACK_PADDING_TOP"
  | "STACK_PADDING_RIGHT"
  | "STACK_PADDING_BOTTOM"
  | "WIDTH"
  | "HEIGHT"
  | "RECTANGLE_TOP_LEFT_CORNER_RADIUS"
  | "RECTANGLE_TOP_RIGHT_CORNER_RADIUS"
  | "RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS"
  | "RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS"
  | "BORDER_TOP_WEIGHT"
  | "BORDER_BOTTOM_WEIGHT"
  | "BORDER_LEFT_WEIGHT"
  | "BORDER_RIGHT_WEIGHT"
  | "STACK_COUNTER_SPACING"
  | "OPACITY"
  | "GRID_ROW_GAP"
  | "GRID_COLUMN_GAP"
  | "TRANSLATION_X"
  | "TRANSLATION_Y"
  | "TRANSLATION_XY"
  | "ROTATION"
  | "SCALE_X"
  | "SCALE_Y"
  | "SCALE_XY"
  | "PATH_TRIM_START"
  | "PATH_TRIM_END";

export interface Animations
  extends Partial<Record<KeyframePropertyFieldName, KeyframeBinding>> {
  readonly fills?: Partial<Record<number, IndexedKeyframeBinding>>;
  readonly strokes?: Partial<Record<number, IndexedKeyframeBinding>>;
  readonly effects?: Partial<Record<number, IndexedKeyframeBinding>>;
}

export interface Timeline {
  readonly id: string;
  readonly duration: number;
}

export interface AppliedFigmaAnimationStyle {
  readonly type: "FIGMA";
  readonly id: string;
  readonly styleId: string;
  readonly name: string;
  readonly description?: string;
  readonly duration?: number;
  readonly timelineOffset?: number;
  readonly props?: { readonly [key: string]: unknown };
}

export interface AppliedCustomAnimationStyle {
  readonly type: "CUSTOM";
  readonly id: string;
  readonly styleId: string;
  readonly name: string;
  readonly timelineOffset?: number;
}

export type AppliedAnimationStyle =
  | AppliedFigmaAnimationStyle
  | AppliedCustomAnimationStyle;

/**
 * The Motion-aware view of a node. Kept as an optional intersection so we never
 * assume the properties exist on every node (or on older API versions).
 */
export interface MotionCapableNode {
  readonly animations?: Animations;
  readonly animationStyles?: ReadonlyArray<AppliedAnimationStyle>;
  readonly timelines?: ReadonlyArray<Timeline>;
}
