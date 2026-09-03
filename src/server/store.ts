import { createSeed, type Check, type Store } from "@/server/seed"
import { randomUUID } from "crypto"

let store: Store = createSeed()

export function getStore() {
  return store
}

export function resetStore() {
  store = createSeed()
  return store
}

function id(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "HttpError"
  }
}

export function jsonError(error: HttpError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {},
    },
  }
}

export function checkTotals(check: Check) {
  const subtotal = check.items.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  )
  const discount = check.discount_ids.reduce((sum, discountId) => {
    const row = store.discounts.find((d) => d.id === discountId)
    return sum + (row ? Math.round(subtotal * (row.percent / 100)) : 0)
  }, 0)
  const taxed = subtotal - discount
  const tax = Math.round(
    taxed *
      store.taxes
        .filter((t) => t.location_id === check.location_id)
        .reduce((sum, t) => sum + t.rate, 0)
  )
  return {
    subtotal_cents: subtotal,
    discount_cents: discount,
    tax_cents: tax,
    due_cents: taxed + tax,
  }
}

export function presentItem(item: Store["items"][number]) {
  return item
}

export function requireLocation(idValue: string) {
  const row = store.locations.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "location_not_found", "Location not found")
  return row
}

export function requireTable(idValue: string) {
  const row = store.tables.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "table_not_found", "Table not found")
  return row
}

export function requireMenu(idValue: string) {
  const row = store.menus.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "menu_not_found", "Menu not found")
  return row
}

export function requireItem(idValue: string) {
  const row = store.items.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "item_not_found", "Catalog item not found")
  return row
}

export function requireGuest(idValue: string) {
  const row = store.guests.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "guest_not_found", "Guest not found")
  return row
}

export function requireCheck(idValue: string) {
  const row = store.checks.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "check_not_found", "Check not found")
  return row
}

export function requirePayment(idValue: string) {
  const row = store.payments.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "payment_not_found", "Payment not found")
  return row
}

export function requireCharge(idValue: string) {
  const row = store.charges.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "charge_not_found", "Charge not found")
  return row
}

export function requireInvoice(idValue: string) {
  const row = store.invoices.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "invoice_not_found", "Invoice not found")
  return row
}

export function requireReceipt(idValue: string) {
  const row = store.receipts.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "receipt_not_found", "Receipt not found")
  return row
}

export function requireRefund(idValue: string) {
  const row = store.refunds.find((row) => row.id === idValue)
  if (!row) throw new HttpError(404, "refund_not_found", "Refund not found")
  return row
}

export function presentCheck(check: Check) {
  return {
    ...check,
    totals: checkTotals(check),
  }
}

export function createCheck(input: {
  location_id: string
  table_id: string
  server_id: string
  guest_id?: string
}) {
  requireLocation(input.location_id)
  const table = requireTable(input.table_id)
  if (table.status === "occupied" && table.check_id) {
    throw new HttpError(409, "table_occupied", "Table already has an open check", {
      check_id: table.check_id,
    })
  }
  const employee = store.employees.find((row) => row.id === input.server_id)
  if (!employee) throw new HttpError(404, "employee_not_found", "Employee not found")

  const check: Check = {
    id: id("chk"),
    location_id: input.location_id,
    table_id: input.table_id,
    guest_id: input.guest_id ?? null,
    server_id: input.server_id,
    status: "open",
    items: [],
    discount_ids: [],
    payment_ids: [],
    invoice_id: null,
    receipt_id: null,
    opened_at: new Date().toISOString(),
  }
  store.checks.push(check)
  table.status = "occupied"
  table.check_id = check.id
  return presentCheck(check)
}

