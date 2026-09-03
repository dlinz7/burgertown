# Burgertown

Fictional smash-burger restaurant on Oak Street in Rivertown. Guests sit at picnic tables, order off the dinner board, send tickets to the kitchen, and pay by card.

Twenty-five HTTP APIs sit behind that: floor, menu, tickets, kitchen, payments, and back-office. Connectivity is in the specs (`depends_on` / OpenAPI `x-depends-on`).

The live API graph and list live at `/apis`. A frozen snapshot of an earlier sandbox is in [`saved/visualization/`](saved/visualization/).

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
| Tables | `/tables` |
| Kitchen | `/kitchen` |
| APIs | `/apis` |
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
| `tbl_4` / `chk_ok` | Maya Chen’s open ticket |
| `tbl_2` / `chk_12` | Open ticket with bacon |
| `chk_paid` / `pay_paid` / `ch_paid` | Closed check with a captured payment |
| `itm_86` | 86'd malt (ordering it returns 409) |
| `gf_25` | Gift card with $25.00 |

Amounts are integer cents. Processor `payment_method` values: `pm_ok`, `pm_decline`, `pm_timeout`.
