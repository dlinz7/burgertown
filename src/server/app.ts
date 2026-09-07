import { Hono } from "hono"
import { installAtlasDemoControls, atlasDemoOpenApi } from "@/server/atlas-demo"
import { cors } from "hono/cors"
import { API_CATALOG } from "@/server/catalog"
import { buildOpenApi } from "@/server/openapi"
import {
  HttpError,
  acceptDispatch,
  addCourierTip,
  addLineItem,
  addTip,
  applyDiscount,
  bumpTicket,
  cancelDelivery,
  cancelFulfillment,
  captureCharge,
  closeSettlement,
  createAddress,
  createCheck,
  createDelivery,
  createFulfillment,
  createGuest,
  createPayment,
  createRedemption,
  createWebhook,
  deleteRedemption,
  deliverDelivery,
  dispatchDelivery,
  earnRewards,
  failDelivery,
  getStore,
  handoffFulfillment,
  jsonError,
  listItems,
  listOffers,
  patchItem,
  pickupDelivery,
  pingTracking,
  postInvoice,
  presentCheck,
  presentItem,
  presentRewards,
  processorRefund,
  quoteDelivery,
  redeemGiftCard,
  rejectDispatch,
  requestRefund,
  requireAddress,
  requireCheck,
  requireCourier,
  requireDelivery,
  requireFulfillment,
  requireGroup,
  requireGuest,
  requireInvoice,
  requireItem,
  requireLocation,
  requireMenu,
  requireOffer,
  requirePayment,
  requireReceipt,
  requireRefund,
  requireRewards,
  requireTable,
  resetStore,
  salesReport,
  sendOrder,
  voidCheck,
  zoneForAddress,
} from "@/server/store"

export const app = new Hono()

app.use("*", cors())
installAtlasDemoControls(app)

app.notFound((c) =>
  c.json(
    { error: { code: "not_found", message: "Unknown Burgertown route" } },
    404
  )
)

app.onError((error, c) => {
  if (error instanceof HttpError) {
    return c.json(jsonError(error), error.status as never)
  }
  console.error(error)
  return c.json(
    { error: { code: "internal_error", message: "Unexpected sandbox error" } },
    500
  )
})

app.get("/health", (c) =>
  c.json({
    ok: true,
    company: "Burgertown",
    product: "restaurant",
    apis: API_CATALOG.length,
  })
)

app.get("/openapi.json", (c) => {
  const origin = new URL(c.req.url).origin
  return c.json(atlasDemoOpenApi(buildOpenApi(origin)), 200, {
    "Content-Type": "application/json; charset=utf-8",
  })
})

app.get("/v1/meta/apis", (c) =>
  c.json({
    company: "Burgertown",
    count: API_CATALOG.length,
    apis: API_CATALOG.map((api) => ({
      id: api.id,
      name: api.name,
      domain: api.domain,
      description: api.description,
      depends_on: api.dependsOn,
      operations: api.operations.map((op) => ({
        id: op.id,
        method: op.method,
        path: op.path,
        summary: op.summary,
        failures: op.failures,
      })),
    })),
  })
)

app.post("/v1/sandbox", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (body.reset !== false) {
    const scope = Array.isArray(body.scope) ? body.scope : undefined
    resetStore(scope)
  }
  return c.json({ ok: true, apis: API_CATALOG.length })
})

app.get("/v1/locations", (c) => c.json({ data: getStore().locations }))
app.get("/v1/locations/:location_id/tables", (c) => {
  requireLocation(c.req.param("location_id"))
  return c.json({
    data: getStore().tables.filter(
      (row) => row.location_id === c.req.param("location_id")
    ),
  })
})
app.get("/v1/locations/:location_id/zones", (c) => {
  requireLocation(c.req.param("location_id"))
  return c.json({
    data: getStore().zones.filter(
      (row) => row.location_id === c.req.param("location_id")
    ),
  })
})
app.get("/v1/locations/:location_id", (c) =>
  c.json(requireLocation(c.req.param("location_id")))
)
app.get("/v1/tables/:table_id", (c) => c.json(requireTable(c.req.param("table_id"))))

app.post("/v1/zones/check", async (c) => {
  const body = await c.req.json()
  requireLocation(body.location_id)
  const zone = zoneForAddress(body.address_id)
  return c.json({
    in_zone: Boolean(zone),
    zone_id: zone?.id ?? null,
    fee_cents: zone?.fee_cents ?? null,
    eta_minutes: zone?.eta_minutes ?? null,
  })
})

