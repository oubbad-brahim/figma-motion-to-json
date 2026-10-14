import "./assets/reset.css";
import "./assets/style.css";
import "highlight.js/styles/github-dark.css";

import { createApp } from "vue";
import ui from "./ui.vue";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import hljsVuePlugin from "@highlightjs/vue-plugin";

hljs.registerLanguage("json", json);

const app = createApp(ui);
app.use(hljsVuePlugin);
app.mount("#ui");
