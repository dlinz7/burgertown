"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  api,
  type CatalogItem,
  type Guest,
  type Loyalty,
  type Selection,
} from "@/lib/burgertown"

const GUEST_KEY = "burgertown.guest"
const CART_KEY = "burgertown.cart"

export type CartLine = {
  key: string
  itemId: string
  name: string
  unitCents: number
  modifierIds: string[]
  modifierNames: string[]
  selections: Selection[]
  quantity: number
}

type Shop = {
  guest: Guest | null
  loyalty: Loyalty | null
  cart: CartLine[]
  cartCount: number
  cartCents: number
  ready: boolean
  addToCart: (
    item: CatalogItem,
    extras: { names: string[]; extraCents: number; selections: Selection[] }
  ) => void
  setQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  setGuest: (guest: Guest | null) => Promise<void>
  refreshLoyalty: () => Promise<void>
}

const ShopContext = createContext<Shop | null>(null)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [guest, setGuestState] = useState<Guest | null>(null)
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const rawGuest = localStorage.getItem(GUEST_KEY)
      const rawCart = localStorage.getItem(CART_KEY)
      const nextGuest = rawGuest ? (JSON.parse(rawGuest) as Guest) : null
      const nextCart = rawCart ? (JSON.parse(rawCart) as CartLine[]) : []
      queueMicrotask(() => {
        if (nextGuest) setGuestState(nextGuest)
        if (nextCart.length > 0) setCart(nextCart)
        setReady(true)
      })
    } catch {
      queueMicrotask(() => setReady(true))
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart, ready])

  const refreshLoyalty = useCallback(async () => {
    if (!guest) return
    const account = await api.loyalty(guest.id).catch(() => null)
    setLoyalty(account)
  }, [guest])

  useEffect(() => {
    if (!guest) {
      const timer = window.setTimeout(() => setLoyalty(null), 0)
      return () => window.clearTimeout(timer)
    }
    let cancelled = false
    void api
      .loyalty(guest.id)
      .then((account) => {
        if (!cancelled) setLoyalty(account)
      })
      .catch(() => {
        if (!cancelled) setLoyalty(null)
      })
    return () => {
      cancelled = true
    }
  }, [guest])

  const setGuest = useCallback(async (next: Guest | null) => {
    setGuestState(next)
    if (next) localStorage.setItem(GUEST_KEY, JSON.stringify(next))
    else localStorage.removeItem(GUEST_KEY)
  }, [])

  const addToCart = useCallback(
    (
      item: CatalogItem,
      extras: { names: string[]; extraCents: number; selections: Selection[] }
    ) => {
      const selectionKey = extras.selections
        .map((row) => `${row.option_id}:${row.qty}`)
        .sort()
        .join(",")
      const key = `${item.id}:${selectionKey}`
      setCart((current) => {
        const found = current.find((line) => line.key === key)
        if (found) {
          return current.map((line) =>
            line.key === key ? { ...line, quantity: line.quantity + 1 } : line
          )
        }
        return [
          ...current,
          {
            key,
            itemId: item.id,
            name: item.name,
            unitCents: item.price + extras.extraCents,
            modifierIds: extras.selections.map((row) => row.option_id),
            modifierNames: extras.names,
            selections: extras.selections,
            quantity: 1,
          },
        ]
      })
    },
    []
  )

  const setQuantity = useCallback((key: string, quantity: number) => {
    setCart((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) => (line.key === key ? { ...line, quantity } : line))
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const cartCents = cart.reduce((sum, line) => sum + line.unitCents * line.quantity, 0)

  const value = useMemo(
    () => ({
      guest,
      loyalty,
      cart,
      cartCount,
      cartCents,
      ready,
      addToCart,
      setQuantity,
      clearCart,
      setGuest,
      refreshLoyalty,
    }),
    [
      guest,
      loyalty,
      cart,
      cartCount,
      cartCents,
      ready,
      addToCart,
      setQuantity,
      clearCart,
      setGuest,
      refreshLoyalty,
    ]
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error("useShop must be used within ShopProvider")
  return value
}
