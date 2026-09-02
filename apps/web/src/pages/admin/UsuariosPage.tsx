import { useState, type FormEvent } from "react";
import { Copy, KeyRound, LogOut, Plus, RefreshCw, Search } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role, type UserPublic } from "@hub/shared";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { keys, useAdminUsers, useInvalidating } from "@/lib/api/queries";
import { useAuth } from "@/lib/auth";
import { Alert, Badge, Button, Card, Dialog, Field, Input, Select, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

function gerarSenha(len = 10) {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => a[b % a.length]).join("");
}

export function UsuariosPage() {
  const users = useAdminUsers();
  const toast = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserPublic | null>(null);

  const patch = useInvalidating((v: { id: string; body: Partial<Pick<UserPublic, "role" | "status" | "fullName">> }) => api.patch(`/admin/users/${v.id}`, v.body), [keys.adminUsers]);
  const logoutAll = useInvalidating((id: string) => api.post(`/admin/users/${id}/logout-all`), [keys.adminUsers]);

  if (users.isPending) return <Spinner />;
  if (users.isError) return <Alert>Não consegui listar os usuários.</Alert>;

  const list = users.data.users.filter((u) => `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  async function run<T>(p: Promise<T>, ok: string) {
    try {
      await p;
      toast.ok(ok);
    } catch (err) {
      toast.erro(err instanceof ApiError ? err.message : "Deu erro.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-4xl text-brand-red">Usuários</h1>
          <p className="text-brand-brown/70">Quem entra no Hub e com qual perfil.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-brand-brown/40" />
            <Input placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-64 pl-9" />
          </div>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Novo usuário</Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-brand-red bg-brand-cream-2 text-left">
              <Th>Nome</Th><Th>E-mail</Th><Th>Perfil</Th><Th>Status</Th><Th>Último acesso</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id} className="border-b border-brand-cream-3 hover:bg-brand-cream/60">
                  <td className="px-4 py-3 font-semibold">
                    {u.fullName} {self && <Badge tone="gray" className="ml-1">você</Badge>}
                    {u.mustChangePassword && <Badge tone="yellow" className="ml-1">senha temporária</Badge>}
                  </td>
                  <td className="px-4 py-3 text-brand-brown/80">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role}
                      disabled={self}
                      onChange={(e) => void run(patch.mutateAsync({ id: u.id, body: { role: e.target.value as Role } }), "Perfil atualizado")}
                      className="h-9 w-44 text-sm"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={self}
                      onClick={() => void run(patch.mutateAsync({ id: u.id, body: { status: u.status === "ativo" ? "desativado" : "ativo" } }), u.status === "ativo" ? "Usuário desativado" : "Usuário reativado")}
                      title={self ? "Você não pode se desativar" : "Clique para alternar"}
                    >
                      <Badge tone={u.status === "ativo" ? "green" : "red"}>{u.status}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-brand-brown/60">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-BR") : "nunca entrou"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setResetting(u)} title="Redefinir senha"><KeyRound className="size-3" /> Senha</Button>
                      <Button size="sm" variant="ghost" onClick={() => void run(logoutAll.mutateAsync(u.id), "Sessões encerradas")} title="Sair de todos os dispositivos"><LogOut className="size-3" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-sm text-brand-brown/60">Ninguém encontrado.</p>}
      </Card>

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="label px-4 py-3 text-brand-brown">{children}</th>;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
      <span className="label w-20 text-brand-brown/60">{label}</span>
      <code className="flex-1 text-brand-brown">{value}</code>
      <button onClick={() => void navigator.clipboard.writeText(value).then(() => toast.ok(`${label} copiado`))} className="rounded-full p-1 hover:bg-brand-cream-3" title="Copiar">
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ email: "", fullName: "", role: "escritorio" as Role, password: gerarSenha() });
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useInvalidating((body: typeof form) => api.post<{ user: UserPublic }>("/admin/users", body), [keys.adminUsers]);

  function reset() {
    setForm({ email: "", fullName: "", role: "escritorio", password: gerarSenha() });
    setDone(null);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync(form);
      setDone({ email: form.email.toLowerCase(), password: form.password });
      toast.ok("Usuário criado");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Deu erro ao criar.");
    }
  }

  return (
    <Dialog open={open} title={done ? "Pronto! Passe os dados para a pessoa" : "Novo usuário"} onClose={() => { reset(); onClose(); }}>
      {done ? (
        <div className="space-y-4">
          <Alert tone="green">Usuário criado com senha temporária. No primeiro login o Hub pede para trocar.</Alert>
          <CopyRow label="E-mail" value={done.email} />
          <CopyRow label="Senha" value={done.password} />
          <CopyRow label="Acesso" value={window.location.origin} />
          <p className="text-xs text-brand-brown/60">Essa senha não aparece de novo. Se perder, use "Redefinir senha" na lista.</p>
          <Button className="w-full" onClick={() => { reset(); onClose(); }}>Fechar</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Nome completo"><Input required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="E-mail"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Perfil">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </Field>
          <Field label="Senha temporária" hint="Mínimo 8 caracteres. A pessoa troca no primeiro login.">
            <div className="flex gap-2">
              <Input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Button type="button" variant="ghost" onClick={() => setForm({ ...form, password: gerarSenha() })} title="Gerar outra"><RefreshCw className="size-4" /></Button>
            </div>
          </Field>
          <Button type="submit" className="w-full" loading={create.isPending}>Criar usuário</Button>
        </form>
      )}
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: UserPublic | null; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState(gerarSenha());
  const [done, setDone] = useState(false);
  const reset = useInvalidating((v: { id: string; password: string }) => api.post(`/admin/users/${v.id}/reset-password`, { password: v.password }), [keys.adminUsers]);

  function close() {
    setPassword(gerarSenha());
    setDone(false);
    onClose();
  }

  return (
    <Dialog open={!!user} title={`Redefinir senha de ${user?.fullName ?? ""}`} onClose={close}>
      {done ? (
        <div className="space-y-4">
          <Alert tone="green">Senha redefinida. Todas as sessões da pessoa foram encerradas.</Alert>
          <CopyRow label="E-mail" value={user?.email ?? ""} />
          <CopyRow label="Senha" value={password} />
          <Button className="w-full" onClick={close}>Fechar</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-brand-brown/80">A pessoa vai precisar trocar essa senha no próximo login.</p>
          <Field label="Nova senha temporária">
            <div className="flex gap-2">
              <Input minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="button" variant="ghost" onClick={() => setPassword(gerarSenha())}><RefreshCw className="size-4" /></Button>
            </div>
          </Field>
          <Button
            className="w-full"
            loading={reset.isPending}
            onClick={() =>
              void reset.mutateAsync({ id: user!.id, password }).then(() => { setDone(true); toast.ok("Senha redefinida"); }).catch((err) => toast.erro(err instanceof ApiError ? err.message : "Deu erro."))
            }
          >
            Redefinir
          </Button>
        </div>
      )}
    </Dialog>
  );
}
