# Burgertown

Smash burgers at a walk-up window on Oak Street in Rivertown. Guests order from their phone, pick up at the window, and sit at picnic tables. Townie Rewards is a punch card with redeemable offers.

Thirty-five HTTP APIs sit behind that: floor, menu, fulfillment, kitchen, delivery, rewards, payments, and back-office. Connectivity is in the specs (`depends_on` / OpenAPI `x-depends-on`).

Agent handoff: [`HANDOFF.md`](HANDOFF.md).

The live API graph is at `/apis`. How the operations connect is published as Arazzo 1.0.1 in [`arazzo.yaml`](arazzo.yaml). A frozen snapshot of an earlier sandbox is in [`saved/visualization/`](saved/visualization/).

## Run

```bash
npm install
npm run dev
```

[http://127.0.0.1:43123](http://127.0.0.1:43123)

| Resource | URL |
| --- | --- |
| Restaurant | `/` |
| Menu | `/menu` |
| Order / bag | `/order` |
| Townie Rewards | `/rewards` |
| APIs (graph + list) | `/apis` |
| OpenAPI | `/openapi.json` |
| Arazzo 1.0.1 | `/arazzo.yaml` |
| Health | `/health` |
| API index | `/v1/meta/apis` |

In-memory store. `POST /v1/sandbox` with `{ "reset": true }` restores Oak Street. Optional `scope`: `checks`, `delivery`, `rewards`, `inventory`, `settlements`, `all`.

## Guest site

Preview the checkout check display at `/order/preview` using sample data without
placing an order. Successful Atlas responses show the same display with the
returned check, itemized totals, payment status, and kitchen ticket when present.

Both **Pay with card** buttons (`/order` and `/tables/[tableId]`) submit the Atlas
`demo` workflow through `POST /api/atlas/ingest`. The server calls
`http://localhost:4300/ingest` with the local caller token and this payload
(example for fries):

```json
{"workflowName":"demo","payload":{"item_id":"itm_fries","server_id":"emp_jon","location_id":"loc_oak"}}
```

Atlas must be running with the `demo` workflow ready for API intake. Override
`ATLAS_INGEST_URL` and `ATLAS_INGEST_TOKEN` in `.env.local` if needed; these are
server-only variables. The defaults match the local demo configuration.

The buttons hand off to Atlas instead of running the previous browser checkout
sequence. Each request waits for the workflow and returns the final capability's
JSON response. The UI reports workflow completion; payment, receipts, and rewards
are handled by whichever capabilities the Atlas workflow actually invokes.
`item_id` comes from each bag or table-check item. Each unit gets one workflow
request, so two burgers and fries submit three requests. Workflow name, server,
and location stay fixed. The existing Atlas payload supports only one item ID;
modifiers are not sent, and these are separate workflow runs rather than one
combined order. Submission stops on the first failure and reports any earlier
completed requests; check Atlas before retrying a partially submitted order.
The server waits up to 90 seconds per request, allowing for Atlas's default
60-second response deadline. A timeout does not cancel a running workflow.
Run `npm run test:atlas` (Node 24+) for integration contract tests.

Browse the pickup menu and manage a bag. Townie Rewards is available at `/rewards`;
the seeded Maya Chen account uses `maya@example.com`. Staff picnic-table and kitchen
screens still exist at `/tables` and `/kitchen` but are not in the guest nav.

## Specs

35 tagged APIs. Import into Atlas from **`GET /openapi.json`** (OpenAPI 3.1) or the `openapi.json` file in this repo. Each operation has request/response schemas, seeded examples, named ID schemas (`CheckId`, …), OpenAPI links, `x-depends-on`, and `x-error-codes`. `503 no_courier_available` is marked `x-retryable`.

Workflows A–I are in **`GET /arazzo.yaml`** (Arazzo 1.0.1). Validate with `npm run validate:arazzo`.

`GET /v1/loyalty/...` 308s to `/v1/rewards/...`.

- **Fulfillment** sits between the floor and the check (dine-in, pickup, delivery)
- **Payments** depends on Checks, Taxes, Discounts, Redemptions
- **Redemptions** change `due_cents` — re-fetch before paying or you get `422 amount_mismatch`
- **Dispatch** `503 no_courier_available` is the only retryable failure

## Seeded IDs

| Id | Role |
| --- | --- |
| `loc_oak` | Oak Street store |
| `tbl_4` / `chk_ok` / `ful_dine_4` | Maya Chen’s open ticket. Due 1736 |
| `tbl_2` / `chk_12` | Open ticket with bacon |
| `chk_paid` / `pay_paid` / `ch_paid` | Closed check for refunds |
| `gst_maya` | Gold townie, 1240 points |
| `gst_theo` | Bronze, 40 points |
| `itm_86` | 86'd malt |
| `mod_avocado` | 86'd add-on |
| `gf_25` | Gift card with $25.00 |
| `off_free_fries` / `off_5off` / `off_gold_shake` | Redeemable offers |
| `dlv_pending` / `dlv_enroute` | Delivery fixtures |
| `crr_sam` / `crr_dee` / `crr_flake` | Couriers (available / offline / rejects) |

Amounts are integer cents. Processor `payment_method` values: `pm_ok`, `pm_decline`, `pm_timeout`.
