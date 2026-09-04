# Burgertown API handoff

Give this file to another agent. It is the contract for Burgertown: a fictional smash-burger restaurant whose HTTP APIs Atlas (or any workflow generator) can import.

Burgertown is **not** Atlas. It is the dummy merchant. Atlas owns blast radius, error classification, and workflow generation. Do not add Atlas demo UI (flow playground, “break catalog contract”, blast-radius console) to the live restaurant site.

Product copy on guest/staff pages must not say “POS”. Specs may describe restaurant resources (checks, tickets, processor).

## Run

```bash
npm install
npm run dev    # http://127.0.0.1:43123
# or
npm run build && npm run start
```

In-memory store. Reset Oak Street:

```http
POST /v1/sandbox
{ "reset": true }
```

| Surface | URL |
| --- | --- |
| Restaurant | `/` `/menu` `/tables` `/tables/{tableId}` `/kitchen` |
| API graph + list | `/apis` |
| OpenAPI 3.1 | `GET /openapi.json` (each operation has `x-depends-on`) |
| API index | `GET /v1/meta/apis` (`depends_on` per API) |
| Health | `GET /health` |

Source of truth for the 25 APIs: `src/server/catalog.ts`. Handlers: `src/server/app.ts`. Behavior: `src/server/store.ts`. Seed: `src/server/seed.ts`. OpenAPI builder: `src/server/openapi.ts`.

## Conventions

- Base path `/v1`. JSON in and out.
- Money is **integer cents**. `1100` = $11.00.
- Tax on Oak Street: `tax_or` at **8.5%** of (subtotal − discount).
- Error envelope:

```json
{ "error": { "code": "item_86", "message": "...", "details": {} } }
```

- After pay, the table is freed (`status: open`, `check_id: null`) but the check still exists as `paid`. Fetch it by check id, not by table.
- `POST /v1/payments` requires `amount_cents` **equal to** `check.totals.due_cents` (`422 amount_mismatch`). No split tender.
- Processor is Stripe-shaped, not live Stripe. `payment_method`: `pm_ok` | `pm_decline` (402) | `pm_timeout` (504).
- Gift-card redeem **captures without a processor charge**. The card refund pipeline will 404 on `charge_id`.

## Seeded IDs

Reset before scripted flows.

| Id | What |
| --- | --- |
| `loc_oak` | Oak Street. Phone `(503) 555-0140`. |
| `tbl_1`…`tbl_8` | Picnic tables. 2 and 4 occupied at seed. |
| `tbl_4` / `chk_ok` | Maya Chen, open. Townie + fries, already sent. Due **1736**. |
| `tbl_2` / `chk_12` | Open. Double Townie + bacon. Kitchen ticket `kds_12` queued. |
| `chk_paid` / `pay_paid` / `ch_paid` / `inv_paid` / `rcp_paid` | Closed vanilla shake. Amount **651**. Use for refund. **Not** on a table. |
| `gst_maya` | Guest. Loyalty 120 points / 4 punches. |
| `emp_jon` | Server (clocked in). `emp_renee` manager. |
| `menu_dinner` | Dinner board. |
| `itm_townie` 1100, `itm_double` 1500, `itm_jalapeno` 1300, `itm_fries` 500, `itm_shake` 600 | Active items. |
| `itm_86` | 86’d malt. `POST .../items` → `409 item_86`. |
| `mod_bacon` +200, `mod_egg` +150 | Group `modg_add`. |
| `dsc_local10` / code `LOCAL10` | 10% off. |
| `gf_25` | Gift card **2500** cents, last4 `4412`. |
| `kds_ok` | Table 4 ticket, `fired`. |
| `set_today` | Open settlement; includes `pay_paid`. |
| `wh_partner` | Example webhook URL. |

Open a new check: `POST /v1/checks` `{ "location_id": "loc_oak", "table_id": "tbl_1", "server_id": "emp_jon" }`. Optional `guest_id`.

## Canonical workflows (implement these as Atlas flows)

### A. Pay at table (UI: `/tables/tbl_4`)

Happy path uses `chk_ok` or any open check with items.

