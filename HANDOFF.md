# Burgertown API handoff

Give this file to another agent. It is the contract for Burgertown: a fictional smash-burger restaurant whose HTTP APIs Atlas (or any workflow generator) can import.

Burgertown is not Atlas. It is the dummy merchant. Atlas owns blast radius, error classification, and workflow generation. Do not add Atlas demo UI (flow playground, "break catalog contract", blast-radius console) to the live restaurant site.

Product copy on guest/staff pages must not say "POS". Specs may describe restaurant resources (checks, tickets, processor, fulfillments).

This revision takes the catalog from 25 APIs to 35. Existing IDs, routes, and error codes are preserved except where the Compatibility section says otherwise.

---

## What changed and why

The old graph was shallow. Most chains were three hops, most failures were terminal, and the only branching was `pm_ok | pm_decline | pm_timeout`. A workflow generator pointed at that produces workflows that all look alike.

Four structural moves fix it.

**1. Checks are no longer table-bound.** A new `fulfillment` resource sits between the floor and the check. Dine-in is one type of fulfillment; pickup and delivery are the others. `checks.depends_on` becomes `fulfillment, guests, employees` instead of `floor, guests, employees`, and `floor` moves under `fulfillment`. This is the change that unlocks everything else — delivery has no table to free, and every "table_id" assumption in the pay path had to become a fulfillment transition.

**2. Realism comes from branching, not from more kitchen states.** The ticket lifecycle stays exactly three states (`queued | fired | done`). A finer-grained kitchen — grill, oven, pass, runner — models equipment nobody calls an API about, and it produces long chains with no decisions in them, which is the worst shape for a generated workflow. Instead, `done` fans out by fulfillment type: dine-in runs food to a table, pickup waits on a locker code, delivery blocks on courier assignment. Same three states, three genuinely different downstream graphs.

**3. Modifiers become groups with rules.** `mod_bacon` and `mod_egg` in one flat group produce no validation surface. Modifier groups with `required`, `min_select`, `max_select`, quantity tiers, substitutions, and incompatibility pairs produce eight new 4xx codes on the single most-called write endpoint in the system.

**4. Loyalty becomes rewards with a ledger and redeemable offers.** The old `loyalty.earn` was a leaf node — nothing depended on it. Offers that discount a check make rewards an *input* to `payments`, which creates the most useful failure in the whole spec: redeem an offer, then pay with the stale `due_cents`, and get `amount_mismatch`. That is a real integration bug and Atlas should be able to generate a workflow that avoids it.

---

## Run

```
npm install
npm run dev    # http://127.0.0.1:43123
# or
npm run build && npm run start
```

In-memory store. Reset Oak Street:

```
POST /v1/sandbox
{ "reset": true }
```

Optional scoped resets, so a delivery flow can re-run without rebuilding the menu:

```
{ "reset": true, "scope": ["checks", "delivery", "rewards"] }
```

Scopes: `checks`, `delivery`, `rewards`, `inventory`, `settlements`, `all` (default).

---

## Surfaces

| Surface | URL |
|---|---|
| Guest restaurant | `/` `/menu` `/order` `/rewards` |
| Staff (unlinked from guest nav) | `/tables` `/tables/{tableId}` `/kitchen` |
| API graph + list | `/apis` |
| OpenAPI 3.1 | `GET /openapi.json` (each operation has `x-depends-on`) |
| API index | `GET /v1/meta/apis` (depends_on per API) |
| Health | `GET /health` |

Guest checkout opens a **pickup fulfillment**, then a check, then pays by card. Picnic-table pay-at-table (workflow A) still works via `/tables/tbl_4`. There is no dispatch board in the restaurant UI — dispatch is API-only so Atlas can generate the long delivery chain.

Source of truth for the 35 APIs: `src/server/catalog.ts`. Handlers: `src/server/app.ts`. Behavior: `src/server/store.ts`. Seed: `src/server/seed.ts`. OpenAPI builder: `src/server/openapi.ts`. Modifier validation: `src/server/modifiers.ts`.

---

## Conventions

- Base path `/v1`. JSON in and out.
- Money is integer cents. `1100` = $11.00.
- Tax on Oak Street: `tax_or` at 8.5% of `(subtotal − discount − reward_discount)`. Delivery fee is **not** taxed. Courier tip is not taxed.
- Error envelope:
  ```json
  { "error": { "code": "item_86", "message": "...", "details": {} } }
  ```
