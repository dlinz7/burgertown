"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useShop } from "@/components/shop-provider"
import { OrderCheckDisplay, readOrderChecks, type OrderCheck } from "@/components/order-check"
import {
  ApiError,
  PUNCHES_FOR_FREE,
  api,
  dollars,
  failMessage,
  type CatalogItem,
  type InventoryRow,
  type Location,
  type Menu,
  type ModifierGroup,
  type Selection,
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

  return { data, error, loading, reload: () => setNonce((n) => n + 1) }
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
    return <p className="text-sm text-muted-foreground">Checking hours…</p>
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
              <p className="mt-3 text-xs text-destructive">Sold out tonight</p>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

export function DinnerMenu() {
  const { addToCart } = useShop()
  const { data, error, loading } = useLoad(async () => {
    const [menu, items, stock, groups] = await Promise.all([
      api.menu(),
      api.items(),
      api.inventory(),
      api.modifierGroups(),
    ])
    return {
      menu: menu as Menu,
      items: items.data,
      stock: stock.data as InventoryRow[],
      groups: groups.data as ModifierGroup[],
    }
  })
  const [picked, setPicked] = useState<Record<string, Record<string, string[]>>>({})
  const [held, setHeld] = useState<Record<string, string[]>>({})

  function groupState(itemId: string, group: ModifierGroup) {
    const current = picked[itemId]?.[group.id]
    if (current) return current
    return group.options.filter((row) => row.default).map((row) => row.id)
  }

  function setGroup(itemId: string, group: ModifierGroup, optionId: string) {
    setPicked((current) => {
      const item = current[itemId] ?? {}
      if (group.selection_type === "single") {
        return { ...current, [itemId]: { ...item, [group.id]: [optionId] } }
      }
      const next = new Set(item[group.id] ?? groupState(itemId, group))
      if (next.has(optionId)) next.delete(optionId)
      else next.add(optionId)
      return { ...current, [itemId]: { ...item, [group.id]: [...next] } }
    })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading the board…</p>
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "Menu unavailable"}</p>
  }

  return (
    <div className="space-y-10">
      {data.menu.categories.map((category) => (
        <section key={category.id}>
          <h2 className="text-xl font-semibold">{category.name}</h2>
          <ul className="mt-4 divide-y rounded-2xl border bg-card">
            {category.item_ids.map((itemId) => {
              const item = data.items.find((row) => row.id === itemId)
              if (!item) return null
              const stock = data.stock.find((row) => row.item_id === item.id)
              const soldOut = Boolean(stock?.is_86)
              const groups = data.groups.filter((group) =>
                item.modifier_group_ids.includes(group.id)
              )
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="tabular-nums text-sm">{dollars(item.price)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    {soldOut ? (
                      <p className="mt-1 text-xs text-destructive">Sold out tonight</p>
                    ) : null}
                    {groups.length > 0 && !soldOut
                      ? groups.map((group) => {
                          const selected = groupState(item.id, group)
                          if (group.id === "modg_default") {
                            return (
                              <div key={group.id} className="mt-2 flex flex-wrap gap-2">
                                {group.options.map((option) => {
                                  const on = !(held[item.id] ?? []).includes(option.id)
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() =>
                                        setHeld((current) => {
                                          const next = new Set(current[item.id] ?? [])
                                          if (next.has(option.id)) next.delete(option.id)
                                          else next.add(option.id)
                                          return { ...current, [item.id]: [...next] }
                                        })
                                      }
                                      className={cn(
                                        "rounded-full border px-2.5 py-1 text-xs",
                                        on
                                          ? "border-primary bg-primary/10 text-foreground"
                                          : "text-muted-foreground line-through hover:bg-muted"
                                      )}
                                    >
                                      {on ? option.name : `No ${option.name.toLowerCase()}`}
                                    </button>
                                  )
                                })}
                              </div>
                            )
                          }
                          return (
                            <div key={group.id} className="mt-2">
                              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                                {group.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {group.options.map((option) => {
                                  const on = selected.includes(option.id)
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      disabled={option.is_86}
                                      onClick={() => setGroup(item.id, group, option.id)}
                                      className={cn(
                                        "rounded-full border px-2.5 py-1 text-xs",
                                        option.is_86 && "cursor-not-allowed opacity-50",
                                        on
                                          ? "border-primary bg-primary/10 text-foreground"
                                          : "text-muted-foreground hover:bg-muted"
                                      )}
                                    >
                                      {option.name}
                                      {option.price_delta_cents > 0
                                        ? ` +${dollars(option.price_delta_cents)}`
                                        : ""}
                                      {option.is_86 ? " (86)" : ""}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={soldOut}
                    onClick={() => {
                      const removed = held[item.id] ?? []
                      const selections: Selection[] = []
                      const names: string[] = []
                      let extra = 0
                      for (const group of groups) {
                        if (group.id === "modg_default") {
                          for (const option of group.options) {
                            if (removed.includes(option.id)) continue
                            selections.push({
                              group_id: group.id,
                              option_id: option.id,
                              qty: 1,
                            })
                          }
                          continue
                        }
                        for (const optionId of groupState(item.id, group)) {
                          const option = group.options.find((row) => row.id === optionId)
                          if (!option || option.is_86) continue
                          selections.push({
                            group_id: group.id,
                            option_id: option.id,
                            qty: 1,
                          })
                          extra += option.price_delta_cents
                          if (!option.default || option.price_delta_cents > 0) {
                            names.push(option.name)
                          }
                        }
                      }
                      for (const optionId of removed) {
                        const option = groups
                          .flatMap((group) => group.options)
                          .find((row) => row.id === optionId)
                        if (option) names.push(`No ${option.name.toLowerCase()}`)
                      }
                      addToCart(item, {
                        names,
                        extraCents: extra,
                        selections,
                      })
                      toast.success(`${item.name} added to your bag`)
                    }}
                  >
                    {soldOut ? "Sold out" : "Add to bag"}
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

export function BagAndCheckout() {
  const { cart, setQuantity, cartCents, guest, loyalty, clearCart } = useShop()
  const [working, setWorking] = useState(false)
  const [orderChecks, setOrderChecks] = useState<OrderCheck[]>([])
  const submitting = useRef(false)

  async function checkout() {
    if (cart.length === 0 || submitting.current) return
    submitting.current = true
    setWorking(true)
    try {
      const response = await api.submitCardOrder(
        cart.map((line) => ({ item_id: line.itemId, quantity: line.quantity }))
      )
      setOrderChecks(readOrderChecks(response.results))
      clearCart()
      toast.success("Your check is ready")
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      submitting.current = false
      setWorking(false)
    }
  }

  if (orderChecks.length > 0) return <OrderCheckDisplay checks={orderChecks} />

  if (cart.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Your bag is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a Townie from the board, then pay here. We’ll have it at the window.
        </p>
        <Link href="/menu" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          See the menu
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your bag</h1>
        <p className="mt-2 text-muted-foreground">
          Pickup at the walk-up window. No table service — picnic tables are first
          come, first served.
        </p>
        <ul className="mt-6 divide-y rounded-2xl border bg-card">
          {cart.map((line) => (
            <li key={line.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">
                  {line.quantity}× {line.name}
                </p>
                {line.modifierNames.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {line.modifierNames.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <p className="tabular-nums text-sm">
                  {dollars(line.unitCents * line.quantity)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(line.key, line.quantity - 1)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-2xl border bg-card p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Pickup
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          412 Oak Street · pay by card · we’ll call your name
        </p>
        {guest ? (
          <p className="mt-3 text-sm">
            Punch card: {guest.name}
            {loyalty ? ` · ${loyalty.points} pts · ${loyalty.tier}` : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            <Link href="/rewards" className="underline">
              Join Townie Rewards
            </Link>{" "}
            before you pay to start a punch card.
          </p>
        )}
        <div className="mt-4 flex justify-between text-sm font-medium">
          <span>Subtotal</span>
          <span className="tabular-nums">{dollars(cartCents)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Tax added at the window.</p>
        <Button
          type="button"
          className="mt-5 w-full"
          disabled={working}
          onClick={() => void checkout()}
        >
          {working ? "Processing…" : "Pay with card"}
        </Button>
      </aside>
    </div>
  )
}

export function RewardsClub() {
  const { guest, loyalty, setGuest } = useShop()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [working, setWorking] = useState<string | null>(null)

  async function join() {
    setWorking("join")
    try {
      const created = await api.createGuest({ name, email, phone })
      await setGuest(created)
      toast.success("You’re on Townie Rewards.")
      setName("")
      setEmail("")
      setPhone("")
    } catch (err) {
      if (err instanceof ApiError && err.code === "guest_exists") {
        toast.error("That email already has a card. Sign in below.")
      } else {
        toast.error(failMessage(err))
      }
    } finally {
      setWorking(null)
    }
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const lookup = String(form.get("email") ?? "")
    setWorking("in")
    try {
      const found = await api.guests(lookup)
      const match = found.data[0]
      if (!match) {
        toast.error("No punch card for that email.")
        return
      }
      await setGuest(match)
      toast.success(`Welcome back, ${match.name}.`)
    } catch (err) {
      toast.error(failMessage(err))
    } finally {
      setWorking(null)
    }
  }

  const punches = loyalty?.punches ?? 0
  const filled = Math.min(punches, PUNCHES_FOR_FREE)

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Townie Rewards
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Ten punches. Fries on us.
        </h1>
        <p className="mt-3 text-muted-foreground">
          One punch per paid visit. Points stack too — a dollar of food is a
          point, gold townies earn 1.5×. Spend points on fries or five bucks
          off at checkout.
        </p>
        {guest && loyalty ? (
          <div className="mt-8 rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{guest.name}</p>
            <p className="mt-1 text-2xl font-semibold">{loyalty.points} points</p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {loyalty.tier} townie
            </p>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: PUNCHES_FOR_FREE }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full border text-xs",
                    index < filled
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {filled >= PUNCHES_FOR_FREE
                ? "Show this at the window for fries."
                : `${PUNCHES_FOR_FREE - filled} more until free fries.`}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => void setGuest(null)}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <form
            className="mt-8 space-y-4 rounded-2xl border bg-card p-6"
            onSubmit={(event) => {
              event.preventDefault()
              void join()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={working === "join"}>
              Join Townie Rewards
            </Button>
          </form>
        )}
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Already got a card?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the email on your punch card. Maya Chen is{" "}
          <span className="text-foreground">maya@example.com</span> if you want
          to peek at a gold-path regular.
        </p>
        <form className="mt-5 space-y-3" onSubmit={signIn}>
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            name="email"
            type="email"
            defaultValue="maya@example.com"
            className="h-10"
            required
          />
          <Button type="submit" variant="outline" disabled={working === "in"}>
            Open my card
          </Button>
        </form>
      </div>
    </div>
  )
}
