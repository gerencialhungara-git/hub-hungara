import { describe, expect, it } from "vitest";
import { app, bearer, createUser, json, login } from "./helpers.js";

describe("autenticação própria", () => {
  it("loga com e-mail e senha e recebe access token + cookie de refresh", async () => {
    await createUser({ email: "ana@hungara.com" });
    const { res, accessToken, refreshCookie } = await login("ana@hungara.com");
    expect(res.status).toBe(200);
    expect(accessToken).toMatch(/^eyJ/);
    expect(refreshCookie).toMatch(/^hub_rt=/);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/);
    expect(res.headers.get("set-cookie")).toMatch(/Path=\/auth/);
  });

  it("recusa senha errada e e-mail desconhecido com a mesma mensagem", async () => {
    await createUser({ email: "ana@hungara.com" });
    const wrong = await app.request("/auth/login", json({ email: "ana@hungara.com", password: "errada12" }));
    const unknown = await app.request("/auth/login", json({ email: "ninguem@hungara.com", password: "errada12" }));
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("bloqueia a conta depois de 10 tentativas erradas", async () => {
    await createUser({ email: "ana@hungara.com" });
    for (let i = 0; i < 10; i++) {
      await app.request("/auth/login", json({ email: "ana@hungara.com", password: "errada12" }));
    }
    const res = await app.request("/auth/login", json({ email: "ana@hungara.com", password: "senha-forte-123" }));
    expect(res.status).toBe(423);
  });

  it("/me exige token válido", async () => {
    await createUser({ email: "ana@hungara.com" });
    expect((await app.request("/me")).status).toBe(401);
    expect((await app.request("/me", { headers: bearer("abc.def.ghi") })).status).toBe(401);
    const { accessToken } = await login("ana@hungara.com");
    const ok = await app.request("/me", { headers: bearer(accessToken) });
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { user: { email: string } };
    expect(body.user.email).toBe("ana@hungara.com");
  });

  it("refresh rotaciona o token e reuso do antigo derruba a família", async () => {
    await createUser({ email: "ana@hungara.com" });
    const { refreshCookie } = await login("ana@hungara.com");

    const first = await app.request("/auth/refresh", { method: "POST", headers: { cookie: refreshCookie } });
    expect(first.status).toBe(200);
    const secondCookie = first.headers.get("set-cookie")!.split(";")[0]!;
    expect(secondCookie).not.toBe(refreshCookie);

    // reuso do cookie antigo
    const reuse = await app.request("/auth/refresh", { method: "POST", headers: { cookie: refreshCookie } });
    expect(reuse.status).toBe(401);

    // o novo também caiu, porque a família inteira foi revogada
    const afterReuse = await app.request("/auth/refresh", { method: "POST", headers: { cookie: secondCookie } });
    expect(afterReuse.status).toBe(401);
  });

  it("troca obrigatória de senha bloqueia o catálogo até trocar", async () => {
    await createUser({ email: "novo@hungara.com", mustChangePassword: true });
    const { accessToken } = await login("novo@hungara.com");
    const blocked = await app.request("/modules", { headers: bearer(accessToken) });
    expect(blocked.status).toBe(403);
    expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await app.request("/auth/password", {
      ...json({ current: "senha-forte-123", next: "outra-senha-456" }, bearer(accessToken)),
      method: "PATCH",
    });
    expect(changed.status).toBe(200);
    const { accessToken: fresh } = (await changed.json()) as { accessToken: string };

    // token antigo morreu (token_version mudou); token novo funciona
    expect((await app.request("/modules", { headers: bearer(accessToken) })).status).toBe(401);
    expect((await app.request("/modules", { headers: bearer(fresh) })).status).toBe(200);
  });

  it("usuário desativado não loga", async () => {
    await createUser({ email: "ex@hungara.com", status: "desativado" });
    const { res } = await login("ex@hungara.com");
    expect(res.status).toBe(403);
  });
});