- Checks carry a `version` integer. It increments on any total-changing write (add item, discount, redeem, void a line). `POST /v1/payments` accepts an optional `check_version`; if supplied and stale → `409 check_version_stale` with `details.current_version`. Omit it and you get the old behavior. This is opt-in so existing flows keep passing.
- After pay, the fulfillment closes. Dine-in additionally frees the table (`status: open`, `check_id: null`). The check still exists as `paid` — fetch it by check id, not by table.
- `POST /v1/payments` requires `amount_cents` equal to `check.totals.due_cents` (`422 amount_mismatch`). No split tender.
- Processor is Stripe-shaped, not live Stripe. `payment_method: pm_ok | pm_decline (402) | pm_timeout (504)`.
- Gift-card redeem captures without a processor charge. The card refund pipeline will 404 on `charge_id`.
- Reward redemption also captures no charge for its discount portion — it reduces `due_cents` before payment, so the card path is unaffected.

### Totals shape

```json
"totals": {
  "subtotal_cents": 1600,
  "discount_cents": -160,
  "reward_discount_cents": -500,
  "delivery_fee_cents": 349,
  "tax_cents": 80,
  "due_cents": 1369
}
```

`delivery_fee_cents` is `0` for dine-in and pickup. Order of operations: subtotal → code discount → reward discount → tax → add delivery fee.

---

## Fulfillment model

A check must have exactly one fulfillment. Create the fulfillment first, then the check.

```
POST /v1/fulfillments
{ "location_id": "loc_oak", "type": "dine_in", "table_id": "tbl_1" }
{ "location_id": "loc_oak", "type": "pickup", "guest_id": "gst_maya", "pickup_at": "2026-09-04T18:40:00Z" }
{ "location_id": "loc_oak", "type": "delivery", "guest_id": "gst_maya", "address_id": "addr_maya" }
```

```
POST /v1/checks { "fulfillment_id": "ful_x", "server_id": "emp_jon", "guest_id": "gst_maya" }
```

State machine, shared by all three types:

```
open ──> sent ──> ready ──> closing ──> closed
  └──────────────────────> canceled
```

`ready` is set by the kitchen bumping the last ticket to `done`. What `ready → closing` requires depends on type:

| Type | `ready → closing` requires | Failure if missing |
|---|---|---|
| `dine_in` | nothing; server runs the food | — |
| `pickup` | `POST /v1/fulfillments/{id}/handoff { code }` | `409 handoff_code_invalid` |
| `delivery` | a delivery in status `delivered` | `409 delivery_not_complete` |

`closing → closed` is the invoice. Type mismatches are rejected at creation: `table_id` on a delivery, or `address_id` on a dine-in, → `409 fulfillment_type_mismatch`.

Dine-in fulfillments are auto-created by `POST /v1/checks` when you pass `table_id` directly instead of `fulfillment_id`. That is the compatibility shim — see below.

---

## Modifier model

Line items carry `selections[]`. Each selection names a group, an option, and a quantity.

```
POST /v1/checks/{check_id}/items
{
  "item_id": "itm_townie",
  "quantity": 1,
  "selections": [
    { "group_id": "modg_patty",  "option_id": "mod_impossible", "qty": 1 },
    { "group_id": "modg_temp",   "option_id": "mod_medium",     "qty": 1 },
    { "group_id": "modg_add",    "option_id": "mod_bacon",      "qty": 2 },
    { "group_id": "modg_bun",    "option_id": "mod_gf_bun",     "qty": 1 }
  ],
  "removed_defaults": ["mod_pickle"],
  "notes": "cut in half"
}
```

Group shape:

```json
{
  "id": "modg_add",
  "name": "Add-ons",
  "selection_type": "multi",
  "required": false,
  "min_select": 0,
  "max_select": 4,
  "options": [
    { "id": "mod_bacon",   "name": "Bacon",    "price_delta_cents": 200, "max_qty": 2, "default": false },
    { "id": "mod_egg",     "name": "Fried egg","price_delta_cents": 150, "max_qty": 1, "default": false },
    { "id": "mod_avocado", "name": "Avocado",  "price_delta_cents": 175, "max_qty": 1, "default": false, "is_86": true }
  ],
  "incompatible_with": [["mod_egg", "mod_impossible"]]
}
```

Four behaviors, each with its own failure:

1. **Required single-select.** `modg_patty` and `modg_temp` are `required: true`, `max_select: 1`. Omit → `422 modifier_group_required`.
2. **Quantity.** `mod_bacon` has `max_qty: 2`. Extra bacon is `qty: 2` and the delta multiplies. Over → `422 modifier_qty_exceeded`.
3. **Substitution.** `modg_patty` non-default options carry deltas: Impossible +250, black bean +0, crispy chicken +100.
4. **Removal.** `default: true` options deselected via `removed_defaults`. These appear on the ticket as "NO PICKLE" — the kitchen must see them. Removing a non-default → `422 not_a_default`.

86'd modifiers are separate from 86'd items. `mod_avocado` is 86'd at seed → `409 modifier_86`. Inventory decrements on `send` for modifiers too.

Modifier prices multiply by line `quantity`, not just by `qty`. Two burgers with extra bacon is `+800`.

---

## Rewards model

