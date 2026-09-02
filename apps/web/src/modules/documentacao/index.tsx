import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, cx } from "@/components/ui";
import { Markdown } from "./Markdown";

/** Todos os .md da pasta docs/ entram no bundle e ficam sempre iguais ao repositório. */
const files = import.meta.glob("../../../../../docs/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

interface Doc {
  file: string;
  title: string;
  source: string;
}

function titleOf(source: string, fallback: string) {
  return source.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

const docs: Doc[] = Object.entries(files)
  .map(([path, source]) => {
    const file = path.split("/").pop()!;
    return { file, title: titleOf(source, file), source };
  })
  .filter((d) => d.file !== "README.md")
  .sort((a, b) => a.file.localeCompare(b.file));

const LEIGOS = { file: "como-funciona.html", title: "Como funciona (para todo mundo)" };

export default function Documentacao() {
  const [current, setCurrent] = useState<string>(LEIGOS.file);
  const doc = useMemo(() => docs.find((d) => d.file === current), [current]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-1 lg:sticky lg:top-6 lg:self-start">
        <h2 className="mb-3 text-2xl text-brand-red">Documentação</h2>
        <NavItem active={current === LEIGOS.file} onClick={() => setCurrent(LEIGOS.file)}>
          {LEIGOS.title}
        </NavItem>
        <div className="label mt-4 mb-1 px-3 text-brand-brown/50">Para quem mexe no código</div>
        {docs.map((d) => (
          <NavItem key={d.file} active={current === d.file} onClick={() => setCurrent(d.file)}>
            {d.title.replace(/^Hub Hungara\s*[—-]\s*/i, "")}
          </NavItem>
        ))}
        <a
          href="/docs/como-funciona.html"
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-2 px-3 text-xs text-brand-brown/60 hover:text-brand-red"
        >
          <ExternalLink className="size-3" /> abrir a página para leigos em nova aba
        </a>
      </aside>

      <Card className="min-h-[70vh] p-0 overflow-hidden">
        {current === LEIGOS.file ? (
          <iframe title={LEIGOS.title} src="/docs/como-funciona.html" className="h-[80vh] w-full border-0" />
        ) : doc ? (
          <div className="p-8">
            <Markdown source={doc.source} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "block w-full rounded-xl px-3 py-2 text-left text-sm transition",
        active ? "bg-brand-red text-brand-cream" : "text-brand-brown hover:bg-brand-cream-3",
      )}
    >
      {children}
    </button>
  );
}