1. `GET /v1/tables/tbl_4` → `check_id`
2. `GET /v1/checks/{check_id}` → `totals.due_cents`
3. `POST /v1/payments` `{ "check_id", "method": "card", "amount_cents": <due> }`
4. `POST /v1/processor/charges` `{ "payment_id", "payment_method": "pm_ok" }`
5. `POST /v1/invoices` `{ "payment_id" }` → check `paid`, table freed
6. `GET /v1/checks/{check_id}/receipt`
7. Optional `POST /v1/payments/{payment_id}/tip` `{ "amount_cents" }` (tip on **subtotal**, not due)
8. Optional `POST /v1/loyalty/accounts/gst_maya/earn` `{ "payment_id" }` if `guest_id` set

Failures for Atlas error trees: `pm_decline` → 402 `card_declined`; `pm_timeout` → 504 `processor_timeout`. Invoice without capture → 409 `payment_not_captured`.

### B. Refund then void (API only — no restaurant screen)

Fixture: `chk_paid` / `pay_paid` / `ch_paid`.

1. `POST /v1/refunds` `{ "payment_id": "pay_paid" }` → accepted
2. `POST /v1/processor/refunds` `{ "charge_id": "ch_paid" }` → reversed
3. `POST /v1/checks/chk_paid/void` → `{ confirmation, status: "voided" }`

Void without a **processor-reversed** refund → 409 `void_not_allowed`.

### C. Order then kitchen

1. `GET /v1/menus/menu_dinner` then `GET /v1/catalog/items` and `GET /v1/inventory`
2. `GET /v1/catalog/modifiers` for bacon/egg
3. Open or reuse a check
4. `POST /v1/checks/{check_id}/items` `{ "item_id": "itm_townie", "quantity": 1, "modifier_ids": ["mod_bacon"] }`
5. `POST /v1/checks/{check_id}/send` → ticket queued, inventory decremented
6. `GET /v1/kds/tickets` then `PATCH /v1/kds/tickets/{ticket_id}` `{ "status": "fired" | "done" }`

`itm_86` on add → 409. Send with nothing unsent → 409 `nothing_to_send`.

### D. Local discount then pay

`POST /v1/checks/{check_id}/discounts` `{ "code": "LOCAL10" }` then pay with the **new** `due_cents`.

## What the UI already does

| Page | APIs |
| --- | --- |
| `/` | location, menu, catalog, inventory, tables, open checks, guests |
| `/menu?table=tbl_N` | menu, items, modifiers, inventory, open check, add item |
| `/tables/{id}` | table, check, pay pipeline (`pm_ok` only), tip, LOCAL10, send, loyalty |
| `/kitchen` | tickets, checks, tables, bump |
| `/apis` | graph + list from `API_CATALOG` |

Not in the UI: refund/void, `pm_decline` / `pm_timeout`, gift cards, settlements, reports, webhooks, catalog PATCH.

## Suggested Atlas workflows to add

Safe (existing APIs, unused composition):

1. **Gift-card tender** — `POST /v1/payments` then `POST /v1/gift-cards/gf_25/redeem` `{ "payment_id", "amount_cents" }` then invoice + receipt. Stop there. Due must be ≤ 2500.
2. **End of day** — `GET /v1/settlements` → `POST /v1/settlements/set_today/close` → `GET /v1/reports/sales`.

Do **not** generate split tender (partial gift + card). Payments reject any `amount_cents ≠ due`. Do **not** run the card refund pipeline after gift-card capture (no `charge_id`). Do **not** void an unpaid check.

## API catalog (25)

Connectivity: `depends_on` below. Same list on every OpenAPI operation as `x-depends-on`.

### Venue

| API | depends_on | Operations |
| --- | --- | --- |
| **locations** | — | `GET /v1/locations` · `GET /v1/locations/{location_id}` |
| **floor** | locations | `GET /v1/locations/{location_id}/tables` · `GET /v1/tables/{table_id}` |

### Menu

