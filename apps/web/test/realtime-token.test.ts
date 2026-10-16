import { describe, expect, it, vi } from "vitest";
import { tokenCache } from "@/lib/live/realtime-token";

describe("token do Realtime vindo do servidor (H0-03: cookie da sessão httpOnly)", () => {
  it("guarda o token enquanto falta mais de um minuto para vencer e pede outro perto do vencimento", async () => {
    let clock = 1000;
    const fetchToken = vi
      .fn()
      .mockResolvedValueOnce({ token: "t1", expiresAt: 1000 + 3600 })
      .mockResolvedValueOnce({ token: "t2", expiresAt: 1000 + 7200 });
    const cache = tokenCache(fetchToken, () => clock);
    expect(await cache.get()).toBe("t1");
    clock = 1000 + 3000;
    expect(await cache.get()).toBe("t1");
    expect(fetchToken).toHaveBeenCalledTimes(1);
    clock = 1000 + 3560; // menos de 60 s para vencer
    expect(await cache.get()).toBe("t2");
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it("pedidos ao mesmo tempo esperam a mesma resposta; sem sessão devolve null e tenta de novo depois", async () => {
    const fetchToken = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ token: "t9", expiresAt: 99_999 });
    const cache = tokenCache(fetchToken, () => 0);
    const [a, b] = await Promise.all([cache.get(), cache.get()]);
    expect([a, b]).toEqual([null, null]);
    expect(fetchToken).toHaveBeenCalledTimes(1);
    expect(await cache.get()).toBe("t9");
  });

  it("falha do servidor vira null (a reconexão tenta de novo) e clear força pedir outro token", async () => {
    const fetchToken = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce({ token: "t1", expiresAt: 99_999 })
      .mockResolvedValueOnce({ token: "t2", expiresAt: 99_999 });
    const cache = tokenCache(fetchToken, () => 0);
    expect(await cache.get()).toBeNull();
    expect(await cache.get()).toBe("t1");
    cache.clear();
    expect(await cache.get()).toBe("t2");
  });
});
