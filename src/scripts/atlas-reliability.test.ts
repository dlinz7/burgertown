import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { Hono } from "hono"
import { installAtlasDemoControls } from "@/server/atlas-demo"

const random = Math.random
afterEach(() => { Math.random = random })

test("transient failures do not write or poison retries, and successful replays never fail", async () => {
  const app = new Hono()
  installAtlasDemoControls(app)
  let writes = 0
  app.post("/v1/checks/:check_id/items", (c) => { writes += 1; return c.json({ writes }, 201) })
  await app.request("/v1/__control/reliability", { method: "PUT", body: JSON.stringify({ enabled: true }) })
  const send = (item = "itm_fries") => app.request("/v1/checks/reliability-test/items", {
    method: "POST", body: JSON.stringify({ item_id: item, idempotency_key: "reliability-test-1" }),
  })
  Math.random = () => { throw new Error("Failure injection must not depend on randomness") }
  assert.equal((await send()).status, 503)
  assert.equal(writes, 0)
  // Every retry must bypass the injected failure.
  assert.equal((await send()).status, 201)
  assert.equal(writes, 1)
  assert.equal((await send()).status, 201)
  assert.equal(writes, 1)
  assert.equal((await send("itm_townie")).status, 409)
  const status = await (await app.request("/v1/__control/reliability")).json()
  assert.equal(status.attempts, 2)
  assert.equal(status.injectedFailures, 1)
  assert.equal(status.maxFailuresPerKey, 1)
  assert.equal(status.failureRate, 1)
  const another = () => app.request("/v1/checks/reliability-test/items", {
    method: "POST", body: JSON.stringify({ item_id: "itm_fries", idempotency_key: "reliability-test-2" }),
  })
  assert.equal((await another()).status, 503)
  assert.equal(writes, 1)
  assert.equal((await another()).status, 201)
  assert.equal((await another()).status, 201)
  assert.equal(writes, 2)

  // Validation sandbox traffic stays deterministic while the live demo switch is on.
  const sandbox = await app.request("/v1/checks/reliability-test/items", {
    method: "POST", headers: { "x-atlas-sandbox-step-id": "add_item" }, body: JSON.stringify({ item_id: "itm_fries" }),
  })
  assert.equal(sandbox.status, 201)
  await app.request("/v1/__control/reliability", { method: "PUT", body: JSON.stringify({ enabled: false }) })
  assert.equal((await send("itm_townie")).status, 409)
  const ordinary = await app.request("/v1/checks/reliability-test/items", { method: "POST", body: "{}" })
  assert.equal(ordinary.status, 201)
  assert.equal((await app.request("/v1/__control/reliability", { method: "PUT", body: "{}" })).status, 400)
})
