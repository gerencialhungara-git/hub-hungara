import { useAudit } from "@/lib/api/queries";
import { Alert, Badge, Card, Spinner } from "@/components/ui";

const TONE: Record<string, "red" | "green" | "blue" | "yellow" | "brown"> = {
  "auth.login": "green",
  "auth.login_failed": "yellow",
  "auth.lockout": "red",
  "auth.refresh_reuse_detected": "red",
  "auth.login_inactive": "red",
};

export function AuditoriaPage() {
  const audit = useAudit();
  if (audit.isPending) return <Spinner />;
  if (audit.isError) return <Alert>Não consegui carregar a auditoria.</Alert>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl text-brand-red">Auditoria</h1>
        <p className="text-brand-brown/70">Quem fez o quê, e quando. Últimos 200 eventos.</p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-brand-red bg-brand-cream-2 text-left">
              <th className="label px-4 py-3">Quando</th><th className="label px-4 py-3">Quem</th><th className="label px-4 py-3">Ação</th><th className="label px-4 py-3">Detalhes</th><th className="label px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {audit.data.entries.map((e) => (
              <tr key={e.id} className="border-b border-brand-cream-3 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-brand-brown/70">{new Date(e.createdAt).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2">{e.actorEmail ?? <span className="text-brand-brown/40">—</span>}</td>
                <td className="px-4 py-2"><Badge tone={TONE[e.action] ?? (e.action.startsWith("module.") ? "blue" : "brown")}>{e.action}</Badge></td>
                <td className="px-4 py-2 text-xs text-brand-brown/70">
                  {e.entity && <span className="mr-2">{e.entity}{e.entityId ? ` ${e.entityId.slice(0, 8)}…` : ""}</span>}
                  {e.payload && <code className="break-all">{JSON.stringify(e.payload)}</code>}
                </td>
                <td className="px-4 py-2 text-xs text-brand-brown/50">{e.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