export function addLineItem(
  checkId: string,
  input: { item_id: string; quantity?: number; modifier_ids?: string[] }
) {
  const check = requireCheck(checkId)
  if (check.status !== "open") {
    throw new HttpError(409, "check_not_open", "Check is not open")
  }
  const item = requireItem(input.item_id)
  const stock = store.inventory.find((row) => row.item_id === item.id)
  if (stock?.is_86) {
    throw new HttpError(409, "item_86", "Item is 86'd and cannot be ordered", {
      item_id: item.id,
    })
  }
  const quantity = input.quantity ?? 1
  const modifiers = (input.modifier_ids ?? []).map((modifierId) => {
    const modifier = store.modifiers.find((row) => row.id === modifierId)
    if (!modifier) throw new HttpError(404, "modifier_not_found", "Modifier not found")
    return modifier
  })
  const extra = modifiers.reduce((sum, modifier) => sum + modifier.price, 0)
  const line = {
    id: id("li"),
    item_id: item.id,
    name: item.name,
    quantity,
    price: item.price + extra,
    sent: false,
    modifier_ids: modifiers.map((modifier) => modifier.id),
  }
  check.items.push(line)
  return { line, check: presentCheck(check) }
}

export function sendOrder(checkId: string) {
  const check = requireCheck(checkId)
  if (check.status !== "open") {
    throw new HttpError(409, "check_not_open", "Check is not open")
  }
  const unsent = check.items.filter((line) => !line.sent)
  if (unsent.length === 0) {
    throw new HttpError(409, "nothing_to_send", "No unsent items on this check")
  }
  for (const line of unsent) {
    line.sent = true
    const stock = store.inventory.find((row) => row.item_id === line.item_id)
    if (stock) {
      stock.on_hand = Math.max(0, stock.on_hand - line.quantity)
      if (stock.on_hand === 0) stock.is_86 = true
    }
  }
  const ticket = {
    id: id("kds"),
    check_id: check.id,
    item_ids: unsent.map((line) => line.id),
    status: "queued" as const,
  }
  store.tickets.push(ticket)
  return { check: presentCheck(check), ticket }
}

export function applyDiscount(checkId: string, code: string) {
  const check = requireCheck(checkId)
  if (check.status !== "open") {
    throw new HttpError(409, "check_not_open", "Check is not open")
  }
  const discount = store.discounts.find(
    (row) => row.code.toLowerCase() === code.toLowerCase() || row.id === code
  )
  if (!discount) throw new HttpError(404, "discount_not_found", "Discount not found")
  if (!check.discount_ids.includes(discount.id)) {
    check.discount_ids.push(discount.id)
  }
  return presentCheck(check)
}

export function createPayment(input: {
  check_id: string
  method?: "card" | "gift_card"
  amount_cents?: number
  gift_card_id?: string
}) {
  const check = requireCheck(input.check_id)
  if (check.status !== "open") {
    throw new HttpError(409, "check_not_open", "Check is not open")
  }
  const due = checkTotals(check).due_cents
  const amount = input.amount_cents ?? due
  if (amount !== due) {
    throw new HttpError(422, "amount_mismatch", "amount_cents does not match check due", {
      due_cents: due,
      amount_cents: amount,
    })
  }
  const payment = {
    id: id("pay"),
    check_id: check.id,
    method: input.method ?? "card",
    amount_cents: amount,
    tip_cents: 0,
    status: "pending" as const,
    processor_charge_id: null,
    gift_card_id: input.gift_card_id ?? null,
  }
  store.payments.push(payment)
  check.payment_ids.push(payment.id)
  return payment
}

export function captureCharge(input: { payment_id: string; payment_method?: string }) {
  const payment = requirePayment(input.payment_id)
  const method = input.payment_method ?? "pm_ok"

  if (method === "pm_timeout") {
    throw new HttpError(504, "processor_timeout", "Processor timed out contacting the card network")
  }
  if (method === "pm_decline") {
    payment.status = "declined"
    const charge = {
      id: id("ch"),
      payment_id: payment.id,
      amount_cents: payment.amount_cents,
      status: "declined" as const,
      payment_method: method,
    }
    store.charges.push(charge)
    throw new HttpError(402, "card_declined", "Card was declined", {
      charge_id: charge.id,
      decline_code: "generic_decline",
    })
  }
  if (payment.status === "captured") {
    return store.charges.find((row) => row.id === payment.processor_charge_id)!
  }

  const charge = {
    id: id("ch"),
    payment_id: payment.id,
    amount_cents: payment.amount_cents,
    status: "succeeded" as const,
    payment_method: method,
  }
  store.charges.push(charge)
  payment.status = "captured"
  payment.processor_charge_id = charge.id
  const batch = store.settlements.find((row) => row.status === "open")
  if (batch && !batch.payment_ids.includes(payment.id)) {
    batch.payment_ids.push(payment.id)
  }
  return charge
}

