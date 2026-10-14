export const writeTextToClipboard = (text: string) => {
  const prevActive = document.activeElement as HTMLElement;
  const textArea = document.createElement("textarea");

  textArea.value = text;

  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";

  document.body.appendChild(textArea);

  textArea.focus();
  textArea.select();

  return new Promise<void>((res, rej) => {
    document.execCommand("copy") ? res() : rej();
    textArea.remove();
    prevActive.focus();
  });
};

export const showToast = (message: string) => {
  parent.postMessage(
    { pluginMessage: { type: "toast-message", message } },
    "*"
  );
};

/**
 * Hands the JSON to the browser as a file download.
 *
 * Figma may sandbox this away, so the copy buttons stay the primary path.
 */
export const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};

/**
 * Wraps the spec in instructions an AI needs to turn it back into animation
 * code. Kept framework-agnostic on purpose.
 */
export const buildAiPrompt = (json: string, fps: number): string =>
  [
    "You are given a MotionSpec (version 2.0) exported from Figma Motion.",
    "",
    "Recreate this animation as code.",
    "Requested output: (edit this line - CSS @keyframes, GSAP timeline, Framer Motion variants, Web Animations API, ...)",
    "",
    "How to read it:",
    "- source.fps is the frame rate, currently " +
      fps +
      ". Every moment appears twice: 'at' in seconds and 'atFrame' in frames. Use whichever fits your target.",
    "- scene.frame is the animated container (id, name, width, height).",
    "- scene.nodes is a FLAT list of animated layers. 'path' gives the hierarchy (e.g. \"Card / Icon\") and 'parentId' points at the parent node id. Derive selectors from 'path'.",
    "- Each node's 'tracks' lists the animated properties. A track has 'baseValue', 'duration' / 'durationFrames', and 'operations'.",
    "- Inside an operation, 'keyframes' are ordered by 'at'. Each keyframe's 'easing' governs the segment from that keyframe to the next one.",
    "- 'operation' says how the values combine: SET replaces the base value, OFFSET adds to it, SCALE multiplies it.",
    "- 'appliedStyles' lists any named Figma animation styles applied to the layer.",
    "- 'legend' explains units, easing behaviour and value types for everything used in this export.",
    "",
    "Animate only what the spec describes. Keep the layer names as selectors.",
    "",
    "MotionSpec:",
    json,
  ].join("\n");