Replaces the old `loyalty` API. Three APIs: `rewards`, `offers`, `redemptions`.

**Points ledger.** Append-only. `GET /v1/rewards/accounts/{guest_id}/ledger` returns entries; the `points_balance` on the account is a rollup. Never mutate the balance as source of truth — expiry writes a negative entry with `reason: "expire"`, and that is how a support flow explains a missing 500 points.

```json
{
  "id": "led_0031",
  "guest_id": "gst_maya",
  "delta": -500,
  "reason": "redeem",
  "check_id": "chk_ok",
  "offer_id": "off_free_fries",
  "balance_after": 740,
  "created_at": "2026-09-04T18:14:22Z"
}
```

**Earn.** 1 point per $1 of `(subtotal − discount − reward_discount)`. Gold earns 1.5×. Written by `POST /v1/rewards/accounts/{guest_id}/earn { payment_id }` — still explicit, still after payment, same as before.

**Tiers.** `bronze` $0 / `silver` $150 / `gold` $500 trailing spend. Tier is on the account, recomputed on earn.

**Offers.** Redeemable against an open check. Shapes: `amount_off`, `percent_off`, `free_item`.

```
GET  /v1/offers?guest_id=gst_maya        eligible offers only
GET  /v1/offers/{offer_id}
POST /v1/redemptions { "check_id", "offer_id", "guest_id" }
DELETE /v1/redemptions/{redemption_id}   un-apply, refunds points
```

Redemption writes `reward_discount_cents` on the check and bumps `check.version`. **The due changes.** Any flow that quoted a due before redeeming must re-fetch, or `POST /v1/payments` returns `422 amount_mismatch`. This is the single most valuable failure in the spec — it is the bug real integrations ship.

One offer per check → `409 already_redeemed`. Offers and code discounts stack; both apply before tax.

---

## Delivery model

Five APIs: `zones`, `delivery`, `couriers`, `dispatch`, `tracking`.

**Zones.** Oak Street has two: `zone_oak_core` (fee 349, ETA 25m) and `zone_oak_edge` (fee 599, ETA 45m). Anything outside → `422 address_out_of_zone` at fulfillment creation.

```
GET  /v1/locations/loc_oak/zones
POST /v1/zones/check { "location_id": "loc_oak", "address_id": "addr_far" }  → { in_zone: false }
```

**Quote is side-effect free** and carries `expires_at` (5 minutes). The cart shows a fee before anyone commits.

```
POST /v1/delivery/quote { "location_id": "loc_oak", "address_id": "addr_maya" }
→ { "quote_id": "qte_1", "fee_cents": 349, "eta_minutes": 25, "zone_id": "zone_oak_core", "expires_at": "..." }
```

**Lifecycle.** This is the long chain Atlas should be generating against.

```
POST /v1/delivery { fulfillment_id, quote_id }        → status: pending
POST /v1/dispatch { delivery_id }                     → assigns courier, status: assigned
POST /v1/dispatch/{delivery_id}/accept { courier_id } → status: accepted
POST /v1/delivery/{delivery_id}/pickup                → status: picked_up   (requires fulfillment ready)
POST /v1/tracking/{delivery_id}/ping { lng, lat }     → appends to trail
POST /v1/delivery/{delivery_id}/deliver { proof_photo_url?, notes? } → status: delivered
POST /v1/delivery/{delivery_id}/fail { reason }       → status: failed
POST /v1/delivery/{delivery_id}/cancel                → status: canceled
```

Locations are GeoJSON: `{ "type": "Point", "coordinates": [lng, lat] }`. Longitude first.

`crr_dee` is offline at seed. Dispatch with only offline couriers → `503 no_courier_available`, which is the one retryable failure in the system and should be classified as such. `crr_flake` accepts then rejects → `409 courier_rejected`, requiring re-dispatch.

`POST .../pickup` before the fulfillment is `ready` → `409 delivery_not_ready`. `POST .../deliver` on a `zone_oak_edge` delivery without `proof_photo_url` → `422 proof_required`.

**Courier tip is separate from server tip.** `POST /v1/tips/courier { delivery_id, amount_cents }` vs the existing `POST /v1/payments/{payment_id}/tip`. Both are once-only. Courier tip settles to the courier line in the settlement, not the server line — this is what makes `GET /v1/reports/sales` interesting after the change.

---

## Seeded IDs

Reset before scripted flows. Everything from the previous seed is preserved.

### Unchanged

