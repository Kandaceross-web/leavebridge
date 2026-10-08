import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "storage/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
  {
    rules: {
      // PHI safety: console output can reach log aggregation. Use src/server/logger.ts.
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
