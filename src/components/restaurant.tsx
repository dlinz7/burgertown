"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  ApiError,
  api,
  dollars,
  failMessage,
  type CatalogItem,
  type Check,
  type Employee,
  type Guest,
  type KitchenTicket,
  type Location,
  type Loyalty,
  type Menu,
  type Modifier,
  type Receipt,
  type Table,
} from "@/lib/burgertown"
import { cn } from "@/lib/utils"

function useLoad<T>(loader: () => Promise<T>) {
  const loaderRef = useRef(loader)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    loaderRef.current = loader
  })

  useEffect(() => {
    let cancelled = false
    loaderRef
      .current()
      .then((value) => {
        if (!cancelled) {
          setData(value)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(failMessage(err))
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const reload = useCallback((opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true)
    setNonce((value) => value + 1)
  }, [])

  return { data, error, loading, reload }
}

export function LocationBanner() {
  const { data, error, loading } = useLoad(() => api.location())
  if (loading) {
    return <p className="text-sm text-muted-foreground">Looking up Oak Street…</p>
  }
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">{error ?? "Location unavailable"}</p>
    )
  }
  const loc: Location = data
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      {loc.address.street}, {loc.address.city}, {loc.address.region}{" "}
      {loc.address.postal_code}
      <span className="mx-2 text-border">·</span>
      {loc.phone}
    </p>
  )
}