| Id | What |
|---|---|
| `loc_oak` | Oak Street. Phone (503) 555-0140. |
| `tbl_1`…`tbl_8` | Picnic tables. 2 and 4 occupied at seed. |
| `tbl_4` / `chk_ok` | Maya Chen, open. Townie + fries, already sent. Due 1736. |
| `tbl_2` / `chk_12` | Open. Double Townie + bacon. Kitchen ticket `kds_12` queued. |
| `chk_paid` / `pay_paid` / `ch_paid` / `inv_paid` / `rcp_paid` | Closed vanilla shake. Amount 651. Use for refund. Not on a table. |
| `emp_jon` | Server (clocked in). `emp_renee` manager. |
| `menu_dinner` | Dinner board. |
| `itm_townie` 1100, `itm_double` 1500, `itm_jalapeno` 1300, `itm_fries` 500, `itm_shake` 600 | Active items. |
| `itm_86` | 86'd malt. `POST .../items` → 409 `item_86`. |
| `dsc_local10` / code `LOCAL10` | 10% off. |
| `gf_25` | Gift card 2500 cents, last4 4412. |
| `kds_ok` | Table 4 ticket, fired. |
| `set_today` | Open settlement; includes `pay_paid`. |
| `wh_partner` | Example webhook URL. |

### Changed

| Id | What | Change |
|---|---|---|
| `gst_maya` | Guest. **1240 points, gold tier**, 4 punches. | Was 120 points. Bumped so redemption flows work without a top-up step. |
| `mod_bacon` +200, `mod_egg` +150 | Now in group `modg_add`, `max_qty` 2 and 1. | Group `modg_add` gains rules. |
| `chk_ok`, `chk_12` | Now carry `fulfillment_id` (`ful_dine_4`, `ful_dine_2`). | Table lookups still work. |

### New

| Id | What |
|---|---|
| `ful_dine_4` / `ful_dine_2` | Dine-in fulfillments backing the seeded open checks. |
| `ful_pickup_1` | Pickup, ready, handoff code `4412`. |
| `ful_dlv_1` | Delivery, sent, backing `dlv_pending`. |
| `gst_theo` | Guest. 40 points, bronze. Use for `insufficient_points`. |
| `addr_maya` | 1100 SE Oak St. In `zone_oak_core`. |
| `addr_theo` | In `zone_oak_edge`. Proof photo required on delivery. |
| `addr_far` | Hillsboro. Out of zone → `422`. |
| `zone_oak_core` 349 / 25m, `zone_oak_edge` 599 / 45m | Delivery zones. |
| `crr_sam` | Courier, available, scooter. Happy path. |
| `crr_dee` | Courier, offline. Only courier in a `no_courier_available` scenario. |
| `crr_flake` | Courier, available, rejects on accept → `409 courier_rejected`. |
| `dlv_pending` | Delivery awaiting dispatch. Entry point for workflow E. |
| `dlv_enroute` | Delivery in `picked_up`, one ping on the trail. Entry point for workflow H. |
| `modg_patty` | Required, single. `mod_beef` 0 (default), `mod_black_bean` 0, `mod_impossible` +250, `mod_chicken` +100. |
| `modg_temp` | Required, single. `mod_medium` (default), `mod_med_well`, `mod_well`. |
| `modg_bun` | Single. `mod_potato_bun` (default), `mod_gf_bun` +150, `mod_lettuce_wrap` 0. |
| `modg_add` | Multi, max 4. `mod_bacon` +200 (max_qty 2), `mod_egg` +150, `mod_avocado` +175 **86'd**. |
| `modg_default` | Multi. `mod_pickle`, `mod_onion`, `mod_sauce` — all `default: true`, 0 cents. Removal targets. |
| `off_free_fries` | 500 pts, `free_item` `itm_fries`. |
| `off_5off` | 750 pts, `amount_off` 500. |
| `off_gold_shake` | 400 pts, `free_item` `itm_shake`, **requires gold** → `403 tier_required` for `gst_theo`. |
| `off_expired` | Expired yesterday → `410 offer_expired`. |
| `rwd_maya` / `rwd_theo` | Reward accounts. `led_0001`…`led_0006` seeded ledger entries on Maya. |
| `alg_gluten` `alg_dairy` `alg_soy` `alg_egg` | Allergen tags on items and modifiers. |

Incompatible pair at seed: `mod_egg` + `mod_impossible` → `409 modifier_incompatible`. It is arbitrary and that is fine; it exists so the code has a fixture.

---

## Canonical workflows

A–D are unchanged and must keep passing. E–I are new.

### A. Pay at table (UI: `/tables/tbl_4`)

1. `GET /v1/tables/tbl_4` → `check_id`
2. `GET /v1/checks/{check_id}` → `totals.due_cents`
3. `POST /v1/payments { check_id, method: "card", amount_cents: <due> }`
4. `POST /v1/processor/charges { payment_id, payment_method: "pm_ok" }`
5. `POST /v1/invoices { payment_id }` → check paid, fulfillment closed, table freed
6. `GET /v1/checks/{check_id}/receipt`
7. Optional `POST /v1/payments/{payment_id}/tip { amount_cents }` (tip on subtotal, not due)
8. Optional `POST /v1/rewards/accounts/gst_maya/earn { payment_id }` if `guest_id` set