app.get("/v1/menus", (c) => {
  const locationId = c.req.query("location_id")
  const menus = locationId
    ? getStore().menus.filter((row) => row.location_id === locationId)
    : getStore().menus
  return c.json({ data: menus })
})
app.get("/v1/menus/:menu_id", (c) => c.json(requireMenu(c.req.param("menu_id"))))

app.get("/v1/catalog/items/:item_id/allergens", (c) => {
  const item = requireItem(c.req.param("item_id"))
  const tags = getStore().allergens.filter((row) => item.allergen_ids.includes(row.id))
  return c.json({ item_id: item.id, data: tags })
})
app.get("/v1/catalog/items", (c) => {
  const raw = c.req.query("exclude_allergens")
  const avoided = raw ? raw.split(",").map((part) => part.trim()) : undefined
  return c.json({ data: listItems(avoided) })
})
app.get("/v1/catalog/items/:item_id", (c) =>
  c.json(presentItem(requireItem(c.req.param("item_id"))))
)
app.patch("/v1/catalog/items/:item_id", async (c) => {
  const body = await c.req.json()
  return c.json(patchItem(c.req.param("item_id"), body))
})

app.get("/v1/catalog/modifier-groups", (c) => {
  const itemId = c.req.query("item_id")
  const groups = itemId
    ? getStore().modifierGroups.filter((group) =>
        requireItem(itemId).modifier_group_ids.includes(group.id)
      )
    : getStore().modifierGroups
  return c.json({ data: groups })
})
app.get("/v1/catalog/modifier-groups/:group_id", (c) =>
  c.json(requireGroup(c.req.param("group_id")))
)
app.get("/v1/catalog/modifiers", (c) => c.json({ data: getStore().modifiers }))

app.get("/v1/allergens", (c) => c.json({ data: getStore().allergens }))
app.get("/v1/taxes", (c) => c.json({ data: getStore().taxes }))
app.get("/v1/discounts", (c) => c.json({ data: getStore().discounts }))
app.post("/v1/checks/:check_id/discounts", async (c) => {
  const body = await c.req.json()
  return c.json(applyDiscount(c.req.param("check_id"), body.code), 201)
})

app.get("/v1/inventory", (c) => c.json({ data: getStore().inventory }))
app.get("/v1/inventory/:item_id", (c) => {
  const row = getStore().inventory.find((item) => item.item_id === c.req.param("item_id"))
  if (!row) {
    requireItem(c.req.param("item_id"))
  }
  return c.json(row)
})

app.get("/v1/guests", (c) => {
  const email = c.req.query("email")
  const rows = email
    ? getStore().guests.filter(
        (row) => row.email.toLowerCase() === email.trim().toLowerCase()
      )
    : getStore().guests
  return c.json({ data: rows })
})
app.post("/v1/guests", async (c) => {
  const body = await c.req.json()
  return c.json(createGuest(body), 201)
})
app.get("/v1/guests/:guest_id/addresses", (c) => {
  requireGuest(c.req.param("guest_id"))
  return c.json({
    data: getStore().addresses.filter((row) => row.guest_id === c.req.param("guest_id")),
  })
})
app.post("/v1/guests/:guest_id/addresses", async (c) => {
  const body = await c.req.json()
  return c.json(createAddress(c.req.param("guest_id"), body), 201)
})
app.get("/v1/guests/:guest_id", (c) => c.json(requireGuest(c.req.param("guest_id"))))
app.get("/v1/addresses/:address_id", (c) =>
  c.json(requireAddress(c.req.param("address_id")))
)
app.get("/v1/employees", (c) => c.json({ data: getStore().employees }))

app.post("/v1/fulfillments", async (c) => {
  const body = await c.req.json()
  return c.json(createFulfillment(body), 201)
})
app.get("/v1/fulfillments", (c) => {
  const status = c.req.query("status")
  const type = c.req.query("type")
  const rows = getStore().fulfillments.filter((row) => {
    if (status && row.status !== status) return false
    if (type && row.type !== type) return false
    return true
  })
  return c.json({ data: rows })
})
app.post("/v1/fulfillments/:fulfillment_id/handoff", async (c) => {
  const body = await c.req.json()
  return c.json(handoffFulfillment(c.req.param("fulfillment_id"), String(body.code ?? "")))
})
app.post("/v1/fulfillments/:fulfillment_id/cancel", (c) =>
  c.json(cancelFulfillment(c.req.param("fulfillment_id")))
)
app.get("/v1/fulfillments/:fulfillment_id", (c) =>
  c.json(requireFulfillment(c.req.param("fulfillment_id")))
)