export function postInvoice(input: { payment_id: string }) {
  const payment = requirePayment(input.payment_id)
  if (payment.status !== "captured") {
    throw new HttpError(409, "payment_not_captured", "Processor has not captured this payment")
  }
  const check = requireCheck(payment.check_id)
  const existing = store.invoices.find((row) => row.payment_id === payment.id)
  if (existing) return existing

  const invoice = {
    id: id("inv"),
    check_id: check.id,
    payment_id: payment.id,
    amount_cents: payment.amount_cents,
    posted_at: new Date().toISOString(),
  }
  store.invoices.push(invoice)
  check.invoice_id = invoice.id
  check.status = "paid"
  const table = store.tables.find((row) => row.id === check.table_id)
  if (table) {
    table.status = "open"
    table.check_id = null
  }

  const totals = checkTotals(check)
  const receipt = {
    id: id("rcp"),
    check_id: check.id,
    invoice_id: invoice.id,
    payment_id: payment.id,
    lines: check.items.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      amount_cents: line.price * line.quantity,
    })),
    subtotal_cents: totals.subtotal_cents,
    tax_cents: totals.tax_cents,
    discount_cents: totals.discount_cents,
    tip_cents: payment.tip_cents,
    total_cents: totals.due_cents + payment.tip_cents,
    tip_eligible: true,
  }
  store.receipts.push(receipt)
  check.receipt_id = receipt.id
  return invoice
}

export function addTip(paymentId: string, amountCents: number) {
  const payment = requirePayment(paymentId)
  if (payment.status !== "captured") {
    throw new HttpError(409, "payment_not_captured", "Payment not captured")
  }
  if (payment.tip_cents > 0) {
    throw new HttpError(409, "tip_already_added", "Tip already present")
  }
  payment.tip_cents = amountCents
  const receipt = store.receipts.find((row) => row.payment_id === payment.id)
  if (receipt) {
    receipt.tip_cents = amountCents
    receipt.total_cents += amountCents
  }
  return { payment, receipt: receipt ?? null }
}

export function requestRefund(input: { payment_id: string; amount_cents?: number }) {
  const payment = requirePayment(input.payment_id)
  if (payment.status !== "captured") {
    throw new HttpError(409, "not_refundable", "Payment is not captured")
  }
  const existing = store.refunds.find((row) => row.payment_id === payment.id)
  if (existing) return existing
  const refund = {
    id: id("rf"),
    payment_id: payment.id,
    check_id: payment.check_id,
    amount_cents: input.amount_cents ?? payment.amount_cents + payment.tip_cents,
    status: "accepted" as const,
    processor_refund_id: null,
  }
  store.refunds.push(refund)
  return refund
}

export function processorRefund(input: { charge_id: string; refund_id?: string }) {
  const charge = requireCharge(input.charge_id)
  if (charge.status === "refunded") {
    throw new HttpError(409, "already_refunded", "Charge already reversed")
  }
  const payment = requirePayment(charge.payment_id)
  const refund =
    (input.refund_id
      ? store.refunds.find((row) => row.id === input.refund_id)
      : store.refunds.find((row) => row.payment_id === payment.id)) ?? null
  if (!refund) {
    throw new HttpError(404, "refund_not_found", "POS has not accepted a refund for this charge")
  }
  const row = {
    id: id("prf"),
    charge_id: charge.id,
    refund_id: refund.id,
    amount_cents: refund.amount_cents,
    status: "succeeded" as const,
  }
  store.processorRefunds.push(row)
  charge.status = "refunded"
  payment.status = "refunded"
  refund.status = "reversed"
  refund.processor_refund_id = row.id
  return row
}

