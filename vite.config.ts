import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";
import { cloudflare } from "@cloudflare/vite-plugin";

const entryLoadRecovery = {
  name: "papertrip-entry-load-recovery",
  transformIndexHtml: {
    order: "post" as const,
    handler(html: string) {
      return html.replace(
        /<script type="module"([^>]*\ssrc="\/assets\/[^"]+"[^>]*)><\/script>/,
        (tag) =>
          tag.includes("onerror=")
            ? tag
            : tag.replace(
                "></script>",
                ' onerror="window.__papertripAssetLoadFailed &amp;&amp; window.__papertripAssetLoadFailed()"></script>',
              ),
      );
    },
  },
};

// https://vite.dev/config/
export default defineConfig({
  build: {
    // WebKit can retain a failed modulepreload as a poisoned resource and then
    // refuse to request it again. Normal ESM imports cost a little eagerness
    // but recover correctly after a reload.
    modulePreload: false,
    rollupOptions: {
      output: {
        // "b2" generation salt: rotates every built asset URL. Bumped to
        // evict clients whose HTTP cache holds corrupt copies of the
        // immutable /assets/* files (WKWebView serves them without
        // revalidating, so only a new URL can bypass a poisoned entry).
        entryFileNames: "assets/[name]-[hash]-b2.js",
        chunkFileNames: "assets/[name]-[hash]-b2.js",
        assetFileNames: "assets/[name]-[hash]-b2[extname]",
      },
    },
  },
  plugins: [
    entryLoadRecovery,
    cloudflare(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