| API | depends_on | Operations |
| --- | --- | --- |
| **menus** | locations | `GET /v1/menus?location_id=` · `GET /v1/menus/{menu_id}` |
| **catalog** | menus | `GET /v1/catalog/items` · `GET /v1/catalog/items/{item_id}` · `PATCH /v1/catalog/items/{item_id}` `{ price?, name?, is_active? }` |
| **modifiers** | catalog | `GET /v1/catalog/modifiers` |
| **taxes** | locations | `GET /v1/taxes` |
| **discounts** | catalog | `GET /v1/discounts` · `POST /v1/checks/{check_id}/discounts` `{ code }` |
| **inventory** | catalog | `GET /v1/inventory` · `GET /v1/inventory/{item_id}` |

### Service

| API | depends_on | Operations |
| --- | --- | --- |
| **guests** | locations | `GET /v1/guests` · `GET /v1/guests/{guest_id}` |
| **employees** | locations | `GET /v1/employees` |
| **checks** | floor, guests, employees | `GET /v1/checks?status=open\|paid\|voided` · `GET /v1/checks/{check_id}` · `POST /v1/checks` `{ location_id, table_id, server_id, guest_id? }` |
| **orders** | checks, catalog, modifiers, inventory | `POST /v1/checks/{check_id}/items` `{ item_id, quantity?, modifier_ids? }` · `POST /v1/checks/{check_id}/send` |
| **kitchen** | orders | `GET /v1/kds/tickets` · `PATCH /v1/kds/tickets/{ticket_id}` `{ status: queued\|fired\|done }` |

Check JSON includes `items[]` (`sent`, `modifier_ids`, `price` per unit) and `totals` `{ subtotal_cents, discount_cents, tax_cents, due_cents }`.

### Money

| API | depends_on | Operations |
| --- | --- | --- |
| **payments** | checks, taxes, discounts | `POST /v1/payments` `{ check_id, method, amount_cents }` · `GET /v1/payments/{payment_id}` |
| **processor** | payments | `POST /v1/processor/charges` `{ payment_id, payment_method }` · `POST /v1/processor/refunds` `{ charge_id, refund_id? }` |
| **invoices** | payments, checks | `POST /v1/invoices` `{ payment_id }` · `GET /v1/invoices/{invoice_id}` |
| **receipts** | invoices, payments | `GET /v1/receipts/{receipt_id}` · `GET /v1/checks/{check_id}/receipt` |
| **tips** | receipts, payments, processor | `POST /v1/payments/{payment_id}/tip` `{ amount_cents }` |
| **refunds** | payments, processor | `POST /v1/refunds` `{ payment_id, amount_cents? }` · `GET /v1/refunds/{refund_id}` |
| **voids** | refunds, checks | `POST /v1/checks/{check_id}/void` |
| **loyalty** | guests, payments | `GET /v1/loyalty/accounts/{guest_id}` · `POST /v1/loyalty/accounts/{guest_id}/earn` `{ payment_id }` |
| **gift-cards** | payments | `GET /v1/gift-cards/{gift_card_id}` · `POST /v1/gift-cards/{gift_card_id}/redeem` `{ payment_id, amount_cents }` |

### Ops

| API | depends_on | Operations |
| --- | --- | --- |
| **webhooks** | payments, orders, refunds | `GET /v1/webhooks` · `POST /v1/webhooks` `{ url, events[] }` (`payment.captured`, `order.sent`, `refund.accepted`, `check.voided`) |
| **settlements** | payments, processor, tips, refunds | `GET /v1/settlements` · `POST /v1/settlements/{settlement_id}/close` |
| **reports** | settlements, checks, payments | `GET /v1/reports/sales` |

## Notable failure codes

| Code | Status | When |
| --- | --- | --- |
| `item_86` | 409 | Order `itm_86` or any 86’d item |
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

## Repo layout (where to edit)

```
src/server/catalog.ts     25 APIs, dependsOn, operations, failures
src/server/app.ts         Hono routes
src/server/store.ts       Behavior
src/server/seed.ts        Oak Street fixtures
src/server/openapi.ts     /openapi.json
src/lib/burgertown.ts     Browser client used by the restaurant UI
src/components/restaurant.tsx
src/components/api-explorer.tsx   /apis Graph + List
saved/visualization/      Frozen old sandbox; do not import into the app
```

GitHub (private): https://github.com/dlinz7/burgertown

Import for Atlas: `GET /openapi.json` or `GET /v1/meta/apis`. Do not invent extra resources. Compose from the 25 APIs above.
