import { API_CATALOG, DOMAIN_LABELS } from "@/server/catalog"

export const metadata = {
  title: "APIs",
  description: "Twenty-five Burgertown POS APIs and which resources they depend on.",
}

export default function ApisPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Specifications
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">25 APIs</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Each API names the other Burgertown APIs it reads or writes. Those links
        are the contract graph: change Catalog prices and Orders, Checks, and
        Payments still expect the same item shape. Machine-readable copy lives at{" "}
        <a className="underline" href="/openapi.json">
          /openapi.json
        </a>{" "}
        (<code className="text-foreground">x-depends-on</code> on every operation).
      </p>

      <div className="mt-10 space-y-4">
        {API_CATALOG.map((api) => (
          <article
            key={api.id}
            id={api.id}
            className="scroll-mt-20 rounded-2xl border bg-card p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{api.name}</h2>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {DOMAIN_LABELS[api.domain]}
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {api.description}
            </p>
            <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Depends on
            </p>
            <p className="mt-1 font-mono text-sm">
              {api.dependsOn.length > 0 ? api.dependsOn.join(", ") : "—"}
            </p>
            <ul className="mt-4 space-y-1 border-t pt-3 font-mono text-xs">
              {api.operations.map((op) => (
                <li key={op.id}>
                  <span className="text-foreground">{op.method}</span>{" "}
                  <span className="text-muted-foreground">{op.path}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
