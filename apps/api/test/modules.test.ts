import { describe, expect, it } from "vitest";
import { app, bearer, createModule, createUser, json, login } from "./helpers.js";

async function visibleSlugs(token: string): Promise<string[]> {
  const res = await app.request("/me", { headers: bearer(token) });
  const body = (await res.json()) as { modules: { slug: string }[] };
  return body.modules.map((m) => m.slug).sort();
}

describe("visibilidade de módulos", () => {
  it("papel só vê módulos liberados; admin e diretoria veem tudo ativo", async () => {
    await createModule("fabrica-only", ["fabrica"]);
    await createModule("todos", ["escritorio", "fabrica", "franqueado"]);
    await createModule("inativo", ["escritorio"], { active: false });
    await createUser({ email: "esc@h.com", role: "escritorio" });
    await createUser({ email: "dir@h.com", role: "diretoria" });

    const esc = await login("esc@h.com");
    expect(await visibleSlugs(esc.accessToken)).toEqual(["todos"]);
    const dir = await login("dir@h.com");
    expect(await visibleSlugs(dir.accessToken)).toEqual(["fabrica-only", "todos"]);

    const hidden = await app.request("/modules/fabrica-only", { headers: bearer(esc.accessToken) });
    expect(hidden.status).toBe(404);
  });

  it("exceção allow libera e deny bloqueia por usuário", async () => {
    const admin = await createUser({ email: "adm@h.com", role: "admin" });
    const esc = await createUser({ email: "esc@h.com", role: "escritorio" });
    const soFabrica = await createModule("so-fabrica", ["fabrica"]);
    const geral = await createModule("geral", ["escritorio"]);
    const a = await login("adm@h.com");

    let res = await app.request(`/admin/modules/${soFabrica.id}/overrides/${esc.id}`, {
      ...json({ effect: "allow" }, bearer(a.accessToken)),
      method: "PUT",
    });
    expect(res.status).toBe(200);
    res = await app.request(`/admin/modules/${geral.id}/overrides/${esc.id}`, {
      ...json({ effect: "deny" }, bearer(a.accessToken)),
      method: "PUT",
    });
    expect(res.status).toBe(200);

    const e = await login("esc@h.com");
    expect(await visibleSlugs(e.accessToken)).toEqual(["so-fabrica"]);
    void admin;
  });
});

describe("admin", () => {
  it("só admin acessa /admin e o último admin não pode ser rebaixado", async () => {
    const admin = await createUser({ email: "adm@h.com", role: "admin" });
    await createUser({ email: "esc@h.com", role: "escritorio" });
    const e = await login("esc@h.com");
    expect((await app.request("/admin/users", { headers: bearer(e.accessToken) })).status).toBe(403);

    const a = await login("adm@h.com");
    const demote = await app.request(`/admin/users/${admin.id}`, {
      ...json({ role: "escritorio" }, bearer(a.accessToken)),
      method: "PATCH",
    });
    expect(demote.status).toBe(400);
    expect(((await demote.json()) as { error: { code: string } }).error.code).toBe("LAST_ADMIN");
  });

  it("admin cria usuário com senha inicial, que é obrigado a trocar; redefinir senha derruba sessões", async () => {
    await createUser({ email: "adm@h.com", role: "admin" });
    const a = await login("adm@h.com");

    const created = await app.request(
      "/admin/users",
      json({ email: "Novo@H.com", fullName: "Novo Usuário", role: "franqueado", password: "inicial-123" }, bearer(a.accessToken)),
    );
    expect(created.status).toBe(201);
    const { user } = (await created.json()) as { user: { id: string; email: string; mustChangePassword: boolean } };
    expect(user.email).toBe("novo@h.com");
    expect(user.mustChangePassword).toBe(true);

    const n = await login("novo@h.com", "inicial-123");
    expect(n.res.status).toBe(200);

    const reset = await app.request(`/admin/users/${user.id}/reset-password`, json({ password: "nova-temp-999" }, bearer(a.accessToken)));
    expect(reset.status).toBe(200);
    expect((await app.request("/me", { headers: bearer(n.accessToken) })).status).toBe(401);
    expect((await login("novo@h.com", "nova-temp-999")).res.status).toBe(200);
  });

  it("CRUD de módulos valida URL para link/embed e registra auditoria", async () => {
    await createUser({ email: "adm@h.com", role: "admin" });
    const a = await login("adm@h.com");

    const bad = await app.request("/admin/modules", json({ slug: "sem-url", title: "Sem URL", type: "link" }, bearer(a.accessToken)));
    expect(bad.status).toBe(400);

    const ok = await app.request(
      "/admin/modules",
      json({ slug: "painel-tv", title: "Painel TV", type: "link", url: "https://painel-tv-lojas.hungaralanches.com.br", roles: ["escritorio"] }, bearer(a.accessToken)),
    );
    expect(ok.status).toBe(201);
    const { module } = (await ok.json()) as { module: { id: string; roles: string[] } };
    expect(module.roles).toEqual(["escritorio"]);

    const audit = await app.request("/admin/audit", { headers: bearer(a.accessToken) });
    const { entries } = (await audit.json()) as { entries: { action: string }[] };
    expect(entries.map((e) => e.action)).toContain("module.create");
  });
});