app.get("/v1/checks", (c) => {
  const status = c.req.query("status")
  const rows = getStore().checks.filter((row) =>
    status ? row.status === status : true
  )
  return c.json({ data: rows.map(presentCheck) })
})
app.get("/v1/checks/:check_id/receipt", (c) => {
  const check = requireCheck(c.req.param("check_id"))
  if (!check.receipt_id) {
    throw new HttpError(404, "receipt_not_found", "Check has no receipt yet")
  }
  return c.json(requireReceipt(check.receipt_id))
})
app.get("/v1/checks/:check_id", (c) =>
  c.json(presentCheck(requireCheck(c.req.param("check_id"))))
)
app.post("/v1/checks", async (c) => {
  const body = await c.req.json()
  return c.json(createCheck(body), 201)
})
app.post("/v1/checks/:check_id/items", async (c) => {
  const body = await c.req.json()
  return c.json(addLineItem(c.req.param("check_id"), body), 201)
})
app.post("/v1/checks/:check_id/send", (c) =>
  c.json(sendOrder(c.req.param("check_id")))
)
app.post("/v1/checks/:check_id/void", (c) =>
  c.json(voidCheck(c.req.param("check_id")))
)

app.get("/v1/kds/tickets", (c) => c.json({ data: getStore().tickets }))
app.patch("/v1/kds/tickets/:ticket_id", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json(bumpTicket(c.req.param("ticket_id"), body.status ?? "done"))
})

app.get("/v1/couriers", (c) => {
  const locationId = c.req.query("location_id")
  const status = c.req.query("status")
  const rows = getStore().couriers.filter((row) => {
    if (locationId && row.location_id !== locationId) return false
    if (status && row.status !== status) return false
    return true
  })
  return c.json({ data: rows })
})
app.get("/v1/couriers/:courier_id", (c) =>
  c.json(requireCourier(c.req.param("courier_id")))
)

app.post("/v1/delivery/quote", async (c) => {
  const body = await c.req.json()
  return c.json(quoteDelivery(body), 201)
})
app.post("/v1/delivery", async (c) => {
  const body = await c.req.json()
  return c.json(createDelivery(body), 201)
})
app.post("/v1/delivery/:delivery_id/pickup", (c) =>
  c.json(pickupDelivery(c.req.param("delivery_id")))
)
app.post("/v1/delivery/:delivery_id/deliver", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json(deliverDelivery(c.req.param("delivery_id"), body))
})
app.post("/v1/delivery/:delivery_id/fail", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json(failDelivery(c.req.param("delivery_id"), body.reason ?? "unknown"))
})
app.post("/v1/delivery/:delivery_id/cancel", (c) =>
  c.json(cancelDelivery(c.req.param("delivery_id")))
)
app.get("/v1/delivery/:delivery_id", (c) =>
  c.json(requireDelivery(c.req.param("delivery_id")))
)

app.post("/v1/dispatch", async (c) => {
  const body = await c.req.json()
  return c.json(dispatchDelivery(body))
})
app.post("/v1/dispatch/:delivery_id/accept", async (c) => {
  const body = await c.req.json()
  return c.json(acceptDispatch(c.req.param("delivery_id"), body.courier_id))
})
app.post("/v1/dispatch/:delivery_id/reject", async (c) => {
  const body = await c.req.json()
  return c.json(rejectDispatch(c.req.param("delivery_id"), body.courier_id))
})

app.post("/v1/tracking/:delivery_id/ping", async (c) => {
  const body = await c.req.json()
  return c.json(pingTracking(c.req.param("delivery_id"), body.lng, body.lat))
})
app.get("/v1/tracking/:delivery_id", (c) => {
  const deliveryId = c.req.param("delivery_id")
  requireDelivery(deliveryId)
  const trail = getStore().tracking.find((row) => row.delivery_id === deliveryId)
  return c.json(trail ?? { delivery_id: deliveryId, pings: [] })
})

