<script lang="ts" setup>
import { computed, ref } from "vue";
import {
  buildAiPrompt,
  downloadText,
  showToast,
  writeTextToClipboard,
} from "../utils";
import CopyIcon from "../icons/CopyIcon.vue";
import DownloadIcon from "../icons/DownloadIcon.vue";
import PromptIcon from "../icons/PromptIcon.vue";
import KoFiIcon from "../icons/KoFiIcon.vue";
import WebsiteIcon from "../icons/WebsiteIcon.vue";

interface PluginMessage {
  type?: string;
  spec?: unknown;
  hint?: string | null;
  fps?: number;
  includeRaw?: boolean;
}

const spec = ref<unknown>(null);
const hint = ref<string | null>(null);
const fps = ref(60);
const includeRaw = ref(false);

const hasSpec = computed(() => spec.value !== null);
const json = computed(() => JSON.stringify(spec.value ?? {}, null, 2));

const fileName = computed(() => {
  const name = (
    spec.value as { scene?: { frame?: { name?: string } } } | null
  )?.scene?.frame?.name;

  return name ? `${slug(name)}.motion.json` : "motion.json";
});

onmessage = (event: MessageEvent) => {
  const data = event.data?.pluginMessage as PluginMessage | undefined;

  if (!data || data.type !== "motion-spec") {
    return;
  }

  spec.value = data.spec ?? null;
  hint.value = data.hint ?? null;

  if (typeof data.fps === "number") {
    fps.value = data.fps;
  }

  if (typeof data.includeRaw === "boolean") {
    includeRaw.value = data.includeRaw;
  }
};

const pushOptions = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "options",
        fps: fps.value,
        includeRaw: includeRaw.value,
      },
    },
    "*"
  );
};

const copyJson = () => {
  writeTextToClipboard(json.value);
  showToast("MotionSpec copied");
};

const copyPrompt = () => {
  writeTextToClipboard(buildAiPrompt(json.value, fps.value));
  showToast("AI prompt copied");
};

const download = () => {
  downloadText(fileName.value, json.value);
  showToast("Downloaded " + fileName.value);
};

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "motion";
}
</script>

<template>
  <div class="container">
    <header class="toolbar">
      <div class="controls">
        <label class="control" title="Frame rate used for the atFrame values">
          <span>FPS</span>
          <select v-model.number="fps" @change="pushOptions">
            <option :value="24">24</option>
            <option :value="30">30</option>
            <option :value="60">60</option>
            <option :value="120">120</option>
          </select>
        </label>

        <label class="control" title="Also embed the untouched Figma Motion data">
          <input type="checkbox" v-model="includeRaw" @change="pushOptions" />
          <span>Raw data</span>
        </label>
      </div>
    </header>

    <div class="preview">
      <highlightjs v-if="hasSpec" language="json" :code="json" />
      <p v-else class="empty">
        {{ hint ?? "Select a layer that has Motion applied." }}
      </p>
    </div>

    <footer class="actions">
      <div class="actions-primary">
        <button class="btn" :disabled="!hasSpec" @click="copyJson">
          <CopyIcon />
          <span>Copy JSON</span>
        </button>
        <button class="btn" :disabled="!hasSpec" @click="copyPrompt">
          <PromptIcon />
          <span>Copy prompt</span>
        </button>
        <button class="btn" :disabled="!hasSpec" @click="download">
          <DownloadIcon />
          <span>Download</span>
        </button>
      </div>

      <div class="footer-actions">
        <a
          class="btn footer-link"
          href="https://ko-fi.com/oubbadbrahim"
          target="_blank"
          rel="noreferrer"
          title="Buy me a coffee"
        >
          <KoFiIcon />
          <span>Buy me a coffee</span>
        </a>
        <a
          class="btn footer-link"
          href="https://brahimoubbad.com"
          target="_blank"
          rel="noreferrer"
          title="See how to use"
        >
          <WebsiteIcon />
          <span>See how to use</span>
        </a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  flex-shrink: 0;
  padding: 0.8rem 1rem;
  border-bottom: 0.1rem solid #30363d;
}

.controls {
  display: flex;
  align-items: center;
  gap: 1.6rem;
}

.control {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.2rem;
  color: #8b949e;
  cursor: pointer;
}

.control select {
  border-radius: 0.4rem;
  border: 1px solid gray;
  background-color: var(--ebony-clay);
  color: inherit;
  padding: 0.2rem 0.4rem;
  font-size: 1.2rem;
  cursor: pointer;
}

.preview {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
}

.empty {
  color: #8b949e;
  font-size: 1.3rem;
}

.actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border-top: 0.1rem solid #30363d;
}

.actions-primary {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.4rem;
  border: 1px solid gray;
  padding: 0.4rem 0.6rem;
  font-size: 1.2rem;
  font-family: inherit;
  color: inherit;
  background-color: var(--ebony-clay);
  cursor: pointer;
  transition: 300ms;
}

.btn svg,
.btn img {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
}

.btn:disabled {
  color: gray;
  pointer-events: none;
  opacity: 0.5;
}

.btn:not(:disabled):hover {
  color: greenyellow;
  border-color: greenyellow;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn.footer-link {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.btn.footer-link > svg,
.btn.footer-link > img {
  width: 2rem;
  height: 2rem;
}

.btn.footer-link span {
  display: flex;
  align-items: center;
  max-width: 0;
  opacity: 0;
  white-space: nowrap;
  transition: 300ms ease-out;
}

.btn.footer-link:hover span {
  max-width: 15ch;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  opacity: 1;
}
</style>
