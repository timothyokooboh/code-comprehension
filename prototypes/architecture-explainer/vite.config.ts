import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import motionCanvas from "@motion-canvas/vite-plugin";
import { messages } from "./src/messages";
import content from "./src/content.json";
const maximumDurationSeconds = 180;
if (
  content.chapters.reduce((total, chapter) => total + chapter.duration, 0) >
  maximumDurationSeconds
)
  throw new Error(messages.tooLong);
export default defineConfig({
  plugins: [
    vue(),
    motionCanvas
      .default()
      .filter((plugin) => plugin.name !== "motion-canvas:editor"),
    {
      name: "prototype-page",
      transformIndexHtml: (html) => html.replace("__TITLE__", messages.title),
    },
    {
      name: "prototype-entry",
      config: () => ({
        build: { rollupOptions: { input: { index: "index.html" } } },
      }),
    },
  ],
  server: { host: "127.0.0.1", port: 5199, strictPort: true },
});
