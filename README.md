# Burgertown

Smash burgers at a walk-up window on Oak Street in Rivertown. Guests order from their phone, pick up at the window, and sit at picnic tables. Townie Rewards is a punch card with redeemable offers.

Thirty-five HTTP APIs sit behind that: floor, menu, fulfillment, kitchen, delivery, rewards, payments, and back-office. Connectivity is in the specs (`depends_on` / OpenAPI `x-depends-on`).

Agent handoff: [`HANDOFF.md`](HANDOFF.md).

The live API graph is at `/apis`. A frozen snapshot of an earlier sandbox is in [`saved/visualization/`](saved/visualization/).

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
| Partner APIs | `/apis` |
| OpenAPI | `/openapi.json` |
| Health | `/health` |
| API index | `/v1/meta/apis` |

In-memory store. `POST /v1/sandbox` with `{ "reset": true }` restores Oak Street. Optional `scope`: `checks`, `delivery`, `rewards`, `inventory`, `settlements`, `all`.

## Guest site

Order pickup, pay by card, earn punches. Sign in as Maya Chen (`maya@example.com`) to redeem gold-path offers at checkout. Staff picnic-table and kitchen screens still exist at `/tables` and `/kitchen` but are not in the guest nav.

## Specs

35 tagged APIs. Import into Atlas from **`GET /openapi.json`** (OpenAPI 3.1) or the `openapi.json` file in this repo. Each operation has request/response schemas, seeded examples, `x-depends-on`, and `x-error-codes`. `503 no_courier_available` is marked `x-retryable`.

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
