import { HttpError, jsonError } from "@/server/errors"
import { resolveSelections } from "@/server/modifiers"
import { createSeed, type Check, type Fulfillment, type Store } from "@/server/seed"
import { randomUUID } from "crypto"

export { HttpError, jsonError }

let store: Store = createSeed()

/** Run a synchronous polling probe against its own disposable restaurant. */
export function withIsolatedDemoStore<T>(operation: () => T): T {
  const original = store
  store = createSeed()
  try {
    return operation()
  } finally {
    store = original
  }
}

export function getStore() {
  return store
}

export function resetStore(scope?: string[]) {
  const fresh = createSeed()
  if (!scope || scope.length === 0 || scope.includes("all")) {
    store = fresh
    return store
  }
  if (scope.includes("inventory")) store.inventory = fresh.inventory
  if (scope.includes("rewards")) {
    store.rewards = fresh.rewards
    store.ledger = fresh.ledger
    store.redemptions = fresh.redemptions
    store.offers = fresh.offers
  }
  if (scope.includes("delivery")) {
    store.deliveries = fresh.deliveries
    store.quotes = fresh.quotes
    store.tracking = fresh.tracking
    store.couriers = fresh.couriers
  }
  if (scope.includes("checks")) {
    store.checks = fresh.checks
    store.tickets = fresh.tickets
    store.payments = fresh.payments
    store.charges = fresh.charges
    store.invoices = fresh.invoices
    store.receipts = fresh.receipts
    store.refunds = fresh.refunds
    store.processorRefunds = fresh.processorRefunds
    store.fulfillments = fresh.fulfillments
    store.tables = fresh.tables
  }
  if (scope.includes("settlements")) store.settlements = fresh.settlements
  return store
}

