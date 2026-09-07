type OrderItem = { item_id: string; quantity: number }

// Keep an uncertain submission's identity across retries and page reloads.
export function getCheckoutAttempt(scope: string, items: OrderItem[], storage: Storage = sessionStorage) {
  const key = `burgertown:checkout:${scope}`
  const fingerprint = JSON.stringify(items.map(({ item_id, quantity }) => ({ item_id, quantity })))
  const saved = storage.getItem(key)
  const previous = saved ? JSON.parse(saved) : null
  if (previous?.fingerprint === fingerprint && typeof previous.orderId === "string") return previous.orderId as string
  const orderId = crypto.randomUUID()
  storage.setItem(key, JSON.stringify({ orderId, fingerprint }))
  return orderId
}

export function completeCheckoutAttempt(scope: string, orderId: string, storage: Storage = sessionStorage) {
  const key = `burgertown:checkout:${scope}`
  const saved = storage.getItem(key)
  if (saved && JSON.parse(saved).orderId === orderId) storage.removeItem(key)
}
