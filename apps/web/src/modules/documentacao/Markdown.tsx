import { useEffect, useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          fontFamily: "Nunito Variable, system-ui, sans-serif",
          themeVariables: {
            primaryColor: "#FFF5E1",
            primaryTextColor: "#553125",
            primaryBorderColor: "#DD2321",
            lineColor: "#553125",
            secondaryColor: "#FFEFE1",
            tertiaryColor: "#F6E6CC",
            actorBkg: "#FFF5E1",
            actorBorder: "#DD2321",
            signalColor: "#553125",
            noteBkgColor: "#F7BD28",
            noteTextColor: "#553125",
          },
        });
        const { svg } = await mermaid.render(`m-${id}`, chart);
        if (alive) setSvg(svg);
      })
      .catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [chart, id]);

  if (error) return <pre className="overflow-x-auto rounded-xl bg-brand-red/5 p-4 text-xs text-brand-red">{error}</pre>;
  if (!svg) return <div className="h-24 animate-pulse rounded-xl bg-brand-cream-3" />;
  return <div className="my-4 overflow-x-auto rounded-xl bg-white p-4 [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Markdown({ source }: { source: string }) {
  return (
    <article className="prose-hub">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const text = String(children).replace(/\n$/, "");
            if (lang === "mermaid") return <Mermaid chart={text} />;
            if (!className && !text.includes("\n")) {
              return (
                <code className="rounded bg-brand-cream-2 px-1.5 py-0.5 text-[0.9em] text-brand-red" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-xl bg-brand-brown p-4 text-xs text-brand-cream">
                <code>{text}</code>
              </pre>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-brand-red underline">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