Failures: `pm_decline` → 402 `card_declined`; `pm_timeout` → 504 `processor_timeout`. Invoice without capture → 409 `payment_not_captured`.

### B. Refund then void (API only — no restaurant screen)

Fixture: `chk_paid` / `pay_paid` / `ch_paid`.

1. `POST /v1/refunds { payment_id: "pay_paid" }` → accepted
2. `POST /v1/processor/refunds { charge_id: "ch_paid" }` → reversed
3. `POST /v1/checks/chk_paid/void` → `{ confirmation, status: "voided" }`

Void without a processor-reversed refund → 409 `void_not_allowed`.

### C. Order then kitchen

1. `GET /v1/menus/menu_dinner`, then `GET /v1/catalog/items` and `GET /v1/inventory`
2. `GET /v1/catalog/modifier-groups?item_id=itm_townie`
3. Open or reuse a check
4. `POST /v1/checks/{check_id}/items` with `selections[]`
5. `POST /v1/checks/{check_id}/send` → ticket queued, inventory decremented
6. `GET /v1/kds/tickets`, then `PATCH /v1/kds/tickets/{ticket_id} { status: "fired" | "done" }`

`itm_86` on add → 409. Send with nothing unsent → 409 `nothing_to_send`. Last ticket `done` → fulfillment `ready`.

### D. Local discount then pay

`POST /v1/checks/{check_id}/discounts { code: "LOCAL10" }`, then pay with the **new** `due_cents`.

### E. Delivery end to end (new — the long chain)

The point of this one is that it is nine hops with three branch points.

1. `POST /v1/zones/check { location_id: "loc_oak", address_id: "addr_maya" }` → in zone
2. `POST /v1/delivery/quote { location_id, address_id }` → `quote_id`, fee 349
3. `POST /v1/fulfillments { type: "delivery", guest_id: "gst_maya", address_id: "addr_maya" }`
4. `POST /v1/checks { fulfillment_id, server_id: "emp_jon", guest_id: "gst_maya" }`
5. `POST /v1/checks/{id}/items` → `POST /v1/checks/{id}/send`
6. `POST /v1/delivery { fulfillment_id, quote_id }` → `dlv_x` pending
7. `POST /v1/dispatch { delivery_id: "dlv_x" }` → `crr_sam` assigned → `POST /v1/dispatch/dlv_x/accept { courier_id: "crr_sam" }`
8. Kitchen bumps tickets to `done` → fulfillment `ready`
9. `POST /v1/delivery/dlv_x/pickup` → ping → `POST /v1/delivery/dlv_x/deliver`
10. Pay pipeline as in A, then `POST /v1/tips/courier { delivery_id, amount_cents }`

Branch points: zone check, dispatch availability, ready-gate on pickup.

### F. Build a burger (new — validation tree)

Same shape as C but the interesting part is what fails. Each of these is a distinct Atlas error branch off one endpoint:

| Attempt | Result |
|---|---|
| No `modg_patty` selection | `422 modifier_group_required` |
| Two patties in `modg_patty` | `422 modifier_max_exceeded` |
| `mod_bacon` `qty: 3` | `422 modifier_qty_exceeded` |
| `mod_avocado` | `409 modifier_86` |
| `mod_egg` + `mod_impossible` | `409 modifier_incompatible` |
| `removed_defaults: ["mod_bacon"]` | `422 not_a_default` |
| Five options in `modg_add` | `422 modifier_max_exceeded` |

### G. Rewards redemption then pay (new — the stale-due trap)

1. `GET /v1/rewards/accounts/gst_maya` → 1240 points, gold
2. `GET /v1/offers?guest_id=gst_maya` → eligible only; `off_gold_shake` present, `off_expired` absent
3. `GET /v1/checks/{check_id}` → note `due_cents` and `version`
4. `POST /v1/redemptions { check_id, offer_id: "off_free_fries", guest_id }` → ledger `-500`, `version` bumped
5. **Re-fetch the check.** `due_cents` has changed.
6. Pay with the new due, then `POST /v1/rewards/accounts/gst_maya/earn { payment_id }`

Skipping step 5 → `422 amount_mismatch`. Passing the stale `check_version` in step 6 → `409 check_version_stale`. Atlas should generate the version-aware variant.

Failures: `gst_theo` on `off_gold_shake` → `403 tier_required`. `gst_theo` on `off_5off` → `409 insufficient_points`. `off_expired` → `410 offer_expired`. Second redemption → `409 already_redeemed`.

### H. Delivery failed then refund (new — cross-domain recovery)

Fixture: `dlv_enroute`.

1. `POST /v1/delivery/dlv_enroute/fail { reason: "customer_unreachable" }`
2. `GET /v1/fulfillments/{id}` → still `ready`, not closing
3. If already paid: `POST /v1/refunds { payment_id }` → `POST /v1/processor/refunds { charge_id }` → `POST /v1/checks/{id}/void`
4. If unpaid: `POST /v1/fulfillments/{id}/cancel` → inventory is **not** restocked (food was made); ticket already `done`

