type OrderItem = { item_id: string; quantity: number }

export async function submitOrderItems<T>(
  items: OrderItem[],
  submit: (itemId: string, idempotencyKey: string) => Promise<T>,
  orderId: string
) {
  if (!items.length || items.some((item) => !item.item_id.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
    throw new Error("The order must contain items with positive whole quantities.")
  }
  const results: T[] = []
  for (const [line, item] of items.entries()) {
    for (let unit = 0; unit < item.quantity; unit += 1) {
      try {
        const result = await submit(item.item_id, `${orderId}:${line}:${unit}`)
        results.push(result)
      } catch (error) {
        if (!results.length) throw error
        const reason = error instanceof Error ? error.message : "Submission failed."
        throw new Error(`${results.length} item workflow(s) completed before the order stopped. Check Atlas before submitting again. ${reason}`)
      }
    }
  }
  return { results }
}
