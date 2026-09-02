import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/auth/**"],
    rules: {
      // Só o adapter de auth pode falar com /auth. Assim, trocar de provedor mexe num arquivo só.
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/lib/auth/hubAuthProvider*"], message: "Use useAuth() de @/lib/auth" }] }],
    },
  },
);