export function LocationHours() {
  const { data, error, loading } = useLoad(() => api.location())
  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking the window hours…</p>
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "Hours unavailable"}</p>
  }
  return (
    <ul className="space-y-1.5 text-sm">
      {data.hours.map((row) => (
        <li key={row.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{row.label}</span>
          <span>{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function FeaturedMenu() {
  const { data, error, loading } = useLoad(async () => {
    const [menu, items, stock] = await Promise.all([
      api.menu(),
      api.items(),
      api.inventory(),
    ])
    return { menu, items: items.data, stock: stock.data }
  })

  if (loading) {
    return <p className="text-sm text-muted-foreground">Pulling tonight’s board…</p>
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "Menu unavailable"}</p>
  }

  const burgers = data.menu.categories.find((row) => row.id === "cat_burgers")
  const featured = (burgers?.item_ids ?? [])
    .map((id) => data.items.find((item) => item.id === id))
    .filter((item): item is CatalogItem => Boolean(item))
    .slice(0, 3)

  if (featured.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the board yet.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {featured.map((item) => {
        const row = data.stock.find((s) => s.item_id === item.id)
        return (
          <article key={item.id} className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="tabular-nums">{dollars(item.price)}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
            {row?.is_86 ? (
              <p className="mt-3 text-xs text-destructive">86’d tonight</p>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function guestName(guests: Guest[], guestId: string | null) {
  if (!guestId) return null
  return guests.find((row) => row.id === guestId)?.name ?? null
}

export function FloorPlan({ compact = false }: { compact?: boolean }) {
  const { data, error, loading } = useLoad(async () => {
    const [tables, checks, guests] = await Promise.all([
      api.tables(),
      api.checks("open"),
      api.guests(),
    ])
    return { tables: tables.data, checks: checks.data, guests: guests.data }
  })

  if (loading) {
    return <p className="text-sm text-muted-foreground">Reading the floor…</p>
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "Floor unavailable"}</p>
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"
      )}
    >
      {data.tables.map((table: Table) => {
        const check = data.checks.find((row) => row.id === table.check_id)
        const name = guestName(data.guests, check?.guest_id ?? null)
        return (
          <Link
            key={table.id}
            href={`/tables/${table.id}`}
            className={cn(
              "rounded-2xl border p-4 transition-colors hover:bg-muted/60",
              table.status === "occupied"
                ? "border-primary/40 bg-card"
                : "bg-card"
            )}
          >
            <p className="font-semibold">{table.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {table.status === "occupied"
                ? name
                  ? `${name} · ${check?.items.length ?? 0} items`
                  : `Seated · ${check?.items.length ?? 0} items`
                : `${table.seats} seats · open`}
            </p>
          </Link>
        )
      })}
    </div>
  )
}

export function MenuBoard({ tableId }: { tableId?: string }) {
  const { data, error, loading, reload } = useLoad(async () => {
    const [menu, items, stock, modifiers, tables] = await Promise.all([
      api.menu(),
      api.items(),
      api.inventory(),
      api.modifiers(),
      api.tables(),
    ])
    return {
      menu: menu as Menu,
      items: items.data,
      stock: stock.data,
      modifiers: modifiers.data,
      tables: tables.data,
    }
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, string[]>>({})

  const table = data?.tables.find((row) => row.id === tableId)

  async function add(item: CatalogItem) {
    if (!tableId) {
      toast.error("Pick a table first")
      return
    }
    setBusy(item.id)
    try {
      const current = await api.table(tableId)
      let checkId = current.check_id
      if (!checkId) {
        const opened = await api.openCheck(tableId)
        checkId = opened.id
      }
      await api.addItem(checkId, item.id, picked[item.id] ?? [])
      toast.success(`${item.name} added to the ticket`)
      reload({ quiet: true })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add that")
    } finally {
      setBusy(null)
    }
  }

  function toggleMod(itemId: string, modifierId: string) {
    setPicked((current) => {
      const next = new Set(current[itemId] ?? [])
      if (next.has(modifierId)) next.delete(modifierId)
      else next.add(modifierId)
      return { ...current, [itemId]: [...next] }
    })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading the board…</p>
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "Menu unavailable"}</p>
  }

  const addOns = data.modifiers.filter((row) => row.group_id === "modg_add")

  return (
    <div className="space-y-10">
      {!tableId ? (
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Sit down first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tickets belong to a picnic table. Pick one to start ordering.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.tables.map((row) => (
              <Link
                key={row.id}
                href={`/menu?table=${row.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {row.label}
                {row.status === "occupied" ? " · seated" : ""}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ordering for {table?.label ?? "this table"}.{" "}
          <Link href={`/tables/${tableId}`} className="underline">
            View ticket
          </Link>
        </p>
      )}

      {data.menu.categories.map((category) => (
        <section key={category.id}>
          <h2 className="text-xl font-semibold">{category.name}</h2>
          <ul className="mt-4 divide-y rounded-2xl border bg-card">
            {category.item_ids.map((itemId) => {
              const item = data.items.find((row) => row.id === itemId)
              if (!item) return null
              const stock = data.stock.find((row) => row.item_id === item.id)
              const soldOut = Boolean(stock?.is_86)
              const canMod = item.modifier_group_ids.includes("modg_add")
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="tabular-nums text-sm">{dollars(item.price)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    {soldOut ? (
                      <p className="mt-1 text-xs text-destructive">86’d — sold out</p>
                    ) : null}
                    {canMod && !soldOut ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {addOns.map((mod) => {
                          const on = (picked[item.id] ?? []).includes(mod.id)
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => toggleMod(item.id, mod.id)}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs",
                                on
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {mod.name} +{dollars(mod.price)}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={soldOut || !tableId || busy === item.id}
                    onClick={() => add(item)}
                  >
                    {soldOut ? "Sold out" : "Add to ticket"}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

type Visit = {
  table: Table
  check: Check | null
  receipt: Receipt | null
  loyalty: Loyalty | null
  guest: Guest | null
  server: Employee | null
  modifiers: Modifier[]
}

async function loadVisit(
  tableId: string,
  fallbackCheckId: string | null
): Promise<Visit> {
  const [nextTable, staff, mods] = await Promise.all([
    api.table(tableId),
    api.employees(),
    api.modifiers(),
  ])
  const checkId = nextTable.check_id ?? fallbackCheckId
  if (!checkId) {
    return {
      table: nextTable,
      check: null,
      receipt: null,
      loyalty: null,
      guest: null,
      server: null,
      modifiers: mods.data,
    }
  }
  const nextCheck = await api.check(checkId)
  const server = staff.data.find((row) => row.id === nextCheck.server_id) ?? null
  const receipt =
    nextCheck.status === "paid" && nextCheck.receipt_id
      ? await api.receiptForCheck(nextCheck.id)
      : null
  let loyalty: Loyalty | null = null
  let guest: Guest | null = null
  if (nextCheck.guest_id) {
    ;[loyalty, guest] = await Promise.all([
      api.loyalty(nextCheck.guest_id).catch(() => null),
      api.guest(nextCheck.guest_id).catch(() => null),
    ])
  }
  return {
    table: nextTable,
    check: nextCheck,
    receipt,
    loyalty,
    guest,
    server,
    modifiers: mods.data,
  }
}

export function TableVisit({ tableId }: { tableId: string }) {
  const submitting = useRef(false)
  const [commandId, setCommandId] = useState<string | null>(null)
  const paidCheckId = useRef<string | null>(null)
  const { data, error, loading, reload } = useLoad(() =>
    loadVisit(tableId, paidCheckId.current)
  )
  const [working, setWorking] = useState<string | null>(null)
  const check = data?.check ?? null
  const table = data?.table ?? null
  const receipt = data?.receipt ?? null
  const loyalty = data?.loyalty ?? null
  const guest = data?.guest ?? null
  const server = data?.server ?? null
  const modifiers = data?.modifiers ?? []

  async function seat() {
    setWorking("seat")
    try {
      paidCheckId.current = null
      await api.openCheck(tableId)
      toast.success("Table seated")
      reload({ quiet: true })
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      setWorking(null)
    }
  }

  async function fire() {
    if (!check) return
    setWorking("fire")
    try {
      await api.send(check.id)
      toast.success("Ticket sent to the kitchen")
      reload({ quiet: true })
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      setWorking(null)
    }
  }

  async function discount() {
    if (!check) return
    setWorking("discount")
    try {
      await api.applyDiscount(check.id, "LOCAL10")
      toast.success("Local 10% applied")
      reload({ quiet: true })
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      setWorking(null)
    }
  }

  async function pay() {
    if (!check || submitting.current) return
    submitting.current = true
    setWorking("pay")
    try {
      const result = await api.submitCardOrder(check.items)
      setCommandId(result.commandIds[0])
      toast.success("Request submitted")
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      submitting.current = false
      setWorking(null)
    }
  }

  async function addTip(percent: number) {
    if (!receipt) return
    setWorking("tip")
    try {
      const amount = Math.round(receipt.subtotal_cents * (percent / 100))
      await api.tip(receipt.payment_id, amount)
      toast.success(`Tip added (${percent}%)`)
      reload({ quiet: true })
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      setWorking(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading the table…</p>
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  const unsent = check?.items.filter((line) => !line.sent) ?? []
  const hasLocal = Boolean(check?.discount_ids.includes("dsc_local10"))

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {table?.label} · {table?.seats} seats
          {server ? ` · ${server.name}` : ""}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {check?.status === "paid"
            ? "Thanks — you’re paid up"
            : check
              ? guest
                ? `${guest.name}’s ticket`
                : "Your ticket"
              : "This table is open"}
        </h1>
        {!check ? (
          <div className="mt-6 space-y-4">
            <p className="max-w-md text-muted-foreground">
              Seat the table to start a ticket, then add burgers from the menu.
            </p>
            <Button type="button" onClick={seat} disabled={working === "seat"}>
              Seat table
            </Button>
          </div>
        ) : (
          <ul className="mt-6 divide-y rounded-2xl border bg-card">
            {check.items.length === 0 ? (
              <li className="px-4 py-8 text-sm text-muted-foreground">
                Ticket is empty.{" "}
                <Link href={`/menu?table=${tableId}`} className="underline">
                  Add from the menu
                </Link>
                .
              </li>
            ) : (
              check.items.map((line) => {
                const extras = (line.modifier_ids ?? [])
                  .map((id) => modifiers.find((row) => row.id === id)?.name)
                  .filter(Boolean)
                return (
                  <li
                    key={line.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {line.quantity}× {line.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {extras.length > 0 ? `${extras.join(", ")} · ` : ""}
                        {line.sent ? "In the kitchen" : "Not fired yet"}
                      </p>
                    </div>
                    <p className="tabular-nums text-sm">
                      {dollars(line.price * line.quantity)}
                    </p>
                  </li>
                )
              })
            )}
          </ul>
        )}
        {check?.status === "open" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/menu?table=${tableId}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Add food
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={fire}
              disabled={unsent.length === 0 || working === "fire"}
            >
              Send to kitchen
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={discount}
              disabled={hasLocal || working === "discount"}
            >
              {hasLocal ? "Local 10% on" : "Local 10%"}
            </Button>
          </div>
        ) : null}
      </div>

      <aside className="h-fit rounded-2xl border bg-card p-5">
        {check ? (
          <>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Totals
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">
                  {dollars(check.totals.subtotal_cents)}
                </dd>
              </div>
              {check.totals.discount_cents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular-nums">
                    −{dollars(check.totals.discount_cents)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">{dollars(check.totals.tax_cents)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Due</dt>
                <dd className="tabular-nums">{dollars(check.totals.due_cents)}</dd>
              </div>
            </dl>
            {loyalty ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Punch card: {loyalty.punches} · {loyalty.points} points
              </p>
            ) : null}
            {check.status === "open" ? (
              <Button
                type="button"
                className="mt-5 w-full"
                onClick={pay}
                disabled={check.items.length === 0 || working === "pay"}
              >
                {working === "pay" ? "Submitting…" : "Pay with card"}
              </Button>
            ) : null}
            {commandId ? (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                Request submitted. Payment has not been confirmed.
              </p>
            ) : null}
            {receipt ? (
              <div className="mt-5 border-t pt-4">
                <p className="font-medium">Receipt</p>
                <p className="mt-1 text-sm tabular-nums">
                  Total {dollars(receipt.total_cents)}
                  {receipt.tip_cents > 0
                    ? ` including ${dollars(receipt.tip_cents)} tip`
                    : null}
                </p>
                {receipt.tip_cents === 0 && receipt.tip_eligible ? (
                  <>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Add a tip for {server?.name ?? "the window"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {[15, 20, 25].map((percent) => (
                        <Button
                          key={percent}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={working === "tip"}
                          onClick={() => addTip(percent)}
                        >
                          {percent}%
                        </Button>
                      ))}
                    </div>
                  </>
                ) : null}
                {table?.status === "open" && !table.check_id ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={seat}
                    disabled={working === "seat"}
                  >
                    Seat next party
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No ticket yet. Seat the table to start one.
          </p>
        )}
      </aside>
    </div>
  )
}

const TICKET_NEXT: Record<KitchenTicket["status"], KitchenTicket["status"] | null> = {
  queued: "fired",
  fired: "done",
  done: null,
}

export function KitchenBoard() {
  const { data, error, loading, reload } = useLoad(async () => {
    const [tickets, checks, tables] = await Promise.all([
      api.tickets(),
      api.checks(),
      api.tables(),
    ])
    return { tickets: tickets.data, checks: checks.data, tables: tables.data }
  })
  const [busy, setBusy] = useState<string | null>(null)

  async function bump(ticket: KitchenTicket) {
    const next = TICKET_NEXT[ticket.status]
    if (!next) return
    setBusy(ticket.id)
    try {
      await api.bumpTicket(ticket.id, next)
      toast.success(next === "fired" ? "Firing" : "Bumped")
      reload({ quiet: true })
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading the rail…</p>
  }
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">{error ?? "Kitchen unavailable"}</p>
    )
  }

  const columns: KitchenTicket["status"][] = ["queued", "fired", "done"]
  const labels: Record<KitchenTicket["status"], string> = {
    queued: "Expo",
    fired: "On the flat-top",
    done: "Window",
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((status) => {
        const tickets = data.tickets.filter((row) => row.status === status)
        return (
          <section key={status} className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">{labels[status]}</h2>
            {tickets.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {tickets.map((ticket) => {
                  const check = data.checks.find((row) => row.id === ticket.check_id)
                  const table = data.tables.find((row) => row.id === check?.table_id)
                  const lines = (ticket.item_ids ?? [])
                    .map((id) => check?.items.find((line) => line.id === id))
                    .filter(Boolean)
                  return (
                    <li key={ticket.id} className="rounded-xl border bg-background p-3">
                      <p className="text-sm font-medium">
                        {table?.label ?? "Walk-up"}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {lines.length === 0 ? (
                          <li>Ticket {ticket.id}</li>
                        ) : (
                          lines.map((line) => (
                            <li key={line!.id}>
                              {line!.quantity}× {line!.name}
                            </li>
                          ))
                        )}
                      </ul>
                      {TICKET_NEXT[status] ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          disabled={busy === ticket.id}
                          onClick={() => bump(ticket)}
                        >
                          {status === "queued" ? "Fire" : "Bump"}
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
