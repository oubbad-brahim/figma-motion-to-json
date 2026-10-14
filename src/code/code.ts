import { collectSelection } from "./motion/collect";
import { buildMotionSpec, DEFAULT_FPS } from "./motion/spec";
import type { MotionSpec } from "./motion/spec";

interface UiMessage {
  type?: string;
  message?: string;
  fps?: number;
  includeRaw?: boolean;
}

interface UiOptions {
  fps: number;
  includeRaw: boolean;
}

let options: UiOptions = { fps: DEFAULT_FPS, includeRaw: false };

figma.showUI(__html__, { themeColors: true, width: 480, height: 600 });

figma.on("selectionchange", publish);
figma.on("documentchange", publish);

figma.ui.onmessage = (message: UiMessage) => {
  switch (message?.type) {
    case "toast-message":
      if (message.message) {
        figma.notify(message.message);
      }
      break;

    case "options":
      options = {
        fps:
          typeof message.fps === "number" && message.fps > 0
            ? message.fps
            : options.fps,
        includeRaw: Boolean(message.includeRaw),
      };
      publish();
      break;

    default:
      break;
  }
};

publish();

function publish(): void {
  const collected = collectSelection(figma.currentPage.selection);

  if (!collected) {
    post(null, "Select a layer that has Motion applied.");
    return;
  }

  const spec = buildMotionSpec(collected.frame, collected.nodes, {
    fps: options.fps,
    includeRaw: options.includeRaw,
    fileName: figma.root.name,
    pageName: figma.currentPage.name,
    selection: figma.currentPage.selection.map((node) => node.id),
  });

  post(
    spec,
    collected.nodes.length === 0
      ? "No Motion data found on this selection."
      : null
  );
}

function post(spec: MotionSpec | null, hint: string | null): void {
  figma.ui.postMessage({
    type: "motion-spec",
    spec,
    hint,
    fps: options.fps,
    includeRaw: options.includeRaw,
  });
}
