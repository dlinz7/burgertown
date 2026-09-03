"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DEMO_FLOWS, type ApiId } from "@/server/catalog"
import { cn } from "@/lib/utils"

type StepResult = {
  ok: boolean
  status: number
  path: string
  method: string
  body: unknown
}

type FlowId = (typeof DEMO_FLOWS)[number]["id"]

async function parse(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function runPay(kind: "ok" | "declined" | "timeout"): Promise<StepResult[]> {
  await fetch("/v1/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset: true }),
  })
  const checkId =
    kind === "ok" ? "chk_ok" : kind === "declined" ? "chk_declined" : "chk_timeout"
  const tableId = kind === "ok" ? "tbl_4" : kind === "declined" ? "tbl_2" : "tbl_7"
  const steps: StepResult[] = []

  const push = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await parse(res)
    steps.push({ ok: res.ok, status: res.status, path, method, body: json })
    return { res, json }
  }

  await push("GET", `/v1/tables/${tableId}`)
  const check = await push("GET", `/v1/checks/${checkId}`)
  const due = check.json.totals?.due_cents
  const payment = await push("POST", "/v1/payments", {
    check_id: checkId,
    method: "card",
    amount_cents: due,
  })
  const charge = await push("POST", "/v1/processor/charges", {
    payment_id: payment.json.id,
    payment_method: "pm_ok",
  })
  if (!charge.res.ok) return steps
  await push("POST", "/v1/invoices", { payment_id: payment.json.id })
  await push("GET", `/v1/checks/${checkId}/receipt`)
  await push("POST", `/v1/payments/${payment.json.id}/tip`, { amount_cents: 300 })
  return steps
}

async function runRefund(): Promise<StepResult[]> {
  await fetch("/v1/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset: true }),
  })
  const steps: StepResult[] = []
  const push = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await parse(res)
    steps.push({ ok: res.ok, status: res.status, path, method, body: json })
    return { res, json }
  }
  await push("GET", "/v1/checks/chk_paid")
  const refund = await push("POST", "/v1/refunds", { payment_id: "pay_paid" })
  if (!refund.res.ok) return steps
  await push("POST", "/v1/processor/refunds", {
    charge_id: "ch_paid",
    refund_id: refund.json.id,
  })
  await push("POST", "/v1/checks/chk_paid/void")
  return steps
}

async function runMenu(kind: "ok" | "fail"): Promise<StepResult[]> {
  await fetch("/v1/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset: true }),
  })
  const steps: StepResult[] = []
  const push = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await parse(res)
    steps.push({ ok: res.ok, status: res.status, path, method, body: json })
    return { res, json }
  }
  await push("GET", "/v1/menus/menu_dinner")
  await push("GET", "/v1/catalog/items")
  const add = await push("POST", "/v1/checks/chk_ok/items", {
    item_id: kind === "ok" ? "itm_shake" : "itm_86",
    quantity: 1,
  })
  if (!add.res.ok) return steps
  await push("POST", "/v1/checks/chk_ok/send")
  await push("GET", "/v1/kds/tickets")
  return steps
}

export function FlowPlayground({
  onSelectApi,
}: {
  onSelectApi: (id: ApiId) => void
}) {
  const [flowId, setFlowId] = useState<FlowId>("pay_at_table")
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<StepResult[]>([])
  const flow = DEMO_FLOWS.find((item) => item.id === flowId)!

  async function run(variant: "success" | "failure") {
    setRunning(true)
    setSteps([])
    try {
      let result: StepResult[] = []
      if (flowId === "pay_at_table") {
        result = await runPay(variant === "success" ? "ok" : "declined")
      } else if (flowId === "refund") {
        result =
          variant === "success"
            ? await runRefund()
            : await (async () => {
                await fetch("/v1/sandbox", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reset: true }),
                })
                const res = await fetch("/v1/checks/chk_ok/void", { method: "POST" })
                return [
                  {
                    ok: res.ok,
                    status: res.status,
                    path: "/v1/checks/chk_ok/void",
                    method: "POST",
                    body: await parse(res),
                  },
                ]
              })()
      } else {
        result = await runMenu(variant === "success" ? "ok" : "fail")
      }
      setSteps(result)
      const failed = result.some((step) => !step.ok)
      if (failed) toast.error("Flow ended on a failure fixture")
      else toast.success("Flow completed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        {DEMO_FLOWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setFlowId(item.id)
              setSteps([])
            }}
            className={cn(
              "w-full rounded-xl border px-3 py-3 text-left",
              flowId === item.id
                ? "border-foreground bg-card"
                : "border-border hover:bg-muted/60"
            )}
          >
            <p className="font-medium">{item.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {item.description}
            </p>
          </button>
        ))}
      </div>
      <div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={running} onClick={() => run("success")}>
            Run success path
          </Button>
          <Button
            variant="outline"
            disabled={running}
            onClick={() => run("failure")}
          >
            Run failure path
          </Button>
        </div>
        <ol className="mt-4 space-y-2">
          {flow.steps.map((step) => (
            <li key={`${step.method}-${step.path}-${step.note}`}>
              <button
                type="button"
                className="text-left text-sm"
                onClick={() => onSelectApi(step.api)}
              >
                <Badge variant="outline" className="mr-2 font-mono">
                  {step.method}
                </Badge>
                <span className="font-mono text-xs">{step.path}</span>
                <span className="ml-2 text-muted-foreground">{step.note}</span>
              </button>
            </li>
          ))}
        </ol>
        {steps.length > 0 ? (
          <div className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <div
                key={`${step.path}-${index}`}
                className={cn(
                  "rounded-xl border p-3",
                  step.ok ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50"
                )}
              >
                <p className="font-mono text-xs">
                  {step.method} {step.path} → {step.status}
                </p>
                <pre className="mt-2 max-h-40 overflow-auto text-[11px] leading-5">
                  {JSON.stringify(step.body, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
