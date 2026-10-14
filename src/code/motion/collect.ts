import type { MotionCapableNode, Timeline } from "./types";
import type { Bounds, SceneFrame, SourceNode } from "./spec";

/**
 * Reads the Motion data off a Figma node.
 *
 * Everything goes through optional access and duck-typing because the Motion
 * API is in Beta: a node may predate it, and a future version may add or drop
 * properties. A missing property has to degrade gracefully, never throw.
 */
const motionView = (node: SceneNode): MotionCapableNode =>
  node as unknown as MotionCapableNode;

export const hasMotionData = (node: SceneNode): boolean => {
  const view = motionView(node);

  if (view.animationStyles && view.animationStyles.length > 0) {
    return true;
  }

  if (!view.animations) {
    return false;
  }

  return Object.values(view.animations).some((value) => value !== undefined);
};

const pathOf = (node: SceneNode): string => {
  const parts: string[] = [node.name];
  let parent: BaseNode | null = node.parent;

  while (parent && !isRootContainer(parent)) {
    parts.unshift((parent as { name?: string }).name ?? "");
    parent = parent.parent;
  }

  return parts.join(" / ");
};

const parentIdOf = (node: SceneNode): string | null => {
  const parent = node.parent;

  if (!parent || isRootContainer(parent)) {
    return null;
  }

  return parent.id;
};

const isRootContainer = (node: BaseNode): boolean => {
  const type = (node as { type?: string }).type;
  return type === "PAGE" || type === "DOCUMENT";
};

const boundsOf = (node: SceneNode): Bounds | undefined => {
  const geometry = node as unknown as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };

  if (typeof geometry.width !== "number" || typeof geometry.height !== "number") {
    return undefined;
  }

  return {
    x: geometry.x ?? 0,
    y: geometry.y ?? 0,
    width: geometry.width,
    height: geometry.height,
  };
};

const descendantsOf = (node: SceneNode): SceneNode[] => {
  const findAll = (
    node as unknown as {
      findAll?: (callback: (child: SceneNode) => boolean) => SceneNode[];
    }
  ).findAll;

  if (typeof findAll !== "function") {
    return [];
  }

  try {
    return findAll.call(node, () => true) ?? [];
  } catch {
    return [];
  }
};

const topLevelFrameOf = (node: SceneNode): SceneNode | null => {
  const getTopLevelFrame = (
    node as unknown as { getTopLevelFrame?: () => SceneNode | null }
  ).getTopLevelFrame;

  if (typeof getTopLevelFrame !== "function") {
    return null;
  }

  try {
    return getTopLevelFrame.call(node) ?? null;
  } catch {
    return null;
  }
};

export interface CollectedSelection {
  readonly frame: SceneFrame;
  readonly nodes: SourceNode[];
}

/**
 * Flatten the selection into plain data: the containing frame plus every node
 * under it that actually carries Motion data.
 */
export const collectSelection = (
  selection: readonly SceneNode[]
): CollectedSelection | null => {
  if (selection.length === 0) {
    return null;
  }

  const frameNode = topLevelFrameOf(selection[0]) ?? selection[0];
  const seen = new Set<string>();
  const nodes: SourceNode[] = [];

  for (const root of selection) {
    for (const node of [root, ...descendantsOf(root)]) {
      if (seen.has(node.id) || !hasMotionData(node)) {
        continue;
      }

      seen.add(node.id);

      nodes.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: pathOf(node),
        parentId: parentIdOf(node),
        bounds: boundsOf(node),
        animations: motionView(node).animations,
        animationStyles: motionView(node).animationStyles,
      });
    }
  }

  const frameGeometry = frameNode as unknown as {
    width?: number;
    height?: number;
  };

  const timelines: ReadonlyArray<Timeline> = motionView(frameNode).timelines ?? [];

  return {
    frame: {
      id: frameNode.id,
      name: frameNode.name,
      width: frameGeometry.width ?? 0,
      height: frameGeometry.height ?? 0,
      timelines,
    },
    nodes,
  };
};
