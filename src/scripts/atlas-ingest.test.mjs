import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { POST } from "../app/api/atlas/ingest/route.ts"
import { submitOrderItems } from "../lib/submit-order-items.ts"
import { getCheckoutAttempt, completeCheckoutAttempt } from "../lib/checkout-attempt.ts"

const orderRequest = (itemId = "itm_burger") => new Request("http://localhost/api/atlas/ingest", {
  method: "POST",
  body: JSON.stringify({ item_id: itemId, order_id: "order-1:0:0" }),
})

const originalFetch = globalThis.fetch
const originalUrl = process.env.ATLAS_INGEST_URL
const originalToken = process.env.ATLAS_INGEST_TOKEN

test("sends every selected item unit without dropping quantities", async () => {
  const sent = []
  const result = await submitOrderItems([
    { item_id: "itm_burger", quantity: 2 },
    { item_id: "itm_fries", quantity: 1 },
  ], async (id) => {
    sent.push(id)
    return { commandId: `command-${sent.length}` }
  }, "order-1")
  assert.deepEqual(sent, ["itm_burger", "itm_burger", "itm_fries"])
  assert.equal(result.results.length, 3)
})

test("stops on failure and reports partial completion without retrying", async () => {
  let calls = 0
  await assert.rejects(submitOrderItems([{ item_id: "itm_burger", quantity: 3 }], async () => {
    calls += 1
    if (calls === 2) throw new Error("Atlas unavailable")
    return { commandId: "command-1" }
  }, "order-1"), /1 item workflow\(s\) completed/)
  assert.equal(calls, 2)
})

test("validates the entire order before submitting any items", async () => {
  let calls = 0
  for (const quantity of [0, -1, 1.5, NaN]) {
    await assert.rejects(submitOrderItems([
      { item_id: "itm_burger", quantity: 1 },
      { item_id: "itm_fries", quantity },
    ], async () => { calls += 1; return { commandId: "unexpected" } }, "order-1"))
  }
  assert.equal(calls, 0)
})

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries({ ATLAS_INGEST_URL: originalUrl, ATLAS_INGEST_TOKEN: originalToken })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test("submits the selected item while preserving the rest of the demo payload", async () => {
  delete process.env.ATLAS_INGEST_URL
  delete process.env.ATLAS_INGEST_TOKEN
  let calls = 0
  globalThis.fetch = async (url, init) => {
    calls += 1
    assert.equal(url, "http://localhost:4300/ingest")
    assert.equal(init.method, "POST")
    assert.equal(init.headers.Authorization, "Bearer local-ingest-caller-token")
    assert.equal(init.headers["Content-Type"], "application/json")
    assert.deepEqual(JSON.parse(init.body), {
      workflowName: "demo",
      idempotencyKey: "order-1:0:0",
      payload: { order_id: "order-1:0:0", item_id: "itm_burger", server_id: "emp_jon", location_id: "loc_oak" },
    })
    return Response.json({ receipt_id: "receipt-5", total_cents: 1234 }, { headers: { "X-Atlas-Command-Id": "command-1" } })
  }
  const response = await POST(orderRequest())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { receipt_id: "receipt-5", total_cents: 1234 })
  assert.equal(response.headers.get("x-atlas-command-id"), "command-1")
  assert.equal(calls, 1)
})

test("retries reuse each unit's key and a subsequent identical order gets new keys", async () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  const items = [{ item_id: "itm_fries", quantity: 2 }]
  const orderId = getCheckoutAttempt("pickup", items, storage)
  const firstKeys = []
  await assert.rejects(submitOrderItems(items, async (_item, key) => {
    firstKeys.push(key)
    if (firstKeys.length === 2) throw new Error("response lost")
    return {}
  }, orderId))
  const retryId = getCheckoutAttempt("pickup", items, storage)
  assert.equal(retryId, orderId)
  const retryKeys = []
  await submitOrderItems(items, async (_item, key) => { retryKeys.push(key); return {} }, retryId)
  assert.deepEqual(retryKeys, firstKeys)
  assert.notEqual(retryKeys[0], retryKeys[1])
  completeCheckoutAttempt("pickup", orderId, storage)
  assert.notEqual(getCheckoutAttempt("pickup", items, storage), orderId)
})

test("supports server environment configuration and surfaces rejection", async () => {
  process.env.ATLAS_INGEST_URL = "http://atlas:4300/ingest"
  process.env.ATLAS_INGEST_TOKEN = "test-token"
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "http://atlas:4300/ingest")
    assert.equal(init.headers.Authorization, "Bearer test-token")
    return Response.json({ error: "api-run-unavailable" }, { status: 409 })
  }
  const response = await POST(orderRequest())
  assert.equal(response.status, 409)
  assert.match((await response.json()).error.message, /api-run-unavailable/)
})

test("rejects invalid items before calling Atlas", async () => {
  globalThis.fetch = async () => { throw new Error("Atlas must not be called") }
  for (const body of ["not JSON", "null", "{}", '{"item_id":[]}', '{"item_id":"  "}']) {
    const response = await POST(new Request("http://localhost/api/atlas/ingest", { method: "POST", body }))
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error.code, "invalid_item_id")
  }
})

test("reports network failures without retrying a potentially accepted workflow", async () => {
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    throw new TypeError("fetch failed")
  }
  const response = await POST(orderRequest())
  assert.equal(response.status, 502)
  assert.equal((await response.json()).error.code, "atlas_unreachable")
  assert.equal(calls, 1)
})

test("rejects old acceptance and malformed final responses and handles non-JSON upstream errors", async () => {
  for (const upstream of [
    new Response("not JSON", { status: 202 }),
    Response.json({}, { status: 202 }),
    Response.json(null, { status: 200 }),
    new Response("Bad gateway", { status: 502 }),
  ]) {
    globalThis.fetch = async () => upstream
    const response = await POST(orderRequest())
    assert.equal(response.status, 502)
    assert.equal(typeof (await response.json()).error.message, "string")
  }
})
