import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "src/helpers/wow-model-viewer/types",
    "src/helpers/wow-model-viewer/tests",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    //the copied wow-model-viewer library is plain JavaScript; jQuery and ZamModelViewer come from
    //<script> tags in index.html, so ESLint is told they exist rather than seeing them as undefined
    files: ["src/helpers/wow-model-viewer/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        jQuery: "readonly",
        ZamModelViewer: "readonly",
      },
    },
  },
]);
