import localFont from "next/font/local";

// Fontes do Design System, auto-hospedadas em packages/ui/src/fonts (licença OFL ao lado).
// Nada de next/font/google: o build e o app não dependem da internet.
// As variáveis abaixo alimentam --hs-font-display e --hs-font-mono (app/globals.css).

export const gabarito = localFont({
  src: "../../../packages/ui/src/fonts/gabarito-latin-wght-normal.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  variable: "--hs-font-gabarito",
  fallback: ["system-ui", "sans-serif"],
});

export const jetbrainsMono = localFont({
  src: "../../../packages/ui/src/fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--hs-font-jetbrains",
  fallback: ["ui-monospace", "monospace"],
  preload: false,
});
