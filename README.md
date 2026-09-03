# Burgertown POS sandbox

Fake POS company for **Atlas**. Burgertown exposes **25 interconnected APIs** so a workflow graph looks like a real restaurant business, with success and failure fixtures, and a blast radius when a contract changes.

This is not a diner website. It is the POS vendor a pay-at-table product (Mr. Yum-style) would integrate with.

## Run

```bash
npm install
npm run dev
```

App: [http://127.0.0.1:43123](http://127.0.0.1:43123)

| Resource | URL |
| --- | --- |
| Visualization | `/` |
| OpenAPI contract (Atlas import) | `/openapi.json` |
| Health | `/health` |
| API catalog | `/v1/meta/apis` |
| Dependency graph | `/v1/meta/graph` |
| Demo flows | `/v1/meta/flows` |

No real Stripe, POS, or auth. Optional header `X-API-Key` is accepted and ignored.

## Saved visualization

A frozen copy of the graph UI lives in [`saved/visualization/`](saved/visualization/). The live app still uses `src/`. That folder is a snapshot so a website rewrite does not lose the blast-radius graph.

## What Atlas should import

Point the marketplace / contract import at `/openapi.json`. Tags are the 25 APIs. Each tag includes:

- `x-api-id`
- `x-depends-on`
- `x-blast-radius` (downstream APIs)

`info.x-burgertown.graph` is the full node/edge map.

## The 25 APIs

Venue: **Locations**, **Floor**  
Menu: **Menus**, **Catalog**, **Modifiers**, **Taxes**, **Discounts**, **Inventory**  
Service: **Guests**, **Employees**, **Checks**, **Orders**, **Kitchen**  
Money: **Payments**, **Processor** (Stripe-shaped), **Invoices**, **Receipts**, **Tips**, **Refunds**, **Voids**, **Loyalty**, **Gift Cards**  
Ops: **Webhooks**, **Settlements**, **Reports**

Processor is the external contract the POS does not own. That is the marketplace stand-in for Stripe.

## Demo flows

### Pay at table

`tbl_4` → `chk_ok` → payment → processor charge → invoice back to POS → receipt → tip.

Failure fixtures:

- `chk_declined` / `tbl_2` → processor `402 card_declined`
- `chk_timeout` / `tbl_7` → processor `504 processor_timeout`

### Refund pipeline

`chk_paid` → refund accepted → processor reverse (`ch_paid`) → void confirmation.

Failure: `POST /v1/checks/chk_ok/void` → `409 void_not_allowed` (no reversed refund).

### Menu ordering

`GET /v1/menus/menu_dinner` → catalog hydrate → `POST /v1/checks/chk_ok/items` → send (inventory + KDS).

Failure: add `itm_86` → `409 item_86`.

## Blast radius

`POST /v1/sandbox` with `{ "contract_drift": true }` changes Catalog from `name` / `price` to `display_name` / `unit_amount`. Downstream APIs that consume Catalog (orders, checks, payments, invoices, receipts, reports, …) are the blast radius.

```bash
curl -X POST http://127.0.0.1:43123/v1/sandbox \
  -H 'content-type: application/json' \
  -d '{"contract_drift":true}'

curl http://127.0.0.1:43123/v1/catalog/items
curl http://127.0.0.1:43123/v1/meta/blast-radius/catalog
```

Reset fixtures (in-memory):

```bash
curl -X POST http://127.0.0.1:43123/v1/sandbox \
  -H 'content-type: application/json' \
  -d '{"reset":true,"contract_drift":false}'
```

## Seeded ids

| Id | Role |
| --- | --- |
| `loc_oak` | Oak Street store |
| `tbl_4` / `chk_ok` | Happy-path open check |
| `tbl_2` / `chk_declined` | Card declined |
| `tbl_7` / `chk_timeout` | Processor timeout |
| `chk_paid` / `pay_paid` / `ch_paid` | Already-paid check for refunds |
| `itm_86` | 86'd menu item |
| `gf_25` | $25 gift card |
| `gst_maya` | Loyalty guest |

Amounts are integer cents.