function id(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`
}

function bumpVersion(check: Check) {
  check.version += 1
}

export function requireLocation(idValue: string) {
  const row = store.locations.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "location_not_found", "Location not found")
  return row
}

export function requireTable(idValue: string) {
  const row = store.tables.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "table_not_found", "Table not found")
  return row
}

export function requireMenu(idValue: string) {
  const row = store.menus.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "menu_not_found", "Menu not found")
  return row
}

export function requireItem(idValue: string) {
  const row = store.items.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "item_not_found", "Catalog item not found")
  return row
}

export function requireGuest(idValue: string) {
  const row = store.guests.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "guest_not_found", "Guest not found")
  return row
}

export function requireAddress(idValue: string) {
  const row = store.addresses.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "address_not_found", "Address not found")
  return row
}

export function requireFulfillment(idValue: string) {
  const row = store.fulfillments.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "fulfillment_not_found", "Fulfillment not found")
  return row
}

export function requireCheck(idValue: string) {
  const row = store.checks.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "check_not_found", "Check not found")
  return row
}

export function requirePayment(idValue: string) {
  const row = store.payments.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "payment_not_found", "Payment not found")
  return row
}

export function requireCharge(idValue: string) {
  const row = store.charges.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "charge_not_found", "Charge not found")
  return row
}

export function requireInvoice(idValue: string) {
  const row = store.invoices.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "invoice_not_found", "Invoice not found")
  return row
}

export function requireReceipt(idValue: string) {
  const row = store.receipts.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "receipt_not_found", "Receipt not found")
  return row
}

export function requireRefund(idValue: string) {
  const row = store.refunds.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "refund_not_found", "Refund not found")
  return row
}

export function requireDelivery(idValue: string) {
  const row = store.deliveries.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "delivery_not_found", "Delivery not found")
  return row
}

export function requireCourier(idValue: string) {
  const row = store.couriers.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "courier_not_found", "Courier not found")
  return row
}

export function requireOffer(idValue: string) {
  const row = store.offers.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "offer_not_found", "Offer not found")
  return row
}

export function requireGroup(idValue: string) {
  const row = store.modifierGroups.find((item) => item.id === idValue)
  if (!row) throw new HttpError(404, "group_not_found", "Modifier group not found")
  return row
}

export function requireRewards(guestId: string) {
  const row = store.rewards.find((item) => item.guest_id === guestId)
  if (!row) throw new HttpError(404, "account_not_found", "Rewards account not found")
  return row
}

export function zoneForAddress(addressId: string) {
  const address = requireAddress(addressId)
  return (
    store.zones.find((zone) => zone.postal_codes.includes(address.postal_code)) ?? null
  )
}

function fulfillmentFee(fulfillment: Fulfillment) {
  return fulfillment.delivery_fee_cents
}

export function checkTotals(check: Check) {
  const subtotal = check.items.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  )
  const discount = check.discount_ids.reduce((sum, discountId) => {
    const row = store.discounts.find((item) => item.id === discountId)
    return sum + (row ? Math.round(subtotal * (row.percent / 100)) : 0)
  }, 0)
  const reward = check.reward_discount_cents
  const ful = store.fulfillments.find((item) => item.id === check.fulfillment_id)
  const deliveryFee = ful ? fulfillmentFee(ful) : 0
  const taxed = Math.max(0, subtotal - discount - reward)
  const tax = Math.round(
    taxed *
      store.taxes
        .filter((item) => item.location_id === check.location_id)
        .reduce((sum, item) => sum + item.rate, 0)
  )
  return {
    subtotal_cents: subtotal,
    discount_cents: discount,
    reward_discount_cents: reward,
    delivery_fee_cents: deliveryFee,
    tax_cents: tax,
    due_cents: taxed + tax + deliveryFee,
  }
}

export function presentItem(item: Store["items"][number]) {
  return item
}

export function presentCheck(check: Check) {
  return {
    ...check,
    totals: checkTotals(check),
  }
}

export function presentRewards(account: Store["rewards"][number]) {
  return {
    ...account,
    points: account.points_balance,
    points_balance: account.points_balance,
  }
}

function tierFromSpend(cents: number): Store["rewards"][number]["tier"] {
  if (cents >= 50000) return "gold"
  if (cents >= 15000) return "silver"
  return "bronze"
}

const TIER_RANK = { bronze: 0, silver: 1, gold: 2 }

export function createGuest(input: {
  name?: string
  email?: string
  phone?: string
  location_id?: string
}) {
  const name = input.name?.trim() ?? ""
  const email = input.email?.trim().toLowerCase() ?? ""
  if (!name || !email) {
    throw new HttpError(422, "invalid_guest", "Name and email are required")
  }
  const existing = store.guests.find((row) => row.email.toLowerCase() === email)
  if (existing) {
    throw new HttpError(409, "guest_exists", "A punch card already uses that email", {
      guest_id: existing.id,
    })
  }
  const guest = {
    id: id("gst"),
    name,
    email,
    phone: input.phone?.trim() ?? "",
    location_id: input.location_id ?? "loc_oak",
    dietary_profile: { avoid: [] as string[], strict: false },
  }
  store.guests.push(guest)
  if (!store.rewards.some((row) => row.guest_id === guest.id)) {
    store.rewards.push({
      id: id("rwd"),
      guest_id: guest.id,
      points: 0,
      points_balance: 0,
      punches: 0,
      tier: "bronze",
      trailing_spend_cents: 0,
    })
  }
  return guest
}

export function createAddress(
  guestId: string,
  input: { line1?: string; city?: string; postal_code?: string; region?: string }
) {
  requireGuest(guestId)
  const line1 = input.line1?.trim() ?? ""
  const city = input.city?.trim() ?? ""
  const postal_code = input.postal_code?.trim() ?? ""
  if (!line1 || !city || !postal_code) {
    throw new HttpError(422, "invalid_address", "line1, city, and postal_code are required")
  }
  const address = {
    id: id("addr"),
    guest_id: guestId,
    line1,
    city,
    region: input.region?.trim() || "OR",
    postal_code,
    location: { type: "Point" as const, coordinates: [-122.62, 45.428] as [number, number] },
  }
  store.addresses.push(address)
  return address
}

export function createFulfillment(input: {
  location_id: string
  type: "dine_in" | "pickup" | "delivery"
  table_id?: string
  guest_id?: string
  address_id?: string
  pickup_at?: string
}) {
  requireLocation(input.location_id)
  if (input.type === "dine_in" && input.address_id) {
    throw new HttpError(
      409,
      "fulfillment_type_mismatch",
      "address_id is not valid on a dine-in fulfillment"
    )
  }
  if (input.type === "delivery" && input.table_id) {
    throw new HttpError(
      409,
      "fulfillment_type_mismatch",
      "table_id is not valid on a delivery fulfillment"
    )
  }
  if (input.type === "dine_in" && !input.table_id) {
    throw new HttpError(422, "fulfillment_type_mismatch", "dine-in requires table_id")
  }
  if (input.type === "delivery" && !input.address_id) {
    throw new HttpError(422, "fulfillment_type_mismatch", "delivery requires address_id")
  }

  let deliveryFee = 0
  if (input.type === "delivery" && input.address_id) {
    const zone = zoneForAddress(input.address_id)
    if (!zone) {
      throw new HttpError(422, "address_out_of_zone", "Address is outside every delivery zone", {
        address_id: input.address_id,
      })
    }
    deliveryFee = zone.fee_cents
  }

  if (input.type === "dine_in" && input.table_id) {
    const table = requireTable(input.table_id)
    if (table.status === "occupied" && table.check_id) {
      throw new HttpError(409, "table_occupied", "Table already has an open check", {
        check_id: table.check_id,
      })
    }
  }

  const fulfillment: Fulfillment = {
    id: id("ful"),
    location_id: input.location_id,
    type: input.type,
    status: "open",
    table_id: input.table_id ?? null,
    guest_id: input.guest_id ?? null,
    address_id: input.address_id ?? null,
    pickup_at: input.pickup_at ?? null,
    handoff_code: input.type === "pickup" ? String(Math.floor(1000 + Math.random() * 9000)) : null,
    check_id: null,
    delivery_fee_cents: deliveryFee,
    created_at: new Date().toISOString(),
  }
  store.fulfillments.push(fulfillment)
  return fulfillment
}

export function handoffFulfillment(fulfillmentId: string, code: string) {
  const fulfillment = requireFulfillment(fulfillmentId)
  if (fulfillment.type !== "pickup") {
    throw new HttpError(409, "fulfillment_type_mismatch", "Handoff is for pickup only")
  }
  if (fulfillment.handoff_code !== code) {
    throw new HttpError(409, "handoff_code_invalid", "Pickup code does not match")
  }
  if (fulfillment.status === "ready") fulfillment.status = "closing"
  return fulfillment
}

export function cancelFulfillment(fulfillmentId: string) {
  const fulfillment = requireFulfillment(fulfillmentId)
  fulfillment.status = "canceled"
  if (fulfillment.table_id) {
    const table = store.tables.find((row) => row.id === fulfillment.table_id)
    if (table && table.check_id === fulfillment.check_id) {
      table.status = "open"
      table.check_id = null
    }
  }
  return fulfillment
}

export function createCheck(input: {
  location_id?: string
  table_id?: string
  fulfillment_id?: string
  server_id: string
  guest_id?: string
}) {
  const employee = store.employees.find((row) => row.id === input.server_id)
  if (!employee) throw new HttpError(404, "employee_not_found", "Employee not found")

  let fulfillment: Fulfillment
  if (input.fulfillment_id) {
    fulfillment = requireFulfillment(input.fulfillment_id)
  } else {
    if (!input.table_id || !input.location_id) {
      throw new HttpError(422, "invalid_check", "fulfillment_id or table_id is required")
    }
    fulfillment = createFulfillment({
      location_id: input.location_id,
      type: "dine_in",
      table_id: input.table_id,
      guest_id: input.guest_id,
    })
  }

  if (fulfillment.check_id) {
    const existing = store.checks.find((row) => row.id === fulfillment.check_id)
    if (existing && existing.status === "open") {
      throw new HttpError(409, "table_occupied", "Fulfillment already has an open check", {
        check_id: existing.id,
      })
    }
  }

  const check: Check = {
    id: id("chk"),
    location_id: fulfillment.location_id,
    table_id: fulfillment.table_id,
    fulfillment_id: fulfillment.id,
    guest_id: input.guest_id ?? fulfillment.guest_id,
    server_id: input.server_id,
    status: "open",
    version: 1,
    items: [],
    discount_ids: [],
    reward_discount_cents: 0,
    redemption_id: null,
    payment_ids: [],
    invoice_id: null,
    receipt_id: null,
    opened_at: new Date().toISOString(),
  }
  store.checks.push(check)
  fulfillment.check_id = check.id
  if (fulfillment.table_id) {
    const table = requireTable(fulfillment.table_id)
    table.status = "occupied"
    table.check_id = check.id
  }
  return presentCheck(check)
}

export function addLineItem(
  checkId: string,
  input: {
    item_id: string
    quantity?: number
    modifier_ids?: string[]
    selections?: { group_id: string; option_id: string; qty?: number }[]
    removed_defaults?: string[]
    notes?: string
  }
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
  const guest = check.guest_id
    ? store.guests.find((row) => row.id === check.guest_id)
    : null
  const resolved = resolveSelections({
    item,
    groups: store.modifierGroups,
    selections: input.selections,
    modifier_ids: input.modifier_ids,
    removed_defaults: input.removed_defaults,
    guest,
  })
  const quantity = input.quantity ?? 1
  const line = {
    id: id("li"),
    item_id: item.id,
    name: item.name,
    quantity,
    price: item.price + resolved.extra_cents,
    sent: false,
    modifier_ids: resolved.modifier_ids,
    selections: resolved.selections,
    removed_defaults: resolved.removed_defaults,
    notes: input.notes ?? "",
    warnings: resolved.warnings,
  }
  check.items.push(line)
  bumpVersion(check)
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
    for (const selection of line.selections) {
      const modStock = store.inventory.find((row) => row.item_id === selection.option_id)
      if (modStock) {
        modStock.on_hand = Math.max(0, modStock.on_hand - selection.qty * line.quantity)
        if (modStock.on_hand === 0) modStock.is_86 = true
      }
    }
  }
  const ticket = {
    id: id("kds"),
    check_id: check.id,
    item_ids: unsent.map((line) => line.id),
    status: "queued" as const,
  }
  store.tickets.push(ticket)
  const fulfillment = requireFulfillment(check.fulfillment_id)
  if (fulfillment.status === "open") fulfillment.status = "sent"
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
    bumpVersion(check)
  }
  return presentCheck(check)
}

export function createPayment(input: {
  check_id: string
  method?: "card" | "gift_card"
  amount_cents?: number
  gift_card_id?: string
  check_version?: number
}) {
  const check = requireCheck(input.check_id)
  if (check.status !== "open") {
    throw new HttpError(409, "check_not_open", "Check is not open")
  }
  if (input.check_version !== undefined && input.check_version !== check.version) {
    throw new HttpError(409, "check_version_stale", "check_version does not match", {
      current_version: check.version,
    })
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
  const fulfillment = requireFulfillment(check.fulfillment_id)
  if (fulfillment.type === "delivery") {
    const job = store.deliveries.find((row) => row.fulfillment_id === fulfillment.id)
    if (!job || job.status !== "delivered") {
      throw new HttpError(
        409,
        "delivery_not_complete",
        "Delivery must be delivered before invoicing"
      )
    }
  }
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
  fulfillment.status = "closed"
  if (fulfillment.table_id) {
    const table = store.tables.find((row) => row.id === fulfillment.table_id)
    if (table) {
      table.status = "open"
      table.check_id = null
    }
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
    discount_cents: totals.discount_cents + totals.reward_discount_cents,
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

export function addCourierTip(deliveryId: string, amountCents: number) {
  const job = requireDelivery(deliveryId)
  if (job.courier_tip_cents > 0) {
    throw new HttpError(409, "tip_already_added", "Courier tip already present")
  }
  job.courier_tip_cents = amountCents
  const batch = store.settlements.find((row) => row.status === "open")
  if (batch) batch.courier_tips_cents += amountCents
  return job
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
    throw new HttpError(404, "refund_not_found", "Burgertown has not accepted a refund for this charge")
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
  const fulfillment = store.fulfillments.find((row) => row.id === check.fulfillment_id)
  if (fulfillment) fulfillment.status = "canceled"
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

function appendLedger(input: {
  guest_id: string
  delta: number
  reason: Store["ledger"][number]["reason"]
  check_id?: string | null
  offer_id?: string | null
  payment_id?: string | null
}) {
  const account = requireRewards(input.guest_id)
  account.points_balance += input.delta
  account.points = account.points_balance
  const entry = {
    id: id("led"),
    guest_id: input.guest_id,
    delta: input.delta,
    reason: input.reason,
    check_id: input.check_id ?? null,
    offer_id: input.offer_id ?? null,
    payment_id: input.payment_id ?? null,
    balance_after: account.points_balance,
    created_at: new Date().toISOString(),
  }
  store.ledger.push(entry)
  return { account, entry }
}

export function earnLoyalty(guestId: string, paymentId: string) {
  return earnRewards(guestId, paymentId)
}

export function earnRewards(guestId: string, paymentId: string) {
  const account = requireRewards(guestId)
  const payment = requirePayment(paymentId)
  const check = requireCheck(payment.check_id)
  const totals = checkTotals(check)
  const food = Math.max(0, totals.subtotal_cents - totals.discount_cents - totals.reward_discount_cents)
  let earned = Math.floor(food / 100)
  if (account.tier === "gold") earned = Math.floor(earned * 1.5)
  account.punches += 1
  account.trailing_spend_cents += food
  account.tier = tierFromSpend(account.trailing_spend_cents)
  const { entry } = appendLedger({
    guest_id: guestId,
    delta: earned,
    reason: "earn",
    check_id: check.id,
    payment_id: payment.id,
  })
  return { ...presentRewards(account), earned, ledger_id: entry.id }
}

export function offerEligible(offer: Store["offers"][number], guestId: string) {
  if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) return false
  const account = store.rewards.find((row) => row.guest_id === guestId)
  if (!account) return false
  if (TIER_RANK[account.tier] < TIER_RANK[offer.min_tier]) return false
  if (account.points_balance < offer.points_cost) return false
  return true
}

export function listOffers(guestId?: string) {
  if (!guestId) return store.offers
  return store.offers.filter((offer) => offerEligible(offer, guestId))
}

export function createRedemption(input: {
  check_id: string
  offer_id: string
  guest_id: string
}) {
  const check = requireCheck(input.check_id)
  if (check.status !== "open") {
    throw new HttpError(409, "check_not_open", "Check is not open")
  }
  if (check.redemption_id) {
    throw new HttpError(409, "already_redeemed", "This check already has an offer")
  }
  const offer = requireOffer(input.offer_id)
  const account = requireRewards(input.guest_id)
  if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
    throw new HttpError(410, "offer_expired", "Offer has expired")
  }
  if (TIER_RANK[account.tier] < TIER_RANK[offer.min_tier]) {
    throw new HttpError(403, "tier_required", "Offer requires a higher rewards tier", {
      min_tier: offer.min_tier,
      tier: account.tier,
    })
  }
  if (account.points_balance < offer.points_cost) {
    throw new HttpError(409, "insufficient_points", "Not enough points", {
      points_balance: account.points_balance,
      points_cost: offer.points_cost,
    })
  }

  let discount = 0
  if (offer.kind === "amount_off") discount = offer.amount_cents
  if (offer.kind === "percent_off") {
    const subtotal = check.items.reduce((sum, line) => sum + line.price * line.quantity, 0)
    discount = Math.round(subtotal * (offer.percent / 100))
  }
  if (offer.kind === "free_item") {
    const match = check.items.find((line) => line.item_id === offer.item_id)
    discount = match ? match.price * match.quantity : offer.amount_cents
  }

  check.reward_discount_cents = discount
  bumpVersion(check)
  const redemption = {
    id: id("rdm"),
    check_id: check.id,
    offer_id: offer.id,
    guest_id: input.guest_id,
    points_spent: offer.points_cost,
    discount_cents: discount,
    created_at: new Date().toISOString(),
  }
  store.redemptions.push(redemption)
  check.redemption_id = redemption.id
  appendLedger({
    guest_id: input.guest_id,
    delta: -offer.points_cost,
    reason: "redeem",
    check_id: check.id,
    offer_id: offer.id,
  })
  return { redemption, check: presentCheck(check) }
}

export function deleteRedemption(redemptionId: string) {
  const redemption = store.redemptions.find((row) => row.id === redemptionId)
  if (!redemption) throw new HttpError(404, "redemption_not_found", "Redemption not found")
  const check = requireCheck(redemption.check_id)
  check.reward_discount_cents = 0
  check.redemption_id = null
  bumpVersion(check)
  appendLedger({
    guest_id: redemption.guest_id,
    delta: redemption.points_spent,
    reason: "refund",
    check_id: check.id,
    offer_id: redemption.offer_id,
  })
  store.redemptions = store.redemptions.filter((row) => row.id !== redemptionId)
  return { ok: true, check: presentCheck(check) }
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
    courier_tips_cents: 0,
    opened_at: new Date().toISOString(),
    closed_at: null,
  })
  return row
}

export function salesReport(groupBy?: string) {
  const paid = store.checks.filter((row) => row.status === "paid")
  const voided = store.checks.filter((row) => row.status === "voided")
  const captured = store.payments.filter((row) => row.status === "captured")
  const refunded = store.payments.filter((row) => row.status === "refunded")
  const net = captured.reduce((sum, row) => sum + row.amount_cents, 0)
  const tips = captured.reduce((sum, row) => sum + row.tip_cents, 0)
  const courierTips = store.deliveries.reduce((sum, row) => sum + row.courier_tip_cents, 0)
  const refunds = refunded.reduce(
    (sum, row) => sum + row.amount_cents + row.tip_cents,
    0
  )
  const base = {
    location_id: "loc_oak",
    checks_paid: paid.length,
    checks_voided: voided.length,
    net_sales_cents: net,
    tips_cents: tips,
    courier_tips_cents: courierTips,
    refunds_cents: refunds,
    currency: "USD",
  }
  if (groupBy !== "fulfillment_type") return base
  const types = ["dine_in", "pickup", "delivery"] as const
  return {
    ...base,
    by_fulfillment_type: types.map((type) => {
      const checks = paid.filter((check) => {
        const ful = store.fulfillments.find((row) => row.id === check.fulfillment_id)
        return ful?.type === type
      })
      return {
        type,
        checks_paid: checks.length,
        net_sales_cents: checks.reduce((sum, check) => {
          const pay = store.payments.find((row) => check.payment_ids.includes(row.id))
          return sum + (pay?.amount_cents ?? 0)
        }, 0),
      }
    }),
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

export function bumpTicket(ticketId: string, status: "queued" | "fired" | "done") {
  const ticket = store.tickets.find((row) => row.id === ticketId)
  if (!ticket) throw new HttpError(404, "ticket_not_found", "Kitchen ticket not found")
  ticket.status = status
  if (status === "done") {
    const check = requireCheck(ticket.check_id)
    const open = store.tickets.filter(
      (row) => row.check_id === check.id && row.status !== "done"
    )
    if (open.length === 0) {
      const fulfillment = requireFulfillment(check.fulfillment_id)
      if (fulfillment.status === "sent" || fulfillment.status === "open") {
        fulfillment.status = "ready"
      }
    }
  }
  return ticket
}

export function quoteDelivery(input: { location_id: string; address_id: string }) {
  requireLocation(input.location_id)
  const zone = zoneForAddress(input.address_id)
  if (!zone) {
    throw new HttpError(422, "address_out_of_zone", "Address is outside every delivery zone")
  }
  const quote = {
    id: id("qte"),
    location_id: input.location_id,
    address_id: input.address_id,
    zone_id: zone.id,
    fee_cents: zone.fee_cents,
    eta_minutes: zone.eta_minutes,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }
  store.quotes.push(quote)
  return quote
}

export function createDelivery(input: { fulfillment_id: string; quote_id: string }) {
  const fulfillment = requireFulfillment(input.fulfillment_id)
  if (fulfillment.type !== "delivery") {
    throw new HttpError(409, "fulfillment_type_mismatch", "Delivery jobs require a delivery fulfillment")
  }
  const quote = store.quotes.find((row) => row.id === input.quote_id)
  if (!quote) throw new HttpError(404, "quote_not_found", "Quote not found")
  if (new Date(quote.expires_at).getTime() < Date.now()) {
    throw new HttpError(410, "quote_expired", "Quote has expired")
  }
  fulfillment.delivery_fee_cents = quote.fee_cents
  const job = {
    id: id("dlv"),
    fulfillment_id: fulfillment.id,
    quote_id: quote.id,
    zone_id: quote.zone_id,
    fee_cents: quote.fee_cents,
    status: "pending" as const,
    courier_id: null,
    proof_photo_url: null,
    notes: null,
    fail_reason: null,
    courier_tip_cents: 0,
  }
  store.deliveries.push(job)
  store.tracking.push({ delivery_id: job.id, pings: [] })
  if (fulfillment.check_id) {
    const check = requireCheck(fulfillment.check_id)
    bumpVersion(check)
  }
  return job
}

export function dispatchDelivery(input: { delivery_id: string; courier_id?: string }) {
  const job = requireDelivery(input.delivery_id)
  if (job.status !== "pending" && job.courier_id) {
    throw new HttpError(409, "delivery_already_assigned", "Delivery already has a courier")
  }
  const available = store.couriers.filter((row) => row.status === "available")
  if (available.length === 0) {
    throw new HttpError(503, "no_courier_available", "No courier is available", {
      retryable: true,
    })
  }
  let courier = input.courier_id ? requireCourier(input.courier_id) : available[0]
  if (courier.status !== "available") {
    const fallback = available[0]
    if (!fallback) {
      throw new HttpError(503, "no_courier_available", "No courier is available", {
        retryable: true,
      })
    }
    courier = fallback
  }
  job.courier_id = courier.id
  job.status = "assigned"
  courier.status = "busy"
  return job
}

export function acceptDispatch(deliveryId: string, courierId: string) {
  const job = requireDelivery(deliveryId)
  const courier = requireCourier(courierId)
  if (courier.rejects_on_accept) {
    job.status = "pending"
    job.courier_id = null
    courier.status = "available"
    throw new HttpError(409, "courier_rejected", "Courier rejected the job")
  }
  job.status = "accepted"
  job.courier_id = courier.id
  return job
}

export function rejectDispatch(deliveryId: string, courierId: string) {
  const job = requireDelivery(deliveryId)
  const courier = requireCourier(courierId)
  job.status = "pending"
  job.courier_id = null
  courier.status = "available"
  return job
}

export function pickupDelivery(deliveryId: string) {
  const job = requireDelivery(deliveryId)
  const fulfillment = requireFulfillment(job.fulfillment_id)
  if (fulfillment.status !== "ready" && fulfillment.status !== "closing") {
    throw new HttpError(409, "delivery_not_ready", "Fulfillment is not ready for pickup")
  }
  job.status = "picked_up"
  return job
}

export function deliverDelivery(
  deliveryId: string,
  input: { proof_photo_url?: string; notes?: string }
) {
  const job = requireDelivery(deliveryId)
  const zone = store.zones.find((row) => row.id === job.zone_id)
  if (zone?.requires_proof && !input.proof_photo_url) {
    throw new HttpError(422, "proof_required", "This zone requires a proof photo")
  }
  job.status = "delivered"
  job.proof_photo_url = input.proof_photo_url ?? null
  job.notes = input.notes ?? null
  if (job.courier_id) {
    const courier = store.couriers.find((row) => row.id === job.courier_id)
    if (courier) courier.status = "available"
  }
  return job
}

export function failDelivery(deliveryId: string, reason: string) {
  const job = requireDelivery(deliveryId)
  job.status = "failed"
  job.fail_reason = reason
  if (job.courier_id) {
    const courier = store.couriers.find((row) => row.id === job.courier_id)
    if (courier) courier.status = "available"
  }
  return job
}

export function cancelDelivery(deliveryId: string) {
  const job = requireDelivery(deliveryId)
  job.status = "canceled"
  if (job.courier_id) {
    const courier = store.couriers.find((row) => row.id === job.courier_id)
    if (courier) courier.status = "available"
  }
  return job
}

export function pingTracking(deliveryId: string, lng: number, lat: number) {
  requireDelivery(deliveryId)
  let trail = store.tracking.find((row) => row.delivery_id === deliveryId)
  if (!trail) {
    trail = { delivery_id: deliveryId, pings: [] }
    store.tracking.push(trail)
  }
  trail.pings.push({
    at: new Date().toISOString(),
    location: { type: "Point", coordinates: [lng, lat] },
  })
  return trail
}

export function listItems(excludeAllergens?: string[]) {
  const avoided = excludeAllergens?.filter(Boolean) ?? []
  return store.items
    .filter((item) => avoided.every((id) => !item.allergen_ids.includes(id)))
    .map(presentItem)
}
