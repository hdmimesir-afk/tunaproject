import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* Lint dijalankan untuk kode sistem ERP. Halaman presentasi (penawaran, demo, rancangan, PRD) dan
   skrip ekspor dibekukan dan tidak ikut lint; keduanya tetap dicek typecheck dan build. */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "output/**",
    "next-env.d.ts",
    // presentasi
    "app/penawaran/**",
    "app/demo/**",
    "app/print/**",
    "app/rancangan/**",
    "app/PRD/**",
    "components/Deck.tsx",
    "components/MobileDeck.tsx",
    "components/SlideCanvas.tsx",
    "components/demo/**",
    "data/**",
    "scripts/**",
    "lib/demo/**",
    "lib/darken.ts",
    "lib/demoMock.ts",
    "lib/demoStyle.ts",
    "lib/kit.ts",
    "lib/phone.ts",
    "lib/scene.ts",
    "postcss.config.mjs",
  ]),
]);

export default eslintConfig;
