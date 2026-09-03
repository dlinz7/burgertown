"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ApiGraph } from "@/components/api-graph"
import { FlowPlayground } from "@/components/flow-playground"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  API_CATALOG,
  DOMAIN_LABELS,
  blastRadius,
  dependentsOf,
  type ApiId,
} from "@/server/catalog"
import { cn } from "@/lib/utils"

type Tab = "graph" | "flows" | "contracts"

export function SandboxConsole() {
  const [tab, setTab] = useState<Tab>("graph")
  const [selected, setSelected] = useState<ApiId>("catalog")
  const [drift, setDrift] = useState(false)

  const selectedApi = API_CATALOG.find((api) => api.id === selected)!
  const radius = blastRadius(selected)
  const broken = useMemo(
    () => (drift ? new Set<string>(["catalog", ...dependentsOf("catalog")]) : new Set<string>()),
    [drift]
  )
  const highlight = useMemo(
    () => new Set<string>([selected, ...radius.dependsOn, ...radius.dependents]),
    [selected, radius]
  )

  async function toggleDrift() {
    const next = !drift
    const res = await fetch("/v1/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_drift: next }),
    })
    if (!res.ok) {
      toast.error("Could not toggle contract drift")
      return
    }
    setDrift(next)
    setSelected("catalog")
    toast[next ? "error" : "success"](
      next
        ? "Catalog contract changed. Downstream APIs are in the blast radius."
        : "Catalog contract restored."
    )
  }

  async function reset() {
    await fetch("/v1/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true, contract_drift: false }),
    })
    setDrift(false)
    toast.success("Fixtures reset")
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Fake POS company · Atlas sandbox
          </p>
          <h1 className="mt-2 font-heading text-4xl tracking-wide uppercase sm:text-5xl">
            25 APIs, one blast radius
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Burgertown is a simulated restaurant POS. Atlas can import{" "}
            <a className="underline" href="/openapi.json">
              the OpenAPI contract
            </a>
            , generate pay / refund / menu workflows, and show what breaks when a
            single contract changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={drift ? "destructive" : "outline"} onClick={toggleDrift}>
            {drift ? "Repair Catalog contract" : "Break Catalog contract"}
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset fixtures
          </Button>
        </div>
      </div>

      <div className="mt-8 flex gap-2">
        {(
          [
            ["graph", "Graph"],
            ["flows", "Demo flows"],
            ["contracts", "Contracts"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "graph" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border bg-card p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>Venue</span>
              <span>Menu</span>
              <span>Service</span>
              <span>Money</span>
              <span>Ops</span>
              <span className="ml-auto">
                Click a node to see dependents. Red = catalog drift.
              </span>
            </div>
            <ApiGraph
              selected={selected}
              onSelect={setSelected}
              highlight={highlight}
              broken={broken}
            />
          </div>
          <aside className="rounded-2xl border bg-card p-5">
            <Badge variant="secondary">{DOMAIN_LABELS[selectedApi.domain]}</Badge>
            <h2 className="mt-3 font-heading text-2xl tracking-wide uppercase">
              {selectedApi.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {selectedApi.description}
            </p>
            <div className="mt-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Depends on
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {radius.dependsOn.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None</span>
                ) : (
                  radius.dependsOn.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      onClick={() => setSelected(id)}
                    >
                      {id}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Blast radius ({radius.dependents.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {radius.dependents.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Nothing consumes this contract.
                  </span>
                ) : (
                  radius.dependents.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        broken.has(id)
                          ? "bg-red-100 text-red-800"
                          : "bg-muted"
                      )}
                      onClick={() => setSelected(id)}
                    >
                      {id}
                    </button>
                  ))
                )}
              </div>
            </div>
            <ul className="mt-5 space-y-2 border-t pt-4">
              {selectedApi.operations.map((op) => (
                <li key={op.id} className="text-sm">
                  <span className="font-mono text-xs">{op.method}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {op.path}
                  </span>
                  {op.failures.length > 0 ? (
                    <p className="text-xs text-red-700">
                      Failures: {op.failures.map((row) => row.code).join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {tab === "flows" ? (
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <FlowPlayground onSelectApi={setSelected} />
        </div>
      ) : null}

      {tab === "contracts" ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">API</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Depends on</th>
                <th className="px-4 py-3">Operations</th>
              </tr>
            </thead>
            <tbody>
              {API_CATALOG.map((api) => (
                <tr
                  key={api.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => {
                    setSelected(api.id)
                    setTab("graph")
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{api.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {api.id}
                    </p>
                  </td>
                  <td className="px-4 py-3">{DOMAIN_LABELS[api.domain]}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {api.dependsOn.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {api.operations.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
