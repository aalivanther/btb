import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// eslintConfig es la lista final de reglas que ESLint aplicará al revisar.
const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "src/gen/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default eslintConfig;
