import { Link, useSearchParams } from "react-router";
import { ExternalLink, Frame } from "lucide-react";
import type { ModuleSummary } from "@hub/shared";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/lib/api/queries";
import { categoryColor, iconByName } from "@/lib/icons";
import { Alert, Badge, EmptyState, Spinner } from "@/components/ui";

export function CatalogoPage() {
  const { user } = useAuth();
  const me = useMe();
  const [params] = useSearchParams();

  if (me.isPending) return <Spinner label="Buscando suas implementações…" />;
  if (me.isError) return <Alert>Não consegui carregar o catálogo. Recarrega a página; se continuar, fala com o admin.</Alert>;

  const modules = me.data.modules;
  const groups = new Map<string, ModuleSummary[]>();
  for (const m of modules) groups.set(m.category, [...(groups.get(m.category) ?? []), m]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl text-brand-red">Bem-vindo, {user?.fullName.split(" ")[0]}!</h1>
        <p className="mt-1 text-brand-brown/70">Aqui estão as implementações liberadas para você.</p>
      </div>
      {params.get("negado") && <Alert tone="yellow">Essa área é só para administradores.</Alert>}

      {modules.length === 0 ? (
        <EmptyState title="Nenhuma implementação liberada pra você ainda" text="Quando o admin liberar algo para o seu perfil, aparece aqui. Sem caô." />
      ) : (
        [...groups.entries()].map(([category, items]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${categoryColor(category)}`} />
              <h2 className="text-2xl text-brand-brown">{category}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => <ModuleCard key={m.id} module={m} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ModuleCard({ module: m }: { module: ModuleSummary }) {
  const Icon = iconByName(m.icon);
  const inner = (
    <>
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-brand-cream ${categoryColor(m.category)}`}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl leading-tight text-brand-brown group-hover:text-brand-red">{m.title}</h3>
          {m.type === "link" && <ExternalLink className="mt-1 size-4 shrink-0 text-brand-brown/40" />}
          {m.type === "embed" && <Frame className="mt-1 size-4 shrink-0 text-brand-brown/40" />}
        </div>
        <p className="mt-1 line-clamp-3 text-sm text-brand-brown/70">{m.description}</p>
        <div className="mt-3">
          {m.type === "link" && <Badge tone="gray">abre em nova aba</Badge>}
          {m.type === "embed" && <Badge tone="blue">embutido</Badge>}
        </div>
      </div>
    </>
  );
  const cls = "group flex gap-4 rounded-card bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg";
  if (m.type === "link" && m.url) {
    return <a href={m.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  }
  return <Link to={`/m/${m.slug}`} className={cls}>{inner}</Link>;
}
