export const API_IDS = [
  "locations",
  "floor",
  "menus",
  "catalog",
  "modifiers",
  "taxes",
  "discounts",
  "inventory",
  "guests",
  "employees",
  "checks",
  "orders",
  "kitchen",
  "payments",
  "processor",
  "invoices",
  "receipts",
  "tips",
  "refunds",
  "voids",
  "loyalty",
  "gift-cards",
  "webhooks",
  "settlements",
  "reports",
] as const

export type ApiId = (typeof API_IDS)[number]

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export type Operation = {
  id: string
  method: HttpMethod
  path: string
  summary: string
  description: string
  successStatus: number
  failures: { status: number; code: string; when: string }[]
}

export type ApiDef = {
  id: ApiId
  name: string
  domain: "venue" | "menu" | "service" | "money" | "ops"
  description: string
  dependsOn: ApiId[]
  operations: Operation[]
}

export const API_CATALOG: ApiDef[] = [
  {
    id: "locations",
    name: "Locations",
    domain: "venue",
    description: "Restaurants this merchant operates. Oak Street is the seeded store.",
    dependsOn: [],
    operations: [
      {
        id: "listLocations",
        method: "GET",
        path: "/v1/locations",
        summary: "List locations",
        description: "Returns every restaurant this merchant operates.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getLocation",
        method: "GET",
        path: "/v1/locations/{location_id}",
        summary: "Get a location",
        description: "Fetch one store by id.",
        successStatus: 200,
        failures: [{ status: 404, code: "location_not_found", when: "Unknown location_id" }],
      },
    ],
  },
  {
    id: "floor",
    name: "Floor",
    domain: "venue",
    description: "Tables and sections. A table may point at the current open check.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listTables",
        method: "GET",
        path: "/v1/locations/{location_id}/tables",
        summary: "List tables",
        description: "Floor plan tables for a location.",
        successStatus: 200,
        failures: [{ status: 404, code: "location_not_found", when: "Unknown location_id" }],
      },
      {
        id: "getTable",
        method: "GET",
        path: "/v1/tables/{table_id}",
        summary: "Get a table",
        description: "Includes current check_id when the table is occupied.",
        successStatus: 200,
        failures: [{ status: 404, code: "table_not_found", when: "Unknown table_id" }],
      },
    ],
  },
  {
    id: "menus",
    name: "Menus",
    domain: "menu",
    description: "Published menus for a location, grouped into categories.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listMenus",
        method: "GET",
        path: "/v1/menus",
        summary: "List menus",
        description: "Menus for a location. Pass location_id as a query param.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getMenu",
        method: "GET",
        path: "/v1/menus/{menu_id}",
        summary: "Get a menu with categories",
        description: "Full menu tree used before catalog item hydration.",
        successStatus: 200,
        failures: [{ status: 404, code: "menu_not_found", when: "Unknown menu_id" }],
      },
    ],
  },
  {
    id: "catalog",
    name: "Catalog",
    domain: "menu",
    description: "Sellable items and prices. Orders, checks, and payments read this catalog.",
    dependsOn: ["menus"],
    operations: [
      {
        id: "listItems",
        method: "GET",
        path: "/v1/catalog/items",
        summary: "List catalog items",
        description: "Sellable items including price and tax_ids.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getItem",
        method: "GET",
        path: "/v1/catalog/items/{item_id}",
        summary: "Get a catalog item",
        description: "Single item including price and tax_ids.",
        successStatus: 200,
        failures: [{ status: 404, code: "item_not_found", when: "Unknown item_id" }],
      },
      {
        id: "patchItem",
        method: "PATCH",
        path: "/v1/catalog/items/{item_id}",
        summary: "Update an item",
        description: "Price edits flow into open checks on the next order send.",
        successStatus: 200,
        failures: [{ status: 404, code: "item_not_found", when: "Unknown item_id" }],
      },
    ],
  },
  {
    id: "modifiers",
    name: "Modifiers",
    domain: "menu",
    description: "Add-ons (bacon, extra sauce) referenced by catalog items and order lines.",
    dependsOn: ["catalog"],
    operations: [
      {
        id: "listModifiers",
        method: "GET",
        path: "/v1/catalog/modifiers",
        summary: "List modifiers",
        description: "Modifier groups and options.",
        successStatus: 200,
        failures: [],
      },
    ],
  },
  {
    id: "taxes",
    name: "Taxes",
    domain: "menu",
    description: "Tax rates applied when a check is totaled.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listTaxes",
        method: "GET",
        path: "/v1/taxes",
        summary: "List tax rates",
        description: "Location tax configuration.",
        successStatus: 200,
        failures: [],
      },
    ],
  },
  {
    id: "discounts",
    name: "Discounts",
    domain: "menu",
    description: "Comps and coupons applied to a check before payment.",
    dependsOn: ["catalog"],
    operations: [
      {
        id: "listDiscounts",
        method: "GET",
        path: "/v1/discounts",
        summary: "List discounts",
        description: "Available comps and promo codes.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "applyDiscount",
        method: "POST",
        path: "/v1/checks/{check_id}/discounts",
        summary: "Apply a discount to a check",
        description: "Fails when the check is already paid or the code is invalid.",
        successStatus: 201,
        failures: [
          { status: 404, code: "check_not_found", when: "Unknown check_id" },
          { status: 409, code: "check_not_open", when: "Check is paid or voided" },
        ],
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    domain: "menu",
    description: "86-lists and remaining counts. Ordering an 86'd item fails.",
    dependsOn: ["catalog"],
    operations: [
      {
        id: "listInventory",
        method: "GET",
        path: "/v1/inventory",
        summary: "List inventory",
        description: "Stock levels keyed by item_id.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getInventoryItem",
        method: "GET",
        path: "/v1/inventory/{item_id}",
        summary: "Get stock for an item",
        description: "Includes is_86 when the item is pulled from the menu.",
        successStatus: 200,
        failures: [{ status: 404, code: "item_not_found", when: "Unknown item_id" }],
      },
    ],
  },
  {
    id: "guests",
    name: "Guests",
    domain: "service",
    description: "Diners attached to a table or check. Loyalty looks up from here.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listGuests",
        method: "GET",
        path: "/v1/guests",
        summary: "List guests",
        description: "Guests known to this location.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getGuest",
        method: "GET",
        path: "/v1/guests/{guest_id}",
        summary: "Get a guest",
        description: "Single guest record.",
        successStatus: 200,
        failures: [{ status: 404, code: "guest_not_found", when: "Unknown guest_id" }],
      },
    ],
  },
  {
    id: "employees",
    name: "Employees",
    domain: "service",
    description: "Staff who open checks and clock in. Server_id is required on new checks.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listEmployees",
        method: "GET",
        path: "/v1/employees",
        summary: "List employees",
        description: "Active staff at a location.",
        successStatus: 200,
        failures: [],
      },
    ],
  },
  {
    id: "checks",
    name: "Checks",
    domain: "service",
    description:
      "Open tickets. Pay-at-table fetches the check, then payments/invoices/receipts hang off it.",
    dependsOn: ["floor", "guests", "employees"],
    operations: [
      {
        id: "listChecks",
        method: "GET",
        path: "/v1/checks",
        summary: "List checks",
        description: "Filter with status=open|paid|voided.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getCheck",
        method: "GET",
        path: "/v1/checks/{check_id}",
        summary: "Get a check",
        description:
          "Open ticket with line items, totals, and table assignment.",
        successStatus: 200,
        failures: [{ status: 404, code: "check_not_found", when: "Unknown check_id" }],
      },
      {
        id: "createCheck",
        method: "POST",
        path: "/v1/checks",
        summary: "Open a check",
        description: "Requires location_id, table_id, and server_id.",
        successStatus: 201,
        failures: [
          { status: 404, code: "table_not_found", when: "Unknown table_id" },
          { status: 409, code: "table_occupied", when: "Table already has an open check" },
        ],
      },
    ],
  },
  {
    id: "orders",
    name: "Orders",
    domain: "service",
    description:
      "Line items sent to the kitchen. Menu ordering: add items, then send. Confirm fires kitchen + inventory.",
    dependsOn: ["checks", "catalog", "modifiers", "inventory"],
    operations: [
      {
        id: "addItem",
        method: "POST",
        path: "/v1/checks/{check_id}/items",
        summary: "Add a line item",
        description: "Fails with item_86 when inventory is pulled.",
        successStatus: 201,
        failures: [
          { status: 404, code: "check_not_found", when: "Unknown check_id" },
          { status: 409, code: "item_86", when: "Item is 86'd" },
          { status: 409, code: "check_not_open", when: "Check is paid or voided" },
        ],
      },
      {
        id: "sendOrder",
        method: "POST",
        path: "/v1/checks/{check_id}/send",
        summary: "Send order to kitchen",
        description: "Confirms unsent lines, depletes inventory, opens KDS tickets.",
        successStatus: 200,
        failures: [
          { status: 404, code: "check_not_found", when: "Unknown check_id" },
          { status: 409, code: "nothing_to_send", when: "No unsent items" },
        ],
      },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    domain: "service",
    description: "KDS tickets created when an order is sent.",
    dependsOn: ["orders"],
    operations: [
      {
        id: "listTickets",
        method: "GET",
        path: "/v1/kds/tickets",
        summary: "List kitchen tickets",
        description: "Open and fired tickets.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "completeTicket",
        method: "PATCH",
        path: "/v1/kds/tickets/{ticket_id}",
        summary: "Bump a ticket",
        description: "Mark a ticket fired or done.",
        successStatus: 200,
        failures: [{ status: 404, code: "ticket_not_found", when: "Unknown ticket_id" }],
      },
    ],
  },
  {
    id: "payments",
    name: "Payments",
    domain: "money",
    description:
      "Tender a check. Creates a pending payment; Processor captures it.",
    dependsOn: ["checks", "taxes", "discounts"],
    operations: [
      {
        id: "createPayment",
        method: "POST",
        path: "/v1/payments",
        summary: "Create a payment",
        description: "Body: check_id, method, amount_cents. Status pending until processor capture.",
        successStatus: 201,
        failures: [
          { status: 404, code: "check_not_found", when: "Unknown check_id" },
          { status: 409, code: "check_not_open", when: "Check is not open" },
          { status: 422, code: "amount_mismatch", when: "amount_cents does not match check due" },
        ],
      },
      {
        id: "getPayment",
        method: "GET",
        path: "/v1/payments/{payment_id}",
        summary: "Get a payment",
        description: "Includes processor_charge_id after capture.",
        successStatus: 200,
        failures: [{ status: 404, code: "payment_not_found", when: "Unknown payment_id" }],
      },
    ],
  },
  {
    id: "processor",
    name: "Processor",
    domain: "money",
    description:
      "Card processor charges and refunds. Payments call this after a pending tender is created.",
    dependsOn: ["payments"],
    operations: [
      {
        id: "createCharge",
        method: "POST",
        path: "/v1/processor/charges",
        summary: "Charge a payment method",
        description:
          "Body: payment_id, payment_method. Use pm_ok, pm_decline, or pm_timeout.",
        successStatus: 201,
        failures: [
          { status: 402, code: "card_declined", when: "payment_method is pm_decline" },
          { status: 504, code: "processor_timeout", when: "payment_method is pm_timeout" },
          { status: 404, code: "payment_not_found", when: "Unknown payment_id" },
        ],
      },
      {
        id: "createProcessorRefund",
        method: "POST",
        path: "/v1/processor/refunds",
        summary: "Reverse a charge",
        description: "Refund against a captured charge.",
        successStatus: 201,
        failures: [
          { status: 404, code: "charge_not_found", when: "Unknown charge_id" },
          { status: 409, code: "already_refunded", when: "Charge already reversed" },
        ],
      },
    ],
  },
  {
    id: "invoices",
    name: "Invoices",
    domain: "money",
    description: "Posted onto a check after a payment is captured.",
    dependsOn: ["payments", "checks"],
    operations: [
      {
        id: "createInvoice",
        method: "POST",
        path: "/v1/invoices",
        summary: "Post invoice to POS",
        description: "Attaches a captured payment to the check and marks the check paid.",
        successStatus: 201,
        failures: [
          { status: 404, code: "payment_not_found", when: "Unknown payment_id" },
          { status: 409, code: "payment_not_captured", when: "Processor has not captured yet" },
        ],
      },
      {
        id: "getInvoice",
        method: "GET",
        path: "/v1/invoices/{invoice_id}",
        summary: "Get an invoice",
        description: "Invoice posted back to the POS.",
        successStatus: 200,
        failures: [{ status: 404, code: "invoice_not_found", when: "Unknown invoice_id" }],
      },
    ],
  },
  {
    id: "receipts",
    name: "Receipts",
    domain: "money",
    description: "Itemized receipt shown after invoice. Tip CTA lives here.",
    dependsOn: ["invoices", "payments"],
    operations: [
      {
        id: "getReceipt",
        method: "GET",
        path: "/v1/receipts/{receipt_id}",
        summary: "Get a receipt",
        description: "Itemized totals plus tip_eligible.",
        successStatus: 200,
        failures: [{ status: 404, code: "receipt_not_found", when: "Unknown receipt_id" }],
      },
      {
        id: "getReceiptByCheck",
        method: "GET",
        path: "/v1/checks/{check_id}/receipt",
        summary: "Get receipt for a check",
        description: "Receipt for a check, if one has been posted.",
        successStatus: 200,
        failures: [{ status: 404, code: "receipt_not_found", when: "Check has no receipt yet" }],
      },
    ],
  },
  {
    id: "tips",
    name: "Tips",
    domain: "money",
    description: "Post-receipt tip. Captures an incremental processor charge.",
    dependsOn: ["receipts", "payments", "processor"],
    operations: [
      {
        id: "addTip",
        method: "POST",
        path: "/v1/payments/{payment_id}/tip",
        summary: "Add a tip",
        description: "Body: amount_cents. Updates receipt and settlements.",
        successStatus: 200,
        failures: [
          { status: 404, code: "payment_not_found", when: "Unknown payment_id" },
          { status: 409, code: "tip_already_added", when: "Tip already present" },
          { status: 409, code: "payment_not_captured", when: "Payment not captured" },
        ],
      },
    ],
  },
  {
    id: "refunds",
    name: "Refunds",
    domain: "money",
    description: "Guest refund request. POS accepts, then Processor reverses, then Voids the check.",
    dependsOn: ["payments", "processor"],
    operations: [
      {
        id: "createRefund",
        method: "POST",
        path: "/v1/refunds",
        summary: "Request a refund",
        description: "POS accepts the request. Next step is processor refund, then void.",
        successStatus: 201,
        failures: [
          { status: 404, code: "payment_not_found", when: "Unknown payment_id" },
          { status: 409, code: "not_refundable", when: "Payment is not captured" },
        ],
      },
      {
        id: "getRefund",
        method: "GET",
        path: "/v1/refunds/{refund_id}",
        summary: "Get a refund",
        description: "Includes processor_refund_id after reverse.",
        successStatus: 200,
        failures: [{ status: 404, code: "refund_not_found", when: "Unknown refund_id" }],
      },
    ],
  },
  {
    id: "voids",
    name: "Voids",
    domain: "money",
    description: "Voided check confirmation returned after a completed refund pipeline.",
    dependsOn: ["refunds", "checks"],
    operations: [
      {
        id: "voidCheck",
        method: "POST",
        path: "/v1/checks/{check_id}/void",
        summary: "Void a check",
        description: "Requires an accepted refund that has been processor-reversed.",
        successStatus: 200,
        failures: [
          { status: 404, code: "check_not_found", when: "Unknown check_id" },
          { status: 409, code: "void_not_allowed", when: "No completed refund on this check" },
        ],
      },
    ],
  },
  {
    id: "loyalty",
    name: "Loyalty",
    domain: "money",
    description: "Punch cards and points earned after a captured payment.",
    dependsOn: ["guests", "payments"],
    operations: [
      {
        id: "getLoyalty",
        method: "GET",
        path: "/v1/loyalty/accounts/{guest_id}",
        summary: "Get a loyalty account",
        description: "Balance and punches for a guest.",
        successStatus: 200,
        failures: [{ status: 404, code: "account_not_found", when: "Unknown guest_id" }],
      },
      {
        id: "earnLoyalty",
        method: "POST",
        path: "/v1/loyalty/accounts/{guest_id}/earn",
        summary: "Earn points",
        description: "Called after invoice post. Body: payment_id.",
        successStatus: 200,
        failures: [{ status: 404, code: "account_not_found", when: "Unknown guest_id" }],
      },
    ],
  },
  {
    id: "gift-cards",
    name: "Gift Cards",
    domain: "money",
    description: "Stored value that can tender a check instead of card.",
    dependsOn: ["payments"],
    operations: [
      {
        id: "getGiftCard",
        method: "GET",
        path: "/v1/gift-cards/{gift_card_id}",
        summary: "Get a gift card",
        description: "Seeded gf_25 has $25.00.",
        successStatus: 200,
        failures: [{ status: 404, code: "gift_card_not_found", when: "Unknown gift_card_id" }],
      },
      {
        id: "redeemGiftCard",
        method: "POST",
        path: "/v1/gift-cards/{gift_card_id}/redeem",
        summary: "Redeem a gift card",
        description: "Applies stored value to a pending payment.",
        successStatus: 200,
        failures: [
          { status: 404, code: "gift_card_not_found", when: "Unknown gift_card_id" },
          { status: 409, code: "insufficient_balance", when: "Balance below amount_cents" },
        ],
      },
    ],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    domain: "ops",
    description: "Subscriptions for payment.captured, order.sent, refund.accepted, check.voided.",
    dependsOn: ["payments", "orders", "refunds"],
    operations: [
      {
        id: "listWebhooks",
        method: "GET",
        path: "/v1/webhooks",
        summary: "List webhook endpoints",
        description: "Merchant callback URLs.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "createWebhook",
        method: "POST",
        path: "/v1/webhooks",
        summary: "Register a webhook",
        description: "Body: url, events[]. Fails on invalid URL.",
        successStatus: 201,
        failures: [{ status: 400, code: "invalid_url", when: "url is not http(s)" }],
      },
    ],
  },
  {
    id: "settlements",
    name: "Settlements",
    domain: "ops",
    description: "End-of-day batches of captured payments, tips, and refunds.",
    dependsOn: ["payments", "processor", "tips", "refunds"],
    operations: [
      {
        id: "listSettlements",
        method: "GET",
        path: "/v1/settlements",
        summary: "List settlements",
        description: "Daily batches.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "closeSettlement",
        method: "POST",
        path: "/v1/settlements/{settlement_id}/close",
        summary: "Close a batch",
        description: "Locks the current open batch.",
        successStatus: 200,
        failures: [
          { status: 404, code: "settlement_not_found", when: "Unknown settlement_id" },
          { status: 409, code: "already_closed", when: "Batch already closed" },
        ],
      },
    ],
  },
  {
    id: "reports",
    name: "Reports",
    domain: "ops",
    description: "Sales rollup used by the back office. Breaks if check or payment totals change shape.",
    dependsOn: ["settlements", "checks", "payments"],
    operations: [
      {
        id: "salesReport",
        method: "GET",
        path: "/v1/reports/sales",
        summary: "Sales report",
        description: "Net sales, tips, refunds, check counts.",
        successStatus: 200,
        failures: [],
      },
    ],
  },
]

export const DOMAIN_LABELS: Record<ApiDef["domain"], string> = {
  venue: "Venue",
  menu: "Menu",
  service: "Service",
  money: "Money",
  ops: "Ops",
}

export function getApi(id: ApiId) {
  return API_CATALOG.find((api) => api.id === id)!
}
