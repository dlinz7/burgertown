import { Hono } from "hono"
import { cors } from "hono/cors"
import { API_CATALOG } from "@/server/catalog"
import { buildOpenApi } from "@/server/openapi"
import {
  HttpError,
  addLineItem,
  addTip,
  applyDiscount,
  bumpTicket,
  captureCharge,
  closeSettlement,
  createCheck,
  createPayment,
  createWebhook,
  earnLoyalty,
  getStore,
  jsonError,
  patchItem,
  postInvoice,
  presentCheck,
  presentItem,
  processorRefund,
  redeemGiftCard,
  requestRefund,
  requireCheck,
  requireGuest,
  requireInvoice,
  requireItem,
  requireLocation,
  requireMenu,
  requirePayment,
  requireReceipt,
  requireRefund,
  requireTable,
  resetStore,
  salesReport,
  sendOrder,
  voidCheck,
} from "@/server/store"

export const app = new Hono()

app.use("*", cors())

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
    product: "POS",
    apis: API_CATALOG.length,
  })
)

app.get("/openapi.json", (c) => {
  const origin = new URL(c.req.url).origin
  return c.json(buildOpenApi(origin))
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
      })),
    })),
  })
)

app.post("/v1/sandbox", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (body.reset !== false) resetStore()
  return c.json({ ok: true })
})

app.get("/v1/locations", (c) => c.json({ data: getStore().locations }))
app.get("/v1/locations/:location_id", (c) =>
  c.json(requireLocation(c.req.param("location_id")))
)
app.get("/v1/locations/:location_id/tables", (c) => {
  requireLocation(c.req.param("location_id"))
  return c.json({
    data: getStore().tables.filter(
      (row) => row.location_id === c.req.param("location_id")
    ),
  })
})
app.get("/v1/tables/:table_id", (c) => c.json(requireTable(c.req.param("table_id"))))

app.get("/v1/menus", (c) => {
  const locationId = c.req.query("location_id")
  const menus = locationId
    ? getStore().menus.filter((row) => row.location_id === locationId)
    : getStore().menus
  return c.json({ data: menus })
})
app.get("/v1/menus/:menu_id", (c) => c.json(requireMenu(c.req.param("menu_id"))))

app.get("/v1/catalog/items", (c) =>
  c.json({ data: getStore().items.map(presentItem) })
)
app.get("/v1/catalog/items/:item_id", (c) =>
  c.json(presentItem(requireItem(c.req.param("item_id"))))
)
app.patch("/v1/catalog/items/:item_id", async (c) => {
  const body = await c.req.json()
  return c.json(patchItem(c.req.param("item_id"), body))
})
app.get("/v1/catalog/modifiers", (c) =>
  c.json({ data: getStore().modifiers })
)

app.get("/v1/taxes", (c) => c.json({ data: getStore().taxes }))
app.get("/v1/discounts", (c) => c.json({ data: getStore().discounts }))
app.post("/v1/checks/:check_id/discounts", async (c) => {
  const body = await c.req.json()
  return c.json(applyDiscount(c.req.param("check_id"), body.code), 201)
})

app.get("/v1/inventory", (c) => c.json({ data: getStore().inventory }))
app.get("/v1/inventory/:item_id", (c) => {
  requireItem(c.req.param("item_id"))
  const row = getStore().inventory.find(
    (item) => item.item_id === c.req.param("item_id")
  )
  return c.json(row)
})

app.get("/v1/guests", (c) => c.json({ data: getStore().guests }))
app.get("/v1/guests/:guest_id", (c) =>
  c.json(requireGuest(c.req.param("guest_id")))
)
app.get("/v1/employees", (c) => c.json({ data: getStore().employees }))

app.get("/v1/checks", (c) => {
  const status = c.req.query("status")
  const rows = getStore().checks.filter((row) =>
    status ? row.status === status : true
  )
  return c.json({ data: rows.map(presentCheck) })
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

app.get("/v1/kds/tickets", (c) => c.json({ data: getStore().tickets }))
app.patch("/v1/kds/tickets/:ticket_id", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json(bumpTicket(c.req.param("ticket_id"), body.status ?? "done"))
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
app.get("/v1/checks/:check_id/receipt", (c) => {
  const check = requireCheck(c.req.param("check_id"))
  if (!check.receipt_id) {
    throw new HttpError(404, "receipt_not_found", "Check has no receipt yet")
  }
  return c.json(requireReceipt(check.receipt_id))
})

app.post("/v1/payments/:payment_id/tip", async (c) => {
  const body = await c.req.json()
  return c.json(addTip(c.req.param("payment_id"), body.amount_cents))
})

app.post("/v1/refunds", async (c) => {
  const body = await c.req.json()
  return c.json(requestRefund(body), 201)
})
app.get("/v1/refunds/:refund_id", (c) =>
  c.json(requireRefund(c.req.param("refund_id")))
)
app.post("/v1/checks/:check_id/void", (c) =>
  c.json(voidCheck(c.req.param("check_id")))
)

app.get("/v1/loyalty/accounts/:guest_id", (c) => {
  const account = getStore().loyalty.find(
    (row) => row.guest_id === c.req.param("guest_id")
  )
  if (!account) throw new HttpError(404, "account_not_found", "Loyalty account not found")
  return c.json(account)
})
app.post("/v1/loyalty/accounts/:guest_id/earn", async (c) => {
  const body = await c.req.json()
  return c.json(earnLoyalty(c.req.param("guest_id"), body.payment_id))
})

app.get("/v1/gift-cards/:gift_card_id", (c) => {
  const card = getStore().giftCards.find(
    (row) => row.id === c.req.param("gift_card_id")
  )
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
app.get("/v1/reports/sales", (c) => c.json(salesReport()))
