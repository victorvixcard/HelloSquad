import { SQUAD } from "@hellosquad/ui";
import { ImageResponse } from "next/og";

// Logo da Organization no JSON-LD (README da N2a §5.1): placeholder da marca gerado no build, até o asset oficial.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: "#F7F7F5",
          color: "#0F0D22",
        }}
      >
        <div style={{ display: "flex", fontSize: 76, letterSpacing: -2 }}>HelloSquad</div>
        <div style={{ display: "flex", gap: 10 }}>
          {SQUAD.map((m) => (
            <div key={m.id} style={{ width: 34, height: 34, borderRadius: 17, background: m.color }} />
          ))}
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
