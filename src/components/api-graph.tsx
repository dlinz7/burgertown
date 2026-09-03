"use client"

import { useMemo } from "react"
import { apiGraph, type ApiId, type GraphNode } from "@/server/catalog"
import { cn } from "@/lib/utils"

const DOMAIN_COLOR: Record<GraphNode["domain"], string> = {
  venue: "fill-stone-200 stroke-stone-400",
  menu: "fill-amber-100 stroke-amber-500",
  service: "fill-sky-100 stroke-sky-500",
  money: "fill-emerald-100 stroke-emerald-600",
  ops: "fill-violet-100 stroke-violet-500",
}

type Props = {
  selected: ApiId | null
  onSelect: (id: ApiId) => void
  highlight: Set<string>
}

export function ApiGraph({ selected, onSelect, highlight }: Props) {
  const graph = useMemo(() => apiGraph(), [])
  const width = 1120
  const height = Math.max(620, 48 + graph.layers * 78)
  const nodeW = 132
  const nodeH = 46

  const positioned = graph.nodes.map((node) => {
    const layerNodes = graph.nodes.filter((row) => row.layer === node.layer)
    const x =
      ((node.column + 1) / (layerNodes.length + 1)) * (width - 80) + 40 - nodeW / 2
    const y = 28 + node.layer * 78
    return { ...node, x, y, cx: x + nodeW / 2, cy: y + nodeH / 2 }
  })

  const byId = Object.fromEntries(positioned.map((node) => [node.id, node]))

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[720px]"
        role="img"
        aria-label="Burgertown API dependency graph"
      >
        {graph.edges.map((edge) => {
          const from = byId[edge.from]
          const to = byId[edge.to]
          if (!from || !to) return null
          const active =
            (highlight.has(edge.from) && highlight.has(edge.to)) ||
            selected === edge.from ||
            selected === edge.to
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={`M ${from.cx} ${from.y + nodeH} C ${from.cx} ${from.y + nodeH + 28}, ${to.cx} ${to.y - 28}, ${to.cx} ${to.y}`}
              fill="none"
              className={cn(
                "stroke-[1.5]",
                active ? "stroke-foreground" : "stroke-border"
              )}
            />
          )
        })}
        {positioned.map((node) => {
          const isSelected = selected === node.id
          const isLit = highlight.has(node.id) || isSelected
          return (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              role="button"
              tabIndex={0}
              aria-label={node.name}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelect(node.id)
                }
              }}
            >
              <rect
                width={nodeW}
                height={nodeH}
                rx={10}
                className={cn(
                  "cursor-pointer",
                  DOMAIN_COLOR[node.domain],
                  isSelected && "stroke-2",
                  !isLit && selected && "opacity-40"
                )}
                onClick={() => onSelect(node.id)}
              />
              <text
                x={nodeW / 2}
                y={21}
                textAnchor="middle"
                className="pointer-events-none fill-foreground text-[11px] font-semibold"
              >
                {node.name}
              </text>
              <text
                x={nodeW / 2}
                y={36}
                textAnchor="middle"
                className="pointer-events-none fill-muted-foreground text-[9px]"
              >
                {node.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
