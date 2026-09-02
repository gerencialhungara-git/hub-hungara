import { ROLE_LABELS } from "@hub/shared";
import { Card } from "@/components/ui";
import type { ModuleComponentProps } from "../types";

/**
 * Módulo de exemplo. Copie esta pasta, renomeie, e registre o slug em ../registry.ts.
 * `me` traz quem está logado; `module` traz o cadastro feito no Admin.
 */
export default function ExemploBoasVindas({ me, module }: ModuleComponentProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="text-center">
        <img src="/brand/logo-hungara.png" alt="" className="mx-auto mb-4 h-24" />
        <h1 className="text-3xl text-brand-red">E aí, {me.fullName.split(" ")[0]}!</h1>
        <p className="mt-2 text-brand-brown/80">
          Você entrou como <strong>{ROLE_LABELS[me.role]}</strong>. Este é o módulo <code className="rounded bg-brand-cream px-1">{module.slug}</code>,
          um exemplo de implementação interna: código React dentro do repositório, liberado por perfil no Admin.
        </p>
      </Card>
      <Card>
        <h2 className="text-xl text-brand-brown">Como nasce uma implementação nova</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-brand-brown/80">
          <li>Copie a pasta <code>apps/web/src/modules/exemplo-boas-vindas</code> com um nome novo (o <em>slug</em>).</li>
          <li>Registre o slug em <code>apps/web/src/modules/registry.ts</code>.</li>
          <li>Abra um PR. Quando entrar em <code>main</code>, o site publica sozinho.</li>
          <li>No Admin → Implementações, cadastre o slug, escolha ícone e marque os perfis que podem ver.</li>
        </ol>
      </Card>
    </div>
  );
}