app.post("/v1/payments", async (c) => {
  const body = await c.req.json()
  return c.json(createPayment(body), 201)
})
app.get("/v1/payments/:payment_id", (c) =>
  c.json(requirePayment(c.req.param("payment_id")))
)

app.post("/v1/processor/charges", async (c) => {
  const body = await c.req.json()
  return c.json(captureCharge(body), 201)
})
app.post("/v1/processor/refunds", async (c) => {
  const body = await c.req.json()
  return c.json(processorRefund(body), 201)
})

app.post("/v1/invoices", async (c) => {
  const body = await c.req.json()
  return c.json(postInvoice(body), 201)
})
app.get("/v1/invoices/:invoice_id", (c) =>
  c.json(requireInvoice(c.req.param("invoice_id")))
)

app.get("/v1/receipts/:receipt_id", (c) =>
  c.json(requireReceipt(c.req.param("receipt_id")))
)

app.post("/v1/payments/:payment_id/tip", async (c) => {
  const body = await c.req.json()
  return c.json(addTip(c.req.param("payment_id"), body.amount_cents))
})
app.post("/v1/tips/courier", async (c) => {
  const body = await c.req.json()
  return c.json(addCourierTip(body.delivery_id, body.amount_cents))
})

app.post("/v1/refunds", async (c) => {
  const body = await c.req.json()
  return c.json(requestRefund(body), 201)
})
app.get("/v1/refunds/:refund_id", (c) =>
  c.json(requireRefund(c.req.param("refund_id")))
)

app.get("/v1/loyalty/accounts/:guest_id", (c) => {
  const origin = new URL(c.req.url).origin
  return c.redirect(
    `${origin}/v1/rewards/accounts/${c.req.param("guest_id")}`,
    308
  )
})
app.post("/v1/loyalty/accounts/:guest_id/earn", (c) => {
  const origin = new URL(c.req.url).origin
  return c.redirect(
    `${origin}/v1/rewards/accounts/${c.req.param("guest_id")}/earn`,
    308
  )
})

app.get("/v1/rewards/accounts/:guest_id/ledger", (c) => {
  requireRewards(c.req.param("guest_id"))
  return c.json({
    data: getStore().ledger.filter((row) => row.guest_id === c.req.param("guest_id")),
  })
})
app.get("/v1/rewards/accounts/:guest_id", (c) =>
  c.json(presentRewards(requireRewards(c.req.param("guest_id"))))
)
app.post("/v1/rewards/accounts/:guest_id/earn", async (c) => {
  const body = await c.req.json()
  return c.json(earnRewards(c.req.param("guest_id"), body.payment_id))
})

app.get("/v1/offers", (c) => {
  const guestId = c.req.query("guest_id")
  return c.json({ data: listOffers(guestId ?? undefined) })
})
app.get("/v1/offers/:offer_id", (c) => c.json(requireOffer(c.req.param("offer_id"))))

app.post("/v1/redemptions", async (c) => {
  const body = await c.req.json()
  return c.json(createRedemption(body), 201)
})
app.get("/v1/redemptions/:redemption_id", (c) => {
  const row = getStore().redemptions.find((item) => item.id === c.req.param("redemption_id"))
  if (!row) throw new HttpError(404, "redemption_not_found", "Redemption not found")
  return c.json(row)
})
app.delete("/v1/redemptions/:redemption_id", (c) =>
  c.json(deleteRedemption(c.req.param("redemption_id")))
)

app.get("/v1/gift-cards/:gift_card_id", (c) => {
  const card = getStore().giftCards.find((row) => row.id === c.req.param("gift_card_id"))
  if (!card) throw new HttpError(404, "gift_card_not_found", "Gift card not found")
  return c.json(card)
})
app.post("/v1/gift-cards/:gift_card_id/redeem", async (c) => {
  const body = await c.req.json()
  return c.json(redeemGiftCard(c.req.param("gift_card_id"), body))
})

app.get("/v1/webhooks", (c) => c.json({ data: getStore().webhooks }))
app.post("/v1/webhooks", async (c) => {
  const body = await c.req.json()
  return c.json(createWebhook(body), 201)
})

app.get("/v1/settlements", (c) => c.json({ data: getStore().settlements }))
app.post("/v1/settlements/:settlement_id/close", (c) =>
  c.json(closeSettlement(c.req.param("settlement_id")))
)
app.get("/v1/reports/sales", (c) =>
  c.json(salesReport(c.req.query("group_by") ?? undefined))
)
