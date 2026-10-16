import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, supabaseOrigins } from "@/lib/security-headers";

describe("CSP: Supabase no connect-src (Auth e Realtime)", () => {
  it("local: http e ws, em 127.0.0.1 e localhost, na porta da Supabase", () => {
    expect(supabaseOrigins("http://127.0.0.1:56321")).toEqual([
      "http://127.0.0.1:56321",
      "http://localhost:56321",
      "ws://127.0.0.1:56321",
      "ws://localhost:56321",
    ]);
  });

  it("nuvem: https e wss no mesmo host, sem porta", () => {
    expect(supabaseOrigins("https://abc.supabase.co")).toEqual(["https://abc.supabase.co", "wss://abc.supabase.co"]);
  });

  it("o connect-src leva o WebSocket e nada além do próprio site e da Supabase", () => {
    const csp = contentSecurityPolicy({ nonce: "n", supabaseUrl: "http://127.0.0.1:56321", dev: false });
    const connect = csp.split("; ").find((d) => d.startsWith("connect-src"));
    expect(connect).toBe(
      "connect-src 'self' http://127.0.0.1:56321 http://localhost:56321 ws://127.0.0.1:56321 ws://localhost:56321",
    );
  });
});
