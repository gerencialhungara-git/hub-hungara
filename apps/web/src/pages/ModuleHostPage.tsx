import { Suspense, lazy, useMemo } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/lib/api/queries";
import { internalModules } from "@/modules/registry";
import { Alert, Button, EmptyState, Spinner } from "@/components/ui";
import { EmbedPage } from "./EmbedPage";

export function ModuleHostPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const me = useMe();

  const loader = internalModules[slug];
  const Component = useMemo(() => (loader ? lazy(loader) : null), [loader]);

  if (me.isPending) return <Spinner />;
  if (me.isError || !user) return <Alert>Não consegui carregar suas permissões.</Alert>;

  const mod = me.data.modules.find((m) => m.slug === slug);
  if (!mod) {
    return (
      <EmptyState
        title="Essa implementação não está liberada pra você"
        text="Ou ela não existe, ou o seu perfil não tem acesso. Se acha que devia ter, fala com o admin."
        action={<Link to="/"><Button variant="ghost"><ArrowLeft className="size-4" /> Voltar ao catálogo</Button></Link>}
      />
    );
  }

  if (mod.type === "embed" && mod.url) return <EmbedPage module={mod} />;

  if (mod.type === "link" && mod.url) {
    return (
      <EmptyState
        title={mod.title}
        text="Essa implementação abre em outra aba."
        action={
          <a href={mod.url} target="_blank" rel="noreferrer">
            <Button><ExternalLink className="size-4" /> Abrir {mod.title}</Button>
          </a>
        }
      />
    );
  }

  if (!Component) {
    return (
      <EmptyState
        title="Cadastrada, mas ainda sem código publicado"
        text={`O Admin cadastrou o slug "${slug}" como página interna, mas ele ainda não está em apps/web/src/modules/registry.ts. Quando o código entrar em main, aparece aqui.`}
        action={<Link to="/"><Button variant="ghost"><ArrowLeft className="size-4" /> Voltar ao catálogo</Button></Link>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-brown/60 hover:text-brand-red">
        <ArrowLeft className="size-4" /> Catálogo
      </Link>
      <Suspense fallback={<Spinner label={`Abrindo ${mod.title}…`} />}>
        <Component me={me.data.user} module={mod} />
      </Suspense>
    </div>
  );
}