This is the only workflow that crosses delivery → money → floor, and it is the best blast-radius demo in the set.

### I. Guest dietary filter (new — short, read-only)

1. `GET /v1/guests/gst_maya` → `dietary_profile.avoid: ["alg_dairy"]`
2. `GET /v1/allergens`
3. `GET /v1/catalog/items?exclude_allergens=alg_dairy` → filtered board
4. Adding an excluded item anyway → `200` with `warnings[]`, not an error. Allergen conflict warns; it does not block. `409 allergen_conflict` fires only when the guest profile is `strict: true`.

---

## API catalog (35)

Connectivity: `depends_on` below. Same list on every OpenAPI operation as `x-depends-on`. **N** marks new, **C** marks changed.

### Venue

| API | depends_on | Operations |
|---|---|---|
| `locations` | — | `GET /v1/locations` · `GET /v1/locations/{location_id}` |
| `floor` **C** | `locations`, `fulfillment` | `GET /v1/locations/{location_id}/tables` · `GET /v1/tables/{table_id}` |
| `zones` **N** | `locations` | `GET /v1/locations/{location_id}/zones` · `POST /v1/zones/check { location_id, address_id }` |

### Menu

| API | depends_on | Operations |
|---|---|---|
| `menus` | `locations` | `GET /v1/menus?location_id=` · `GET /v1/menus/{menu_id}` |
| `catalog` **C** | `menus` | `GET /v1/catalog/items?exclude_allergens=` · `GET /v1/catalog/items/{item_id}` · `PATCH /v1/catalog/items/{item_id} { price?, name?, is_active? }` |
| `modifiers` **C** | `catalog` | `GET /v1/catalog/modifier-groups?item_id=` · `GET /v1/catalog/modifier-groups/{group_id}` · `GET /v1/catalog/modifiers` |
| `allergens` **N** | `catalog`, `modifiers` | `GET /v1/allergens` · `GET /v1/catalog/items/{item_id}/allergens` |
| `taxes` | `locations` | `GET /v1/taxes` |
| `discounts` | `catalog` | `GET /v1/discounts` · `POST /v1/checks/{check_id}/discounts { code }` |
| `inventory` **C** | `catalog`, `modifiers` | `GET /v1/inventory` · `GET /v1/inventory/{item_id}` |

### Service

| API | depends_on | Operations |
|---|---|---|
| `guests` **C** | `locations` | `GET /v1/guests` · `GET /v1/guests/{guest_id}` · `GET /v1/guests/{guest_id}/addresses` |
| `addresses` **N** | `guests`, `zones` | `GET /v1/addresses/{address_id}` · `POST /v1/guests/{guest_id}/addresses { line1, city, postal_code }` |
| `employees` | `locations` | `GET /v1/employees` |
| `fulfillment` **N** | `locations`, `guests`, `addresses` | `POST /v1/fulfillments { location_id, type, table_id?, address_id?, pickup_at? }` · `GET /v1/fulfillments/{id}` · `GET /v1/fulfillments?status=&type=` · `POST /v1/fulfillments/{id}/handoff { code }` · `POST /v1/fulfillments/{id}/cancel` |
| `checks` **C** | `fulfillment`, `guests`, `employees` | `GET /v1/checks?status=open\|paid\|voided` · `GET /v1/checks/{check_id}` · `POST /v1/checks { fulfillment_id, server_id, guest_id? }` |
| `orders` **C** | `checks`, `catalog`, `modifiers`, `inventory`, `allergens` | `POST /v1/checks/{check_id}/items { item_id, quantity?, selections?, removed_defaults?, notes? }` · `POST /v1/checks/{check_id}/send` |
| `kitchen` **C** | `orders`, `fulfillment` | `GET /v1/kds/tickets` · `PATCH /v1/kds/tickets/{ticket_id} { status: queued\|fired\|done }` |

Check JSON includes `items[]` (sent, selections with resolved names and deltas, removed_defaults, price per unit), `fulfillment_id`, `version`, and `totals`.

### Delivery

| API | depends_on | Operations |
|---|---|---|
| `couriers` **N** | `locations` | `GET /v1/couriers?location_id=&status=` · `GET /v1/couriers/{courier_id}` |
| `delivery` **N** | `fulfillment`, `zones`, `orders` | `POST /v1/delivery/quote { location_id, address_id }` · `POST /v1/delivery { fulfillment_id, quote_id }` · `GET /v1/delivery/{delivery_id}` · `POST /v1/delivery/{id}/pickup` · `POST /v1/delivery/{id}/deliver { proof_photo_url?, notes? }` · `POST /v1/delivery/{id}/fail { reason }` · `POST /v1/delivery/{id}/cancel` |
| `dispatch` **N** | `delivery`, `couriers` | `POST /v1/dispatch { delivery_id, courier_id? }` · `POST /v1/dispatch/{delivery_id}/accept { courier_id }` · `POST /v1/dispatch/{delivery_id}/reject { courier_id, reason }` |
| `tracking` **N** | `dispatch` | `POST /v1/tracking/{delivery_id}/ping { lng, lat }` · `GET /v1/tracking/{delivery_id}` |

