"use client"

import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Check, MapPin, Printer, ReceiptText, Utensils } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { dollars, type Check as RestaurantCheck, type KitchenTicket } from "@/lib/burgertown"
import { cn } from "@/lib/utils"

export type OrderCheck = { check: RestaurantCheck; ticket?: KitchenTicket }

export function readOrderChecks(responses: Record<string, unknown>[]): OrderCheck[] {
  const checks = new Map<string, OrderCheck>()
  for (const response of responses) {
    const check = (response.check ?? response) as RestaurantCheck
    if (!check || typeof check.id !== "string" || !Array.isArray(check.items) ||
      !check.totals || !Number.isFinite(check.totals.due_cents) ||
      !Number.isFinite(check.totals.subtotal_cents) || !Number.isFinite(check.totals.tax_cents) ||
      check.items.some((line) => !line || typeof line.name !== "string" || !Number.isFinite(line.price) || !Number.isFinite(line.quantity))) {
      throw new Error("Your order was submitted, but its check could not be displayed. Please check with the window before ordering again.")
    }
    checks.set(check.id, { check, ...(response.ticket ? { ticket: response.ticket as KitchenTicket } : {}) })
  }
  return [...checks.values()]
}

export function OrderCheckDisplay({ checks, preview = false }: { checks: OrderCheck[]; preview?: boolean }) {
  const inKitchen = checks.some(({ ticket }) => ticket)
  return (
    <section className="order-check-display" aria-label="Your order check">
      {preview ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm print:hidden">
          <span><strong>Check preview</strong> · Sample order. No new order has been placed.</span>
          <Link href="/order" className="font-medium underline underline-offset-4">Back to your bag</Link>
        </div>
      ) : null}
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_440px] lg:gap-16 print:block">
        <div className="lg:sticky lg:top-24 print:hidden">
          <span className="mb-6 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="size-7" strokeWidth={1.8} />
          </span>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Good food. Good call.</p>
          <h1 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
            {inKitchen ? <>Your order<br />is in.</> : <>Here’s<br />your check.</>}
          </h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">
            {inKitchen ? "We’ve got your order. Your check has all the delicious details — we’ll take it from here." : "All your Burgertown favorites, in one place. Here’s a little breakdown of your order."}
          </p>
          <div className="mt-8 rounded-2xl border bg-card/70 p-5">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">The Oak Street window</h2>
                <p className="mt-1 text-sm text-muted-foreground">412 Oak Street · Rivertown</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Pick up at the window, then find your favorite picnic table.</p>
              </div>
            </div>
            {inKitchen ? <div className="mt-5 flex items-center gap-3 border-t pt-4 text-sm"><Utensils className="size-5 text-primary" /><span>{checks.every(({ ticket }) => ticket?.status === "done") ? "Ready at the window" : "Sent to the kitchen"}</span></div> : null}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/menu" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}><ArrowLeft className="size-4" />Back to the menu</Link>
            <Button variant="ghost" onClick={() => window.print()}><Printer className="size-4" />Print check</Button>
          </div>
        </div>
        <div className="space-y-6">
          {checks.map(({ check, ticket }, index) => (
            <article key={check.id} className="relative overflow-hidden rounded-t-2xl border border-b-0 bg-card shadow-[0_12px_40px_-20px_rgba(60,35,15,0.3)] print:break-inside-avoid print:shadow-none">
              <div className="h-1.5 bg-primary" />
              <div className="px-6 pt-7 pb-9 sm:px-8">
                <div className="text-center">
                  <ReceiptText className="mx-auto size-6 text-primary" strokeWidth={1.5} />
                  <p className="mt-3 text-2xl font-black tracking-[-0.06em]">BURGER<span className="text-primary">TOWN</span></p>
                  <p className="mt-1 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">Smash burgers & good company</p>
                </div>
                <div className="mt-7 flex items-center justify-between gap-3 border-y border-dashed py-4">
                  <div><p className="text-[10px] tracking-widest text-muted-foreground uppercase">{checks.length > 1 ? `Check ${index + 1} of ${checks.length}` : "Your check"}</p><p className="mt-1 font-mono text-sm font-semibold">#{check.id.replace(/^chk_/, "").slice(-8).toUpperCase()}</p></div>
                  <span className={cn("rounded-full px-3 py-1.5 text-xs font-medium", check.status === "paid" ? "bg-emerald-100 text-emerald-800" : check.status === "voided" ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-900")}>
                    {check.status === "paid" ? "Paid" : check.status === "voided" ? "Voided" : "Payment due"}
                  </span>
                </div>
                <ul className="divide-y divide-border/60">
                  {check.items.map((line, lineIndex) => (
                    <li key={line.id ?? lineIndex} className="flex items-start gap-3 py-5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs">{line.quantity}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{line.name}</p>
                        {line.selections?.some((selection) => selection.name) ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{line.selections.filter((selection) => selection.name).map((selection) => selection.name).join(", ")}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">{dollars(line.price)} each</p>
                      </div>
                      <span className="pt-1 text-sm font-medium tabular-nums">{dollars(line.price * line.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="space-y-3 border-t border-dashed pt-5 text-sm">
                  <Amount label="Subtotal" value={check.totals.subtotal_cents} />
                  {check.totals.discount_cents > 0 ? <Amount label="Discount" value={-check.totals.discount_cents} /> : null}
                  {check.totals.reward_discount_cents > 0 ? <Amount label="Townie reward" value={-check.totals.reward_discount_cents} /> : null}
                  <Amount label="Tax" value={check.totals.tax_cents} />
                  {check.totals.delivery_fee_cents > 0 ? <Amount label="Delivery" value={check.totals.delivery_fee_cents} /> : null}
                  <div className="mt-5 flex items-baseline justify-between border-t pt-5"><dt className="font-semibold">{check.status === "open" ? "Total due" : "Order total"}</dt><dd className="text-3xl font-semibold tracking-tight tabular-nums">{dollars(check.totals.due_cents)}</dd></div>
                </dl>
                {check.status === "open" ? <p className="mt-3 text-xs leading-5 text-muted-foreground">This check is open. Payment has not been recorded.</p> : null}
                <div className="mt-7 border-t border-dashed pt-5 text-center">
                  <p className="text-sm font-medium">Thanks for stopping by.</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ticket ? "We’ll see you at the window." : "A little neighborhood. A lot of flavor."}</p>
                  <Link href="/rewards" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary print:hidden">Make it a regular thing. Join Townie Rewards <ArrowUpRight className="size-3" /></Link>
                </div>
              </div>
              <div className="h-3 bg-background [background-image:linear-gradient(135deg,transparent_50%,var(--color-card)_50%),linear-gradient(225deg,transparent_50%,var(--color-card)_50%)] [background-size:16px_16px] [background-position:0_-8px]" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Amount({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="tabular-nums">{dollars(value)}</dd></div>
}
