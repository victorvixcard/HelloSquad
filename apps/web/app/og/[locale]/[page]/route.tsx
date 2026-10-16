import { SQUAD } from "@hellosquad/ui";
import { ImageResponse } from "next/og";
import { isLocale, LOCALES } from "@/i18n/config";
import { getSitePage } from "@/lib/site-content";
import { agentOf, SITE_PAGE_KEYS, type SitePageKey } from "@/lib/site-routes";
import { OG_SIZE } from "@/lib/site-seo";

// Imagem de compartilhamento por rota e idioma (Open Graph e Twitter), gerada no build: placeholder da marca com o
// título da página e as cores do squad (ou a do agente). A peça definitiva é briefing do Visão.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SITE_PAGE_KEYS.map((page) => ({ locale, page })));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; page: string }> }) {
  const { locale, page } = await params;
  if (!isLocale(locale) || !(SITE_PAGE_KEYS as string[]).includes(page)) return new Response(null, { status: 404 });
  const key = page as SitePageKey;
  const content = await getSitePage(locale, key);
  const agent = agentOf(key);
  const colors = agent ? SQUAD.filter((m) => m.id === agent).map((m) => m.color) : SQUAD.map((m) => m.color);
  const title = content.title.replace(/\s*\|\s*HelloSquad$/, "");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#F7F7F5",
          color: "#0F0D22",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, letterSpacing: -1 }}>HelloSquad</div>
        <div style={{ display: "flex", fontSize: 68, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", gap: 18 }}>
          {colors.map((color) => (
            <div key={color} style={{ width: 60, height: 60, borderRadius: 30, background: color }} />
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
