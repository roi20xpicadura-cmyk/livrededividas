import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**"] },
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
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // shadcn/ui primitives and context modules legitimately export
  // constants/hooks alongside components — HMR-only concern, not a bug.
  {
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
      "src/components/admin/AdminGuard.tsx",
      "src/components/admin/AdminThemeContext.tsx",
      "src/components/onboarding/OnboardingFlow.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
