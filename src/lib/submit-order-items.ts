type OrderItem = { item_id: string; quantity: number }

export async function submitOrderItems(
  items: OrderItem[],
  submit: (itemId: string) => Promise<{ commandId: string }>
) {
  if (!items.length || items.some((item) => !item.item_id.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
    throw new Error("The order must contain items with positive whole quantities.")
  }
  const commandIds: string[] = []
  for (const item of items) {
    for (let unit = 0; unit < item.quantity; unit += 1) {
      try {
        const result = await submit(item.item_id)
        commandIds.push(result.commandId)
      } catch (error) {
        if (!commandIds.length) throw error
        const reason = error instanceof Error ? error.message : "Submission failed."
        throw new Error(`${commandIds.length} item request(s) were accepted before submission stopped. Check Atlas before submitting again. ${reason}`)
      }
    }
  }
  return { commandIds }
}
