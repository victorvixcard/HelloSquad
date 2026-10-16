// Placeholder da marca (H2-24): o ícone é o app/icon.svg (tinta e papel do Design System) até o asset oficial.
// Navegador e robô que pedem /favicon.ico direto vão para ele, em vez de um 404 em toda página.
export function GET() {
  return new Response(null, { status: 308, headers: { Location: "/icon.svg", "Cache-Control": "public, max-age=86400" } });
}
