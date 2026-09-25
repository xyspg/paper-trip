import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  // The UI was written in Chinese first, so Chinese source text doubles as the
  // message id and English is the translated catalog.
  sourceLocale: "zh",
  locales: ["zh", "en"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src"],
    },
  ],
  // File-only origins keep unrelated edits from churning every catalog entry.
  format: formatter({ lineNumbers: false }),
});
