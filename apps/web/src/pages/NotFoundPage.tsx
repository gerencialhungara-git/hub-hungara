import { Link } from "react-router";
import { Button, EmptyState } from "@/components/ui";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Essa página não existe"
      text="O endereço pode estar errado ou a página foi removida."
      action={<Link to="/"><Button variant="ghost">Voltar ao catálogo</Button></Link>}
    />
  );
}
