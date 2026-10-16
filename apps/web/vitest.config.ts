import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  // O tsconfig do Next usa jsx: "preserve"; nos testes o JSX vira chamadas do runtime automático do React.
  oxc: { jsx: { runtime: "automatic" } },
  // Componentes podem importar o próprio CSS (A2b); nos testes o CSS não é processado, e o PostCSS do Next (plugin por
  // nome, que o Vite não carrega) fica de fora com uma configuração vazia aqui.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
