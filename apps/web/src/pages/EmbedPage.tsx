import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { ModuleSummary } from "@hub/shared";
import { Alert, Button } from "@/components/ui";

/** Iframe em tela cheia. Se em 8 s nada carregar, avisa que o site não deixa ser embutido. */
export function EmbedPage({ module: m }: { module: ModuleSummary }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100vh-4rem)] flex-col sm:-mx-6">
      <div className="flex items-center gap-3 border-b border-brand-cream-3 bg-white px-4 py-2">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-brown/60 hover:text-brand-red">
          <ArrowLeft className="size-4" /> Catálogo
        </Link>
        <h1 className="text-lg text-brand-brown">{m.title}</h1>
        <a href={m.url!} target="_blank" rel="noreferrer" className="ml-auto">
          <Button size="sm" variant="ghost"><ExternalLink className="size-3" /> Abrir em nova aba</Button>
        </a>
      </div>
      {!loaded && timedOut && (
        <div className="p-4">
          <Alert tone="yellow">
            Esse site parece não permitir ser embutido no Hub. Use o botão "Abrir em nova aba". Se for sempre assim, o admin pode trocar o tipo para <strong>link</strong>.
          </Alert>
        </div>
      )}
      <iframe title={m.title} src={m.url!} onLoad={() => setLoaded(true)} className="flex-1 w-full border-0 bg-white" allow="fullscreen" referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}
