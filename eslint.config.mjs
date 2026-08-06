import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
  {
    languageOptions: {
      globals: {
        define: "readonly",
        jQuery: "readonly",
      },
    },
  },
  // These run in node, not a browser.
  {
    files: [
      "eslint.config.mjs",
      "test/jsdom-runner.js",
      "test/middleware.mjs",
      "test/umd-tests.js",
    ],
    languageOptions: { globals: globals.node },
  },
  // The test suite is loaded by test/index.html and by test/jsdom-runner.js,
  // each of which provides QUnit.
  {
    files: ["test/tests.js"],
    languageOptions: { globals: { QUnit: "readonly" } },
  },
  // dist is built by the Makefile; there is nothing there to lint that is not
  // already linted in js.
  globalIgnores(["dist/", "package-lock.json"]),
]);
