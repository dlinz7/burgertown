# Burgertown POS

Dummy restaurant POS company. Burgertown is a fictional client: twenty-five HTTP APIs covering the floor, menu, service, money movement, and back-office.

This repo is **not** an Atlas product. It is the business Atlas would import. Connectivity is in the specs (`depends_on` / OpenAPI `x-depends-on`). Workflow generation, blast radius, and error classification stay in Atlas.

A frozen copy of an earlier graph UI is in [`saved/visualization/`](saved/visualization/). The live site does not use it.

## Run

```bash
npm install
npm run dev
```

[http://127.0.0.1:43123](http://127.0.0.1:43123)

| Resource | URL |
| --- | --- |
| Company | `/` |
| API list | `/apis` |
| OpenAPI | `/openapi.json` |
| Health | `/health` |
| API index | `/v1/meta/apis` |

In-memory store. `POST /v1/sandbox` with `{ "reset": true }` restores Oak Street.

## Specs

25 tagged APIs. Each operation carries `x-depends-on` — which other Burgertown APIs that resource needs. Examples:

- **Orders** depends on Checks, Catalog, Modifiers, Inventory
- **Payments** depends on Checks, Taxes, Discounts
- **Processor** depends on Payments
- **Invoices** depend on Payments and Checks
- **Reports** depend on Settlements, Checks, Payments

## Seeded IDs

| Id | Role |
| --- | --- |
| `loc_oak` | Oak Street store |
| `tbl_4` / `chk_ok` | Open check |
| `chk_paid` / `pay_paid` / `ch_paid` | Closed check with a captured payment |
| `itm_86` | 86'd menu item (ordering it returns 409) |
| `gf_25` | Gift card with $25.00 |

Amounts are integer cents. Processor `payment_method` values: `pm_ok`, `pm_decline`, `pm_timeout`.
