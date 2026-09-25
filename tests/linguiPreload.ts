import { plugin } from "bun";
import { transformAsync } from "@babel/core";
import { i18n } from "@lingui/core";

// bun test does not run the Vite pipeline, and Lingui macros throw when they
// execute untransformed. Expand them with the same Babel plugin Vite uses.
const MACRO_IMPORT = /from ["']@lingui\/(?:core|react)\/macro["']/;

plugin({
  name: "lingui-macro",
  setup(build) {
    build.onLoad({ filter: /\/src\/.*\.tsx?$/ }, async ({ path }) => {
      const isTsx = path.endsWith(".tsx");
      const loader = isTsx ? "tsx" : "ts";
      const source = await Bun.file(path).text();
      if (!MACRO_IMPORT.test(source)) return { contents: source, loader };

      const result = await transformAsync(source, {
        filename: path,
        babelrc: false,
        configFile: false,
        retainLines: true,
        parserOpts: { plugins: isTsx ? ["typescript", "jsx"] : ["typescript"] },
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      });
      return { contents: result?.code ?? source, loader };
    });
  },
});

// Outside production the macros keep the source message, so an empty catalog
// renders the Chinese source text that the tests assert on.
i18n.loadAndActivate({ locale: "zh", messages: {} });
