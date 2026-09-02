import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import {
  MODULE_TYPES, MODULE_TYPE_LABELS, ROLES, ROLE_LABELS,
  type ModuleAdmin, type ModuleType, type Role, type UserPublic,
} from "@hub/shared";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { keys, useAdminModules, useAdminUsers, useInvalidating } from "@/lib/api/queries";
import { ICON_NAMES, categoryColor, iconByName } from "@/lib/icons";
import { internalSlugs } from "@/modules/registry";
import { Alert, Badge, Button, Card, Dialog, Field, Input, Select, Spinner, Textarea, cx } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

interface FormState {
  slug: string; title: string; description: string; icon: string; type: ModuleType; url: string; category: string; active: boolean; roles: Role[];
}
const empty: FormState = { slug: "", title: "", description: "", icon: "LayoutGrid", type: "interna", url: "", category: "Geral", active: true, roles: [] };

export function ImplementacoesPage() {
  const mods = useAdminModules();
  const toast = useToast();
  const [editing, setEditing] = useState<ModuleAdmin | "new" | null>(null);
  const [overrides, setOverrides] = useState<ModuleAdmin | null>(null);

  const remove = useInvalidating((id: string) => api.delete(`/admin/modules/${id}`), [keys.adminModules, keys.me]);
  const reorder = useInvalidating((ids: string[]) => api.post("/admin/modules/reorder", { ids }), [keys.adminModules, keys.me]);

  if (mods.isPending) return <Spinner />;
  if (mods.isError) return <Alert>Não consegui listar as implementações.</Alert>;
  const list = mods.data.modules;
  const cadastrados = new Set(list.filter((m) => m.type === "interna").map((m) => m.slug));
  const semCadastro = internalSlugs.filter((s) => !cadastrados.has(s));

  function move(index: number, dir: -1 | 1) {
    const ids = list.map((m) => m.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    void reorder.mutateAsync(ids).catch(() => toast.erro("Não deu para reordenar."));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-4xl text-brand-red">Implementações</h1>
          <p className="text-brand-brown/70">O que aparece no catálogo e para quem.</p>
        </div>
        <Button className="ml-auto" onClick={() => setEditing("new")}><Plus className="size-4" /> Nova implementação</Button>
      </div>

      {semCadastro.length > 0 && (
        <Alert tone="yellow">
          Código publicado sem cadastro: <strong>{semCadastro.join(", ")}</strong>. Clique em "Nova implementação", escolha o slug e marque os perfis para aparecer no catálogo.
        </Alert>
      )}

      <div className="space-y-3">
        {list.map((m, i) => {
          const Icon = iconByName(m.icon);
          const semCodigo = m.type === "interna" && !internalSlugs.includes(m.slug);
          return (
            <Card key={m.id} className={cx("flex flex-wrap items-center gap-4 py-4", !m.active && "opacity-60")}>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-brand-cream-3 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded p-1 hover:bg-brand-cream-3 disabled:opacity-30"><ArrowDown className="size-4" /></button>
              </div>
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-brand-cream ${categoryColor(m.category)}`}><Icon className="size-6" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl text-brand-brown">{m.title}</h3>
                  <Badge tone="gray">{MODULE_TYPE_LABELS[m.type]}</Badge>
                  <Badge tone="brown">{m.category}</Badge>
                  {!m.active && <Badge tone="red">inativa</Badge>}
                  {semCodigo && <Badge tone="yellow">sem código no registry</Badge>}
                </div>
                <div className="mt-1 text-xs text-brand-brown/60">
                  slug <code>{m.slug}</code>{m.url && <> · <a href={m.url} target="_blank" rel="noreferrer" className="underline">{m.url}</a></>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="red">admin</Badge><Badge tone="red">diretoria</Badge>
                  {m.roles.filter((r) => r !== "admin" && r !== "diretoria").map((r) => <Badge key={r} tone="green">{ROLE_LABELS[r]}</Badge>)}
                  {m.overrides.map((o) => (
                    <Badge key={o.userId} tone={o.effect === "allow" ? "blue" : "yellow"}>{o.effect === "allow" ? "+" : "−"} {o.fullName}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Link to={m.type === "link" && m.url ? m.url : `/m/${m.slug}`} target={m.type === "link" ? "_blank" : undefined}>
                  <Button size="sm" variant="ghost" title="Testar"><ExternalLink className="size-3" /> Testar</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => setOverrides(m)} title="Exceções por usuário"><UserPlus className="size-3" /> Exceções</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Pencil className="size-3" /> Editar</Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Excluir "${m.title}"? Prefira desativar se for temporário.`)) {
                      void remove.mutateAsync(m.id).then(() => toast.ok("Excluída")).catch(() => toast.erro("Não deu para excluir."));
                    }
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <Alert tone="yellow">Nenhuma implementação cadastrada ainda.</Alert>}
      </div>

      <ModuleDialog key={editing === "new" ? "new" : editing?.id ?? "none"} editing={editing} onClose={() => setEditing(null)} />
      <OverridesDialog module={overrides} onClose={() => setOverrides(null)} />
    </div>
  );
}

function ModuleDialog({ editing, onClose }: { editing: ModuleAdmin | "new" | null; onClose: () => void }) {
  const toast = useToast();
  const initial: FormState = editing && editing !== "new"
    ? { slug: editing.slug, title: editing.title, description: editing.description, icon: editing.icon, type: editing.type, url: editing.url ?? "", category: editing.category, active: editing.active, roles: editing.roles }
    : empty;
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const isNew = editing === "new";
  const Icon = iconByName(form.icon);

  const save = useInvalidating(async (f: FormState) => {
    const body = { ...f, url: f.type === "interna" ? null : f.url, sortOrder: undefined };
    return isNew ? api.post("/admin/modules", body) : api.patch(`/admin/modules/${(editing as ModuleAdmin).id}`, body);
  }, [keys.adminModules, keys.me]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await save.mutateAsync(form);
      toast.ok(isNew ? "Implementação criada" : "Implementação salva");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Deu erro ao salvar.");
    }
  }

  function toggleRole(r: Role) {
    setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));
  }

  return (
    <Dialog open={editing !== null} title={isNew ? "Nova implementação" : `Editar: ${(editing as ModuleAdmin | null)?.title ?? ""}`} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <Field label="Tipo">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ModuleType })}>
            {MODULE_TYPES.map((t) => <option key={t} value={t}>{MODULE_TYPE_LABELS[t]}</option>)}
          </Select>
        </Field>
        <Field label="Slug" hint={form.type === "interna" ? "Tem que bater com o registry.ts" : "Identificador único, ex.: painel-tv-lojas"}>
          {form.type === "interna" ? (
            <Select value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required>
              <option value="">Escolha o código publicado…</option>
              {internalSlugs.map((s) => <option key={s} value={s}>{s}</option>)}
              {form.slug && !internalSlugs.includes(form.slug) && <option value={form.slug}>{form.slug} (sem código ainda)</option>}
            </Select>
          ) : (
            <Input required pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          )}
        </Field>
        <Field label="Título"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Categoria" hint="Agrupa os cards no catálogo"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        {form.type !== "interna" && (
          <div className="sm:col-span-2">
            <Field label="URL" hint={form.type === "embed" ? "Se o site bloquear iframe, troque para Link externo." : undefined}>
              <Input type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </Field>
          </div>
        )}
        <div className="sm:col-span-2">
          <Field label="Descrição"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <Field label="Ícone">
          <div className="flex items-center gap-2">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-brand-cream ${categoryColor(form.category)}`}><Icon className="size-5" /></div>
            <Select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
        </Field>
        <Field label="Status">
          <Select value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
            <option value="1">Ativa (aparece no catálogo)</option>
            <option value="0">Inativa (escondida)</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <span className="label text-brand-brown-soft">Quem pode ver</span>
          <p className="mb-2 text-xs text-brand-brown/60">Admin e Diretoria veem tudo que está ativo. Marque os outros perfis:</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.filter((r) => r !== "admin" && r !== "diretoria").map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => toggleRole(r)}
                className={cx("rounded-full border px-4 py-1.5 font-label text-xs uppercase tracking-wider", form.roles.includes(r) ? "border-success bg-success text-white" : "border-brand-cream-3 bg-white text-brand-brown")}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={save.isPending}>{isNew ? "Criar" : "Salvar"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function OverridesDialog({ module: m, onClose }: { module: ModuleAdmin | null; onClose: () => void }) {
  const users = useAdminUsers();
  const toast = useToast();
  const [q, setQ] = useState("");
  const mods = useAdminModules();
  const live = useMemo(() => mods.data?.modules.find((x) => x.id === m?.id) ?? m, [mods.data, m]);

  const set = useInvalidating((v: { userId: string; effect: "allow" | "deny" }) => api.put(`/admin/modules/${m!.id}/overrides/${v.userId}`, { effect: v.effect }), [keys.adminModules, keys.me]);
  const del = useInvalidating((userId: string) => api.delete(`/admin/modules/${m!.id}/overrides/${userId}`), [keys.adminModules, keys.me]);

  const candidates: UserPublic[] = (users.data?.users ?? []).filter((u) => q && `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6);

  return (
    <Dialog open={!!m} title={`Exceções: ${live?.title ?? ""}`} onClose={onClose}>
      <p className="mb-4 text-sm text-brand-brown/80">Libere (<strong>+</strong>) ou bloqueie (<strong>−</strong>) uma pessoa específica, independente do perfil dela.</p>
      <div className="space-y-2">
        {live?.overrides.map((o) => (
          <div key={o.userId} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm">
            <Badge tone={o.effect === "allow" ? "blue" : "yellow"}>{o.effect === "allow" ? "+ liberado" : "− bloqueado"}</Badge>
            <span className="flex-1">{o.fullName} <span className="text-brand-brown/50">{o.email}</span></span>
            <button onClick={() => void del.mutateAsync(o.userId).then(() => toast.ok("Exceção removida"))} className="rounded-full p-1 hover:bg-brand-cream-3" title="Remover exceção"><UserMinus className="size-4" /></button>
          </div>
        ))}
        {live?.overrides.length === 0 && <p className="text-xs text-brand-brown/50">Nenhuma exceção.</p>}
      </div>
      <div className="mt-5">
        <Field label="Adicionar pessoa"><Input placeholder="Busque por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <div className="mt-2 space-y-1">
          {candidates.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="flex-1">{u.fullName} <span className="text-brand-brown/50">· {ROLE_LABELS[u.role]}</span></span>
              <Button size="sm" variant="ghost" onClick={() => void set.mutateAsync({ userId: u.id, effect: "allow" }).then(() => { setQ(""); toast.ok("Liberado"); })}>+ liberar</Button>
              <Button size="sm" variant="danger" onClick={() => void set.mutateAsync({ userId: u.id, effect: "deny" }).then(() => { setQ(""); toast.ok("Bloqueado"); })}>− bloquear</Button>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