### Money

| API | depends_on | Operations |
|---|---|---|
| `payments` **C** | `checks`, `taxes`, `discounts`, `redemptions` | `POST /v1/payments { check_id, method, amount_cents, check_version? }` · `GET /v1/payments/{payment_id}` |
| `processor` | `payments` | `POST /v1/processor/charges { payment_id, payment_method }` · `POST /v1/processor/refunds { charge_id, refund_id? }` |
| `invoices` **C** | `payments`, `checks`, `fulfillment` | `POST /v1/invoices { payment_id }` · `GET /v1/invoices/{invoice_id}` |
| `receipts` | `invoices`, `payments` | `GET /v1/receipts/{receipt_id}` · `GET /v1/checks/{check_id}/receipt` |
| `tips` **C** | `receipts`, `payments`, `processor`, `delivery` | `POST /v1/payments/{payment_id}/tip { amount_cents }` · `POST /v1/tips/courier { delivery_id, amount_cents }` |
| `refunds` | `payments`, `processor` | `POST /v1/refunds { payment_id, amount_cents? }` · `GET /v1/refunds/{refund_id}` |
| `voids` | `refunds`, `checks` | `POST /v1/checks/{check_id}/void` |
| `gift-cards` | `payments` | `GET /v1/gift-cards/{gift_card_id}` · `POST /v1/gift-cards/{gift_card_id}/redeem { payment_id, amount_cents }` |
| `rewards` **C** | `guests`, `payments` | `GET /v1/rewards/accounts/{guest_id}` · `GET /v1/rewards/accounts/{guest_id}/ledger` · `POST /v1/rewards/accounts/{guest_id}/earn { payment_id }` |
| `offers` **N** | `rewards`, `catalog` | `GET /v1/offers?guest_id=` · `GET /v1/offers/{offer_id}` |
| `redemptions` **N** | `offers`, `checks` | `POST /v1/redemptions { check_id, offer_id, guest_id }` · `GET /v1/redemptions/{redemption_id}` · `DELETE /v1/redemptions/{redemption_id}` |

### Ops

| API | depends_on | Operations |
|---|---|---|
| `webhooks` **C** | `payments`, `orders`, `refunds`, `delivery`, `redemptions` | `GET /v1/webhooks` · `POST /v1/webhooks { url, events[] }` |
| `settlements` **C** | `payments`, `processor`, `tips`, `refunds` | `GET /v1/settlements` · `POST /v1/settlements/{settlement_id}/close` |
| `reports` **C** | `settlements`, `checks`, `payments`, `delivery` | `GET /v1/reports/sales?group_by=fulfillment_type` |
| `sandbox` **N** | — | `POST /v1/sandbox { reset, scope? }` |

Webhook events: `payment.captured`, `order.sent`, `refund.accepted`, `check.voided`, plus new `delivery.assigned`, `delivery.delivered`, `delivery.failed`, `reward.redeemed`, `fulfillment.ready`.

Settlements gain a `courier_tips_cents` line separate from `server_tips_cents`. `GET /v1/reports/sales?group_by=fulfillment_type` splits dine-in / pickup / delivery.

---

## Notable failure codes

Existing, unchanged:

| Code | Status | When |
|---|---|---|
| `item_86` | 409 | Order `itm_86` or any 86'd item |
| `table_occupied` | 409 | Open a check on a seated table |
| `amount_mismatch` | 422 | Payment ≠ due |
| `card_declined` | 402 | `pm_decline` |
| `processor_timeout` | 504 | `pm_timeout` |
| `payment_not_captured` | 409 | Invoice or tip before charge |
| `not_refundable` | 409 | Refund a non-captured payment |
| `already_refunded` | 409 | Second processor refund |
| `void_not_allowed` | 409 | Void without reversed refund |
| `insufficient_balance` | 409 | Gift card < amount |
| `nothing_to_send` | 409 | Send with no unsent lines |
| `tip_already_added` | 409 | Second tip |
| `already_closed` | 409 | Close settlement twice |

New:

