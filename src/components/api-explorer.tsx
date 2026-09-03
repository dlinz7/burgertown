"use client"

import { useMemo, useState } from "react"
import { ApiGraph } from "@/components/api-graph"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  API_CATALOG,
  DOMAIN_LABELS,
  apiLinks,
  type ApiId,
} from "@/server/catalog"
import { cn } from "@/lib/utils"

export function ApiExplorer({ initialTab = "graph" }: { initialTab?: "graph" | "list" }) {
  const [selected, setSelected] = useState<ApiId>("catalog")
  const selectedApi = API_CATALOG.find((api) => api.id === selected)!
  const links = apiLinks(selected)
  const highlight = useMemo(() => {
    const row = apiLinks(selected)
    return new Set<string>([selected, ...row.dependsOn, ...row.dependents])
  }, [selected])

  return (
    <Tabs defaultValue={initialTab} className="gap-6">
      <TabsList>
        <TabsTrigger value="graph" className="px-3">
          Graph
        </TabsTrigger>
        <TabsTrigger value="list" className="px-3">
          List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="graph">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border bg-card p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-stone-300" /> Venue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-amber-300" /> Menu
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-sky-300" /> Service
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-emerald-400" /> Money
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-violet-400" /> Ops
              </span>
              <span className="ml-auto">Click a node to see what it reads and what reads it.</span>
            </div>
            <ApiGraph
              selected={selected}
              onSelect={setSelected}
              highlight={highlight}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {API_CATALOG.map((api) => (
                <button
                  key={api.id}
                  type="button"
                  onClick={() => setSelected(api.id)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px]",
                    selected === api.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {api.name}
                </button>
              ))}
            </div>
          </div>
          <aside className="h-fit rounded-2xl border bg-card p-5">
            <Badge variant="secondary">{DOMAIN_LABELS[selectedApi.domain]}</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {selectedApi.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {selectedApi.description}
            </p>
            <Relation
              label="Depends on"
              ids={links.dependsOn}
              empty="Nothing — this is a source."
              onSelect={setSelected}
            />
            <Relation
              label={`Used by (${links.dependents.length})`}
              ids={links.dependents}
              empty="Nothing else reads this contract."
              onSelect={setSelected}
            />
            <ul className="mt-5 space-y-2 border-t pt-4">
              {selectedApi.operations.map((op) => (
                <li key={op.id} className="text-sm">
                  <span className="font-mono text-xs">{op.method}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {op.path}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="list">
        <div className="space-y-4">
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
              <p className="mt-1 font-mono text-xs text-muted-foreground">{api.id}</p>
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
      </TabsContent>
    </Tabs>
  )
}

function Relation({
  label,
  ids,
  empty,
  onSelect,
}: {
  label: string
  ids: ApiId[]
  empty: string
  onSelect: (id: ApiId) => void
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ids.length === 0 ? (
          <span className="text-sm text-muted-foreground">{empty}</span>
        ) : (
          ids.map((id) => (
            <button
              key={id}
              type="button"
              className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-muted/80"
              onClick={() => onSelect(id)}
            >
              {id}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