export function voidCheck(checkId: string) {
  const check = requireCheck(checkId)
  const refund = store.refunds.find(
    (row) => row.check_id === check.id && row.status === "reversed"
  )
  if (!refund) {
    throw new HttpError(
      409,
      "void_not_allowed",
      "Void requires a processor-reversed refund on this check"
    )
  }
  check.status = "voided"
  refund.status = "void_complete"
  const table = store.tables.find((row) => row.id === check.table_id)
  if (table && table.check_id === check.id) {
    table.status = "open"
    table.check_id = null
  }
  return {
    check_id: check.id,
    status: "voided" as const,
    refund_id: refund.id,
    confirmation: `VOID-${check.id.toUpperCase()}`,
    voided_at: new Date().toISOString(),
  }
}

export function earnLoyalty(guestId: string, paymentId: string) {
  const account = store.loyalty.find((row) => row.guest_id === guestId)
  if (!account) throw new HttpError(404, "account_not_found", "Loyalty account not found")
  const payment = requirePayment(paymentId)
  const earned = Math.floor(payment.amount_cents / 100)
  account.points += earned
  account.punches += 1
  return { ...account, earned }
}

export function redeemGiftCard(
  giftCardId: string,
  input: { payment_id: string; amount_cents: number }
) {
  const card = store.giftCards.find((row) => row.id === giftCardId)
  if (!card) throw new HttpError(404, "gift_card_not_found", "Gift card not found")
  if (card.balance_cents < input.amount_cents) {
    throw new HttpError(409, "insufficient_balance", "Gift card balance is too low", {
      balance_cents: card.balance_cents,
    })
  }
  const payment = requirePayment(input.payment_id)
  card.balance_cents -= input.amount_cents
  payment.method = "gift_card"
  payment.gift_card_id = card.id
  payment.status = "captured"
  return { gift_card: card, payment }
}

export function createWebhook(input: { url: string; events: string[] }) {
  if (!/^https?:\/\//i.test(input.url)) {
    throw new HttpError(400, "invalid_url", "url must start with http:// or https://")
  }
  const hook = {
    id: id("wh"),
    url: input.url,
    events: input.events ?? ["payment.captured"],
  }
  store.webhooks.push(hook)
  return hook
}

export function closeSettlement(settlementId: string) {
  const row = store.settlements.find((item) => item.id === settlementId)
  if (!row) throw new HttpError(404, "settlement_not_found", "Settlement not found")
  if (row.status === "closed") {
    throw new HttpError(409, "already_closed", "Batch already closed")
  }
  row.status = "closed"
  row.closed_at = new Date().toISOString()
  store.settlements.push({
    id: id("set"),
    status: "open",
    payment_ids: [],
    opened_at: new Date().toISOString(),
    closed_at: null,
  })
  return row
}

export function salesReport() {
  const paid = store.checks.filter((row) => row.status === "paid")
  const voided = store.checks.filter((row) => row.status === "voided")
  const captured = store.payments.filter((row) => row.status === "captured")
  const refunded = store.payments.filter((row) => row.status === "refunded")
  const net = captured.reduce((sum, row) => sum + row.amount_cents, 0)
  const tips = captured.reduce((sum, row) => sum + row.tip_cents, 0)
  const refunds = refunded.reduce(
    (sum, row) => sum + row.amount_cents + row.tip_cents,
    0
  )
  return {
    location_id: "loc_oak",
    checks_paid: paid.length,
    checks_voided: voided.length,
    net_sales_cents: net,
    tips_cents: tips,
    refunds_cents: refunds,
    currency: "USD",
  }
}

export function patchItem(
  itemId: string,
  patch: { price?: number; name?: string; is_active?: boolean }
) {
  const item = requireItem(itemId)
  if (patch.price !== undefined) item.price = patch.price
  if (patch.name !== undefined) item.name = patch.name
  if (patch.is_active !== undefined) item.is_active = patch.is_active
  return presentItem(item)
}

export function bumpTicket(
  ticketId: string,
  status: "queued" | "fired" | "done"
) {
  const ticket = store.tickets.find((row) => row.id === ticketId)
  if (!ticket) throw new HttpError(404, "ticket_not_found", "Kitchen ticket not found")
  ticket.status = status
  return ticket
}