| Code | Status | When |
|---|---|---|
| `fulfillment_type_mismatch` | 409 | `table_id` on delivery, `address_id` on dine-in |
| `handoff_code_invalid` | 409 | Wrong pickup code |
| `check_version_stale` | 409 | `check_version` supplied and out of date |
| `modifier_group_required` | 422 | Required group omitted |
| `modifier_max_exceeded` | 422 | Over `max_select` |
| `modifier_qty_exceeded` | 422 | Over an option's `max_qty` |
| `modifier_86` | 409 | 86'd modifier (`mod_avocado`) |
| `modifier_incompatible` | 409 | `mod_egg` + `mod_impossible` |
| `not_a_default` | 422 | `removed_defaults` names a non-default |
| `allergen_conflict` | 409 | Strict-profile guest, conflicting item |
| `address_out_of_zone` | 422 | Address outside every zone |
| `quote_expired` | 410 | Quote older than 5 minutes |
| `no_courier_available` | 503 | No available courier — **retryable** |
| `courier_rejected` | 409 | `crr_flake` rejects; re-dispatch |
| `delivery_already_assigned` | 409 | Second dispatch |
| `delivery_not_ready` | 409 | Pickup before fulfillment `ready` |
| `delivery_not_complete` | 409 | Invoice a delivery check before `delivered` |
| `proof_required` | 422 | Deliver in `zone_oak_edge` without photo |
| `insufficient_points` | 409 | Redeem beyond balance |
| `tier_required` | 403 | `gst_theo` on `off_gold_shake` |
| `offer_expired` | 410 | `off_expired` |
| `already_redeemed` | 409 | Second offer on one check |

`no_courier_available` is the only code Atlas should classify as retryable. Everything else is terminal or requires a different branch. Flag that explicitly in the catalog so the generator does not retry a 402.

---

## Compatibility

What keeps working without changes:

- `POST /v1/checks { location_id, table_id, server_id }` — auto-creates a dine-in fulfillment. `fulfillment_id` is optional.
- `GET /v1/tables/{id}` still returns `check_id`. The floor UI does not change.
- `POST /v1/checks/{id}/items { modifier_ids: [...] }` — normalized into `selections[]` by inferring the group from each modifier. Defaults fill in required groups. Legacy shape stays valid.
- `GET /v1/loyalty/accounts/{guest_id}` and `/earn` — 308 to `/v1/rewards/...`. Keep the redirects for one release; then delete.
- Workflows A–D pass unmodified.

What breaks:

- `gst_maya` points balance changed from 120 to 1240. Any assertion on 120 fails.
- `checks.depends_on` changed. Anything reading the graph shape from `/v1/meta/apis` sees a new edge set — which is the point, but re-import into Atlas rather than diffing.
- Check JSON gains `version`, `fulfillment_id`, and two `totals` keys. Additive, but strict schema validators will trip.

---

## Build order

Ship in this order. Each stage leaves the app working.

1. **`fulfillment` + `sandbox` scoping.** Everything else depends on it. Backfill dine-in fulfillments for `chk_ok` and `chk_12`. A–D must still pass at the end of this stage; that is the gate.
2. **Modifier groups.** Highest failure-per-line-of-code in the whole plan. Workflow F falls out immediately, and `/menu` gets a real build-a-burger screen.
3. **Rewards.** `rewards` → `offers` → `redemptions`, in that order. Do the ledger before the offers; the balance rollup gets wrong otherwise.
4. **Delivery.** `zones` → `couriers` → `delivery` → `dispatch` → `tracking`. Quote and zone check first so `/order` can show a fee before any of the state machine exists.
5. **Allergens, courier tips, report grouping.** Cleanup pass. `allergens` is the one item on this list that can be cut without hurting the graph.

Stages 1–2 already improve the graph meaningfully. Stages 3–4 are where the generated workflows get long enough to be worth demoing.

---

## Repo layout (where to edit)

```
src/server/catalog.ts       35 APIs, dependsOn, operations, failures
src/server/app.ts           Hono routes
src/server/store.ts         Behavior
src/server/modifiers.ts     Selection validation, price rollup
src/server/errors.ts        HttpError envelope
src/server/seed.ts          Oak Street fixtures
src/server/openapi.ts       /openapi.json
src/lib/burgertown.ts       Browser client used by the restaurant UI
src/components/customer.tsx Guest menu, bag, rewards
src/components/restaurant.tsx  Staff tables + kitchen (unlinked)
src/components/api-explorer.tsx   /apis Graph + List
saved/visualization/        Frozen old sandbox; do not import into the app
```

---

## Do not

- Do not generate split tender (partial gift card + card). Payments reject any `amount_cents` ≠ due.
- Do not run the card refund pipeline after gift-card capture (no `charge_id`).
- Do not void an unpaid check.
- Do not run the card refund pipeline against a reward discount. The discount reduces the due before payment; there is nothing to reverse.
- Do not dispatch a delivery whose fulfillment is `canceled`.
- Do not add Atlas demo UI to the restaurant site.
- Do not add kitchen states beyond `queued | fired | done`. If someone asks for grill/fry/expo granularity, add a `station` field on the ticket and split one order into several tickets. Same three states per ticket.
