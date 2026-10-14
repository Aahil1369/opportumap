import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Raw-HTML sinks are banned in app code: third-party job text and user content
// must only ever reach the DOM as text (JSX, textContent, setDOMContent).
const RAW_HTML_MESSAGE =
  "Raw-HTML sink: build DOM nodes and set textContent (or render JSX) instead.";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ["app/**/*.{js,jsx,mjs}", "lib/**/*.{js,jsx,mjs}"],
    rules: {
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: RAW_HTML_MESSAGE },
        { property: "outerHTML", message: RAW_HTML_MESSAGE },
        { property: "insertAdjacentHTML", message: RAW_HTML_MESSAGE },
        { property: "setHTML", message: RAW_HTML_MESSAGE },
        { property: "setHTMLUnsafe", message: RAW_HTML_MESSAGE },
        { object: "document", property: "write", message: RAW_HTML_MESSAGE },
        { object: "document", property: "writeln", message: RAW_HTML_MESSAGE },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: RAW_HTML_MESSAGE },
        { selector: "Property[key.name='dangerouslySetInnerHTML']", message: RAW_HTML_MESSAGE },
        { selector: "JSXAttribute[name.name=/^srcdoc$/i]", message: RAW_HTML_MESSAGE },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
