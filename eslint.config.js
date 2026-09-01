import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Architecture boundaries — see _specs/architecture.md
  //
  // The rule is: dependencies point inward.   apps → hooks → api → core
  //
  // These are deliberately scoped to layers that are clean TODAY. The web app
  // in src/ still imports the Supabase client from five layers; that becomes an
  // error once packages/api exists (step 2 of the migration table), not before,
  // because a rule that can never reach zero just trains people to ignore lint.
  // ───────────────────────────────────────────────────────────────────────────

  {
    // packages/core is shared verbatim between the web app and Hermes. It has
    // to depend on nothing at all. __tests__ is excluded because Vitest drivers
    // legitimately use Node APIs and never ship — the same split the purity
    // test makes.
    //
    // This is an explicit deny list rather than a catch-all glob: ESLint's
    // pattern matching treats "*" as matching relative specifiers too, so a
    // catch-all flags the package's own './types' import. The exhaustive
    // "nothing non-relative" rule is enforced by purity.test.ts instead; this
    // list exists to fail fast, in the editor, on the imports someone would
    // realistically reach for.
    files: ["packages/core/**/*.{ts,tsx}"],
    ignores: ["packages/core/**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react", "react-dom", "react-router-dom",
                "react-native", "react-native/*", "@react-native/*",
                "expo", "expo-*", "@expo/*",
                "@supabase/*", "openai", "zod", "date-fns",
                "clsx", "tailwind-merge", "lucide-react",
                "@/*", "node:*", "fs", "path", "url", "crypto", "os",
              ],
              message:
                "packages/core must import nothing but its own relative modules — it is shared verbatim between web and Hermes, and every dependency added here is one the RN app inherits. See _specs/architecture.md.",
            },
          ],
        },
      ],
    },
  },

  {
    // Does not exist yet; the rule lands with it so the boundary is enforced
    // from the first commit rather than retrofitted.
    files: ["packages/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react-native", "react-native/*", "expo", "expo-*", "@/*"],
              message:
                "packages/api is platform-free: it knows about core and the network, not about React, React Native, or any app. The platform storage adapter is injected by the app at startup. See _specs/architecture.md.",
            },
          ],
        },
      ],
    },
  },

  {
    // Also not created yet. React is allowed here; a platform is not.
    files: ["packages/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-native", "react-native/*", "expo", "expo-*", "@/*"],
              message:
                "packages/hooks holds business logic shared by both apps. React is fine; a specific platform is not. See _specs/architecture.md.",
            },
          ],
        },
      ],
    },
  },

  {
    // The React Native app must never reach into the web app.
    files: ["apps/mobile/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "clsx", "tailwind-merge", "react-dom", "react-router-dom"],
              message:
                "apps/mobile may not import from the web app or its DOM-only libraries. Shared code belongs in a package. See _specs/architecture.md.",
            },
          ],
        },
      ],
    },
  },

  {
    // ...and the web app must never reach into the mobile one.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-native", "react-native/*", "expo", "expo-*"],
              message:
                "The web app may not import React Native. Shared code belongs in a package. See _specs/architecture.md.",
            },
          ],
        },
      ],
    },
  }
);
