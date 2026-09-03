# Frozen visualization snapshot

Copied from the working Burgertown POS sandbox so a later website rewrite does not overwrite this graph.

This folder is **not imported** by the live app. Leave it alone while iterating on `src/`. Restore by copying files back to the original paths.

## What this is

Layered SVG graph of the 25 POS APIs, click-to-select, blast-radius highlight, and Catalog contract-drift (red dependents). Also the Graph / Demo flows / Contracts console that wraps it.

## Files

| File | Original path | Role |
| --- | --- | --- |
| `api-graph.tsx` | `src/components/api-graph.tsx` | SVG nodes, edges, selection, red blast radius |
| `sandbox-console.tsx` | `src/components/sandbox-console.tsx` | Page shell: graph, chips, side panel, drift toggle, tabs |
| `flow-playground.tsx` | `src/components/flow-playground.tsx` | Pay / refund / menu flow runner used by the Demo flows tab |
| `catalog.ts` | `src/server/catalog.ts` | 25 APIs, `dependsOn`, `apiGraph()`, `blastRadius()`, demo flows |
| `utils.ts` | `src/lib/utils.ts` | `cn()` class helper |

Live UI also uses shadcn `Button` and `Badge` under `src/components/ui/`. Those are primitives, not unique to this viz.

## Restore

```bash
cp saved/visualization/api-graph.tsx src/components/api-graph.tsx
cp saved/visualization/sandbox-console.tsx src/components/sandbox-console.tsx
cp saved/visualization/flow-playground.tsx src/components/flow-playground.tsx
cp saved/visualization/catalog.ts src/server/catalog.ts
```

`sandbox-console.tsx` currently imports `@/components/api-graph` and `@/server/catalog`. After a rewrite, either keep those aliases or point the copies at whatever new paths you use.
