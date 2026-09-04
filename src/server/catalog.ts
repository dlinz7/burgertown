export const API_IDS = [
  "locations",
  "floor",
  "zones",
  "menus",
  "catalog",
  "modifiers",
  "allergens",
  "taxes",
  "discounts",
  "inventory",
  "guests",
  "addresses",
  "employees",
  "fulfillment",
  "checks",
  "orders",
  "kitchen",
  "couriers",
  "delivery",
  "dispatch",
  "tracking",
  "payments",
  "processor",
  "invoices",
  "receipts",
  "tips",
  "refunds",
  "voids",
  "gift-cards",
  "rewards",
  "offers",
  "redemptions",
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
  failures: { status: number; code: string; when: string; retryable?: boolean }[]
}

export type ApiDef = {
  id: ApiId
  name: string
  domain: "venue" | "menu" | "service" | "delivery" | "money" | "ops"
  description: string
  dependsOn: ApiId[]
  operations: Operation[]
}

const fail = (
  status: number,
  code: string,
  when: string,
  retryable?: boolean
) => ({ status, code, when, ...(retryable ? { retryable: true } : {}) })

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
        failures: [fail(404, "location_not_found", "Unknown location_id")],
      },
    ],
  },
  {
    id: "floor",
    name: "Floor",
    domain: "venue",
    description:
      "Picnic tables. A table may point at the current open check. Dine-in fulfillments occupy tables.",
    dependsOn: ["locations", "fulfillment"],
    operations: [
      {
        id: "listTables",
        method: "GET",
        path: "/v1/locations/{location_id}/tables",
        summary: "List tables",
        description: "Floor plan tables for a location.",
        successStatus: 200,
        failures: [fail(404, "location_not_found", "Unknown location_id")],
      },
      {
        id: "getTable",
        method: "GET",
        path: "/v1/tables/{table_id}",
        summary: "Get a table",
        description: "Includes current check_id when the table is occupied.",
        successStatus: 200,
        failures: [fail(404, "table_not_found", "Unknown table_id")],
      },
    ],
  },
  {
    id: "zones",
    name: "Zones",
    domain: "venue",
    description:
      "Delivery catchment around Oak Street. Core is $3.49 / 25m; edge is $5.99 / 45m and needs a photo on drop-off.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listZones",
        method: "GET",
        path: "/v1/locations/{location_id}/zones",
        summary: "List delivery zones",
        description: "Zones with fee_cents and eta_minutes.",
        successStatus: 200,
        failures: [fail(404, "location_not_found", "Unknown location_id")],
      },
      {
        id: "checkZone",
        method: "POST",
        path: "/v1/zones/check",
        summary: "Check an address against zones",
        description: "Body: location_id, address_id. Hillsboro (addr_far) is out of zone.",
        successStatus: 200,
        failures: [fail(404, "address_not_found", "Unknown address_id")],
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
        failures: [fail(404, "menu_not_found", "Unknown menu_id")],
      },
    ],
  },
  {
    id: "catalog",
    name: "Catalog",
    domain: "menu",
    description:
      "Sellable items and prices. Filter with exclude_allergens= to hide tagged items.",
    dependsOn: ["menus"],
    operations: [
      {
        id: "listItems",
        method: "GET",
        path: "/v1/catalog/items",
        summary: "List catalog items",
        description: "Optional exclude_allergens=alg_dairy hides dairy-tagged items.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getItem",
        method: "GET",
        path: "/v1/catalog/items/{item_id}",
        summary: "Get a catalog item",
        description: "Single item including price, tax_ids, and allergen_ids.",
        successStatus: 200,
        failures: [fail(404, "item_not_found", "Unknown item_id")],
      },
      {
        id: "patchItem",
        method: "PATCH",
        path: "/v1/catalog/items/{item_id}",
        summary: "Update an item",
        description: "Price edits flow into open checks on the next order send.",
        successStatus: 200,
        failures: [fail(404, "item_not_found", "Unknown item_id")],
      },
    ],
  },
  {
    id: "modifiers",
    name: "Modifiers",
    domain: "menu",
    description:
      "Groups with required/min/max rules, quantity caps, 86'd options, and incompatibility pairs.",
    dependsOn: ["catalog"],
    operations: [
      {
        id: "listModifierGroups",
        method: "GET",
        path: "/v1/catalog/modifier-groups",
        summary: "List modifier groups",
        description: "Filter with item_id= to get groups attached to one item.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getModifierGroup",
        method: "GET",
        path: "/v1/catalog/modifier-groups/{group_id}",
        summary: "Get a modifier group",
        description: "Rules plus options.",
        successStatus: 200,
        failures: [fail(404, "group_not_found", "Unknown group_id")],
      },
      {
        id: "listModifiers",
        method: "GET",
        path: "/v1/catalog/modifiers",
        summary: "List modifiers (flat)",
        description: "Legacy flat list derived from groups. Prefer modifier-groups.",
        successStatus: 200,
        failures: [],
      },
    ],
  },
  {
    id: "allergens",
    name: "Allergens",
    domain: "menu",
    description:
      "Tags on items and modifiers. Guest dietary profiles warn or block (strict) on add-item.",
    dependsOn: ["catalog", "modifiers"],
    operations: [
      {
        id: "listAllergens",
        method: "GET",
        path: "/v1/allergens",
        summary: "List allergens",
        description: "Merchant allergen dictionary.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getItemAllergens",
        method: "GET",
        path: "/v1/catalog/items/{item_id}/allergens",
        summary: "Allergens on an item",
        description: "Resolved tags for one catalog item.",
        successStatus: 200,
        failures: [fail(404, "item_not_found", "Unknown item_id")],
      },
    ],
  },
  {
    id: "taxes",
    name: "Taxes",
    domain: "menu",
    description: "Tax rates applied when a check is totaled. Delivery fee is not taxed.",
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
    description: "Comps and coupons applied to a check before payment. Stacks with rewards.",
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
        description: "Fails when the check is already paid or the code is invalid. Bumps version.",
        successStatus: 201,
        failures: [
          fail(404, "check_not_found", "Unknown check_id"),
          fail(409, "check_not_open", "Check is paid or voided"),
        ],
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    domain: "menu",
    description: "86-lists for items and modifiers. Ordering an 86'd item or option fails.",
    dependsOn: ["catalog", "modifiers"],
    operations: [
      {
        id: "listInventory",
        method: "GET",
        path: "/v1/inventory",
        summary: "List inventory",
        description: "Stock levels keyed by item_id or modifier id.",
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
        failures: [fail(404, "item_not_found", "Unknown item_id")],
      },
    ],
  },
  {
    id: "guests",
    name: "Guests",
    domain: "service",
    description: "Guests who join Townie Rewards, attach to a check, or save a delivery address.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listGuests",
        method: "GET",
        path: "/v1/guests",
        summary: "List guests",
        description: "Filter with email= to look up a punch card.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getGuest",
        method: "GET",
        path: "/v1/guests/{guest_id}",
        summary: "Get a guest",
        description: "Includes dietary_profile.avoid.",
        successStatus: 200,
        failures: [fail(404, "guest_not_found", "Unknown guest_id")],
      },
      {
        id: "createGuest",
        method: "POST",
        path: "/v1/guests",
        summary: "Join Townie Rewards",
        description: "Body: name, email, phone. Creates a rewards account at 0 points.",
        successStatus: 201,
        failures: [
          fail(409, "guest_exists", "Email already has a punch card"),
          fail(422, "invalid_guest", "Name or email missing"),
        ],
      },
      {
        id: "listGuestAddresses",
        method: "GET",
        path: "/v1/guests/{guest_id}/addresses",
        summary: "List guest addresses",
        description: "Saved drop-off addresses.",
        successStatus: 200,
        failures: [fail(404, "guest_not_found", "Unknown guest_id")],
      },
    ],
  },
  {
    id: "addresses",
    name: "Addresses",
    domain: "service",
    description: "Guest drop-off points used by zones, quotes, and delivery fulfillments.",
    dependsOn: ["guests", "zones"],
    operations: [
      {
        id: "getAddress",
        method: "GET",
        path: "/v1/addresses/{address_id}",
        summary: "Get an address",
        description: "Includes GeoJSON Point coordinates, longitude first.",
        successStatus: 200,
        failures: [fail(404, "address_not_found", "Unknown address_id")],
      },
      {
        id: "createAddress",
        method: "POST",
        path: "/v1/guests/{guest_id}/addresses",
        summary: "Save an address",
        description: "Body: line1, city, postal_code.",
        successStatus: 201,
        failures: [fail(404, "guest_not_found", "Unknown guest_id")],
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
    id: "fulfillment",
    name: "Fulfillment",
    domain: "service",
    description:
      "How an order leaves the kitchen: dine-in, pickup, or delivery. Sits between the floor and the check.",
    dependsOn: ["locations", "guests", "addresses"],
    operations: [
      {
        id: "createFulfillment",
        method: "POST",
        path: "/v1/fulfillments",
        summary: "Create a fulfillment",
        description:
          "Body: location_id, type, table_id? / address_id? / pickup_at?. Type mismatches 409. Out-of-zone delivery 422.",
        successStatus: 201,
        failures: [
          fail(409, "fulfillment_type_mismatch", "table_id on delivery or address_id on dine-in"),
          fail(409, "table_occupied", "Dine-in table already has an open check"),
          fail(422, "address_out_of_zone", "Delivery address is outside every zone"),
        ],
      },
      {
        id: "listFulfillments",
        method: "GET",
        path: "/v1/fulfillments",
        summary: "List fulfillments",
        description: "Filter with status= and type=.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getFulfillment",
        method: "GET",
        path: "/v1/fulfillments/{fulfillment_id}",
        summary: "Get a fulfillment",
        description: "Includes type, status, table_id or address_id, handoff_code for pickup.",
        successStatus: 200,
        failures: [fail(404, "fulfillment_not_found", "Unknown fulfillment_id")],
      },
      {
        id: "handoffFulfillment",
        method: "POST",
        path: "/v1/fulfillments/{fulfillment_id}/handoff",
        summary: "Handoff a pickup",
        description: "Body: code. Seeded ful_pickup_1 uses 4412.",
        successStatus: 200,
        failures: [
          fail(404, "fulfillment_not_found", "Unknown fulfillment_id"),
          fail(409, "handoff_code_invalid", "Wrong pickup code"),
        ],
      },
      {
        id: "cancelFulfillment",
        method: "POST",
        path: "/v1/fulfillments/{fulfillment_id}/cancel",
        summary: "Cancel a fulfillment",
        description: "Does not restock. Food already fired stays fired.",
        successStatus: 200,
        failures: [fail(404, "fulfillment_not_found", "Unknown fulfillment_id")],
      },
    ],
  },
  {
    id: "checks",
    name: "Checks",
    domain: "service",
    description:
      "Open tickets hanging off a fulfillment. Pass table_id to auto-create dine-in, or fulfillment_id directly.",
    dependsOn: ["fulfillment", "guests", "employees"],
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
        description: "Includes items, version, fulfillment_id, and totals (reward + delivery fee).",
        successStatus: 200,
        failures: [fail(404, "check_not_found", "Unknown check_id")],
      },
      {
        id: "createCheck",
        method: "POST",
        path: "/v1/checks",
        summary: "Open a check",
        description:
          "Body: fulfillment_id, server_id, guest_id? — or location_id + table_id for dine-in compat.",
        successStatus: 201,
        failures: [
          fail(404, "table_not_found", "Unknown table_id"),
          fail(409, "table_occupied", "Table already has an open check"),
        ],
      },
    ],
  },
  {
    id: "orders",
    name: "Orders",
    domain: "service",
    description:
      "Line items with selections[]. Legacy modifier_ids still accepted. Send confirms kitchen + inventory.",
    dependsOn: ["checks", "catalog", "modifiers", "inventory", "allergens"],
    operations: [
      {
        id: "addItem",
        method: "POST",
        path: "/v1/checks/{check_id}/items",
        summary: "Add a line item",
        description:
          "Body: item_id, quantity?, selections?, removed_defaults?, notes?. Required groups, qty caps, 86, incompatibilities.",
        successStatus: 201,
        failures: [
          fail(404, "check_not_found", "Unknown check_id"),
          fail(409, "item_86", "Item is 86'd"),
          fail(409, "modifier_86", "Option is 86'd (mod_avocado)"),
          fail(409, "modifier_incompatible", "mod_egg + mod_impossible"),
          fail(409, "allergen_conflict", "Strict guest profile vs item allergens"),
          fail(409, "check_not_open", "Check is paid or voided"),
          fail(422, "modifier_group_required", "Required group omitted"),
          fail(422, "modifier_max_exceeded", "Over max_select"),
          fail(422, "modifier_qty_exceeded", "Over an option's max_qty"),
          fail(422, "not_a_default", "removed_defaults names a non-default"),
        ],
      },
      {
        id: "sendOrder",
        method: "POST",
        path: "/v1/checks/{check_id}/send",
        summary: "Send order to kitchen",
        description: "Confirms unsent lines, depletes inventory, opens KDS tickets, fulfillment → sent.",
        successStatus: 200,
        failures: [
          fail(404, "check_not_found", "Unknown check_id"),
          fail(409, "nothing_to_send", "No unsent items"),
        ],
      },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    domain: "service",
    description:
      "KDS tickets. Last ticket bumped to done marks the fulfillment ready. Three states only.",
    dependsOn: ["orders", "fulfillment"],
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
        description: "Mark a ticket fired or done. Last done → fulfillment ready.",
        successStatus: 200,
        failures: [fail(404, "ticket_not_found", "Unknown ticket_id")],
      },
    ],
  },
  {
    id: "couriers",
    name: "Couriers",
    domain: "delivery",
    description:
      "Riders. crr_sam is the happy path. crr_dee is offline. crr_flake rejects on accept.",
    dependsOn: ["locations"],
    operations: [
      {
        id: "listCouriers",
        method: "GET",
        path: "/v1/couriers",
        summary: "List couriers",
        description: "Filter with location_id= and status=.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getCourier",
        method: "GET",
        path: "/v1/couriers/{courier_id}",
        summary: "Get a courier",
        description: "Availability and vehicle.",
        successStatus: 200,
        failures: [fail(404, "courier_not_found", "Unknown courier_id")],
      },
    ],
  },
  {
    id: "delivery",
    name: "Delivery",
    domain: "delivery",
    description:
      "Quotes, jobs, pickup, drop-off, fail, cancel. Quote is side-effect free and expires in five minutes.",
    dependsOn: ["fulfillment", "zones", "orders"],
    operations: [
      {
        id: "quoteDelivery",
        method: "POST",
        path: "/v1/delivery/quote",
        summary: "Quote a delivery",
        description: "Body: location_id, address_id. Returns fee, eta, zone, expires_at.",
        successStatus: 201,
        failures: [
          fail(404, "address_not_found", "Unknown address_id"),
          fail(422, "address_out_of_zone", "Address outside every zone"),
        ],
      },
      {
        id: "createDelivery",
        method: "POST",
        path: "/v1/delivery",
        summary: "Create a delivery job",
        description: "Body: fulfillment_id, quote_id. Status pending. Expired quote → 410.",
        successStatus: 201,
        failures: [
          fail(404, "fulfillment_not_found", "Unknown fulfillment_id"),
          fail(410, "quote_expired", "Quote older than 5 minutes"),
        ],
      },
      {
        id: "getDelivery",
        method: "GET",
        path: "/v1/delivery/{delivery_id}",
        summary: "Get a delivery",
        description: "Job status, courier, quote snapshot.",
        successStatus: 200,
        failures: [fail(404, "delivery_not_found", "Unknown delivery_id")],
      },
      {
        id: "pickupDelivery",
        method: "POST",
        path: "/v1/delivery/{delivery_id}/pickup",
        summary: "Courier pickup",
        description: "Requires fulfillment ready. Then status picked_up.",
        successStatus: 200,
        failures: [
          fail(404, "delivery_not_found", "Unknown delivery_id"),
          fail(409, "delivery_not_ready", "Fulfillment is not ready"),
        ],
      },
      {
        id: "deliverDelivery",
        method: "POST",
        path: "/v1/delivery/{delivery_id}/deliver",
        summary: "Mark delivered",
        description: "Body: proof_photo_url?, notes?. Edge zone requires a photo.",
        successStatus: 200,
        failures: [
          fail(404, "delivery_not_found", "Unknown delivery_id"),
          fail(422, "proof_required", "zone_oak_edge without proof_photo_url"),
        ],
      },
      {
        id: "failDelivery",
        method: "POST",
        path: "/v1/delivery/{delivery_id}/fail",
        summary: "Fail a delivery",
        description: "Body: reason. Fulfillment stays ready; refund/void is a separate path.",
        successStatus: 200,
        failures: [fail(404, "delivery_not_found", "Unknown delivery_id")],
      },
      {
        id: "cancelDelivery",
        method: "POST",
        path: "/v1/delivery/{delivery_id}/cancel",
        summary: "Cancel a delivery",
        description: "Abandons a pending or assigned job.",
        successStatus: 200,
        failures: [fail(404, "delivery_not_found", "Unknown delivery_id")],
      },
    ],
  },
  {
    id: "dispatch",
    name: "Dispatch",
    domain: "delivery",
    description:
      "Assign a courier. No available rider is the only retryable failure in the catalog (503).",
    dependsOn: ["delivery", "couriers"],
    operations: [
      {
        id: "dispatchDelivery",
        method: "POST",
        path: "/v1/dispatch",
        summary: "Dispatch a courier",
        description:
          "Body: delivery_id, courier_id?. Offline-only roster → 503 no_courier_available (retryable).",
        successStatus: 200,
        failures: [
          fail(404, "delivery_not_found", "Unknown delivery_id"),
          fail(409, "delivery_already_assigned", "Second dispatch"),
          fail(
            503,
            "no_courier_available",
            "No available courier — retryable",
            true
          ),
        ],
      },
      {
        id: "acceptDispatch",
        method: "POST",
        path: "/v1/dispatch/{delivery_id}/accept",
        summary: "Courier accepts",
        description: "crr_flake rejects → 409 courier_rejected; re-dispatch.",
        successStatus: 200,
        failures: [
          fail(404, "delivery_not_found", "Unknown delivery_id"),
          fail(409, "courier_rejected", "crr_flake rejects; re-dispatch"),
        ],
      },
      {
        id: "rejectDispatch",
        method: "POST",
        path: "/v1/dispatch/{delivery_id}/reject",
        summary: "Courier rejects",
        description: "Body: courier_id, reason. Job returns to pending.",
        successStatus: 200,
        failures: [fail(404, "delivery_not_found", "Unknown delivery_id")],
      },
    ],
  },
  {
    id: "tracking",
    name: "Tracking",
    domain: "delivery",
    description: "GeoJSON pings on an in-flight delivery. Longitude first.",
    dependsOn: ["dispatch"],
    operations: [
      {
        id: "pingTracking",
        method: "POST",
        path: "/v1/tracking/{delivery_id}/ping",
        summary: "Ping location",
        description: "Body: lng, lat. Appends to the trail.",
        successStatus: 200,
        failures: [fail(404, "delivery_not_found", "Unknown delivery_id")],
      },
      {
        id: "getTracking",
        method: "GET",
        path: "/v1/tracking/{delivery_id}",
        summary: "Get tracking trail",
        description: "Point trail for a delivery.",
        successStatus: 200,
        failures: [fail(404, "delivery_not_found", "Unknown delivery_id")],
      },
    ],
  },
  {
    id: "payments",
    name: "Payments",
    domain: "money",
    description:
      "Tender a check. amount_cents must equal current due — redeeming an offer first is the stale-due trap.",
    dependsOn: ["checks", "taxes", "discounts", "redemptions"],
    operations: [
      {
        id: "createPayment",
        method: "POST",
        path: "/v1/payments",
        summary: "Create a payment",
        description:
          "Body: check_id, method, amount_cents, check_version?. Stale version → 409. Wrong amount → 422.",
        successStatus: 201,
        failures: [
          fail(404, "check_not_found", "Unknown check_id"),
          fail(409, "check_not_open", "Check is not open"),
          fail(409, "check_version_stale", "check_version supplied and out of date"),
          fail(422, "amount_mismatch", "amount_cents does not match check due"),
        ],
      },
      {
        id: "getPayment",
        method: "GET",
        path: "/v1/payments/{payment_id}",
        summary: "Get a payment",
        description: "Includes processor_charge_id after capture.",
        successStatus: 200,
        failures: [fail(404, "payment_not_found", "Unknown payment_id")],
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
        description: "Body: payment_id, payment_method. Use pm_ok, pm_decline, or pm_timeout.",
        successStatus: 201,
        failures: [
          fail(402, "card_declined", "payment_method is pm_decline"),
          fail(504, "processor_timeout", "payment_method is pm_timeout"),
          fail(404, "payment_not_found", "Unknown payment_id"),
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
          fail(404, "charge_not_found", "Unknown charge_id"),
          fail(409, "already_refunded", "Charge already reversed"),
        ],
      },
    ],
  },
  {
    id: "invoices",
    name: "Invoices",
    domain: "money",
    description:
      "Posted onto a check after capture. Closes the fulfillment. Delivery invoices require status delivered.",
    dependsOn: ["payments", "checks", "fulfillment"],
    operations: [
      {
        id: "createInvoice",
        method: "POST",
        path: "/v1/invoices",
        summary: "Post invoice to the check",
        description:
          "Marks the check paid and the fulfillment closed. Dine-in frees the table.",
        successStatus: 201,
        failures: [
          fail(404, "payment_not_found", "Unknown payment_id"),
          fail(409, "payment_not_captured", "Processor has not captured yet"),
          fail(409, "delivery_not_complete", "Delivery job is not delivered"),
        ],
      },
      {
        id: "getInvoice",
        method: "GET",
        path: "/v1/invoices/{invoice_id}",
        summary: "Get an invoice",
        description: "Invoice posted back onto the check.",
        successStatus: 200,
        failures: [fail(404, "invoice_not_found", "Unknown invoice_id")],
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
        failures: [fail(404, "receipt_not_found", "Unknown receipt_id")],
      },
      {
        id: "getReceiptByCheck",
        method: "GET",
        path: "/v1/checks/{check_id}/receipt",
        summary: "Get receipt for a check",
        description: "Receipt for a check, if one has been posted.",
        successStatus: 200,
        failures: [fail(404, "receipt_not_found", "Check has no receipt yet")],
      },
    ],
  },
  {
    id: "tips",
    name: "Tips",
    domain: "money",
    description:
      "Server tip on a captured payment, or courier tip on a delivery. Each is once-only and settles on a different line.",
    dependsOn: ["receipts", "payments", "processor", "delivery"],
    operations: [
      {
        id: "addTip",
        method: "POST",
        path: "/v1/payments/{payment_id}/tip",
        summary: "Add a server tip",
        description: "Body: amount_cents. Updates receipt and settlements.",
        successStatus: 200,
        failures: [
          fail(404, "payment_not_found", "Unknown payment_id"),
          fail(409, "tip_already_added", "Tip already present"),
          fail(409, "payment_not_captured", "Payment not captured"),
        ],
      },
      {
        id: "addCourierTip",
        method: "POST",
        path: "/v1/tips/courier",
        summary: "Add a courier tip",
        description: "Body: delivery_id, amount_cents. Settles on the courier line, not the server line.",
        successStatus: 200,
        failures: [
          fail(404, "delivery_not_found", "Unknown delivery_id"),
          fail(409, "tip_already_added", "Courier tip already present"),
        ],
      },
    ],
  },
  {
    id: "refunds",
    name: "Refunds",
    domain: "money",
    description: "Guest refund request. Burgertown accepts, then Processor reverses, then Voids the check.",
    dependsOn: ["payments", "processor"],
    operations: [
      {
        id: "createRefund",
        method: "POST",
        path: "/v1/refunds",
        summary: "Request a refund",
        description: "Burgertown accepts the request. Next step is processor refund, then void.",
        successStatus: 201,
        failures: [
          fail(404, "payment_not_found", "Unknown payment_id"),
          fail(409, "not_refundable", "Payment is not captured"),
        ],
      },
      {
        id: "getRefund",
        method: "GET",
        path: "/v1/refunds/{refund_id}",
        summary: "Get a refund",
        description: "Includes processor_refund_id after reverse.",
        successStatus: 200,
        failures: [fail(404, "refund_not_found", "Unknown refund_id")],
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
          fail(404, "check_not_found", "Unknown check_id"),
          fail(409, "void_not_allowed", "No completed refund on this check"),
        ],
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
        failures: [fail(404, "gift_card_not_found", "Unknown gift_card_id")],
      },
      {
        id: "redeemGiftCard",
        method: "POST",
        path: "/v1/gift-cards/{gift_card_id}/redeem",
        summary: "Redeem a gift card",
        description: "Applies stored value to a pending payment. Captures without a charge_id.",
        successStatus: 200,
        failures: [
          fail(404, "gift_card_not_found", "Unknown gift_card_id"),
          fail(409, "insufficient_balance", "Balance below amount_cents"),
        ],
      },
    ],
  },
  {
    id: "rewards",
    name: "Rewards",
    domain: "money",
    description:
      "Townie Rewards ledger and tiers. Earn after payment. Offers spend points and change check due.",
    dependsOn: ["guests", "payments"],
    operations: [
      {
        id: "getRewards",
        method: "GET",
        path: "/v1/rewards/accounts/{guest_id}",
        summary: "Get a rewards account",
        description: "Balance, punches, tier. Maya is gold at 1240 points.",
        successStatus: 200,
        failures: [fail(404, "account_not_found", "Unknown guest_id")],
      },
      {
        id: "getLedger",
        method: "GET",
        path: "/v1/rewards/accounts/{guest_id}/ledger",
        summary: "Get the points ledger",
        description: "Append-only entries. Balance is a rollup of delta.",
        successStatus: 200,
        failures: [fail(404, "account_not_found", "Unknown guest_id")],
      },
      {
        id: "earnRewards",
        method: "POST",
        path: "/v1/rewards/accounts/{guest_id}/earn",
        summary: "Earn points",
        description:
          "Called after invoice post. Body: payment_id. 1 point per $1 of food; gold earns 1.5×.",
        successStatus: 200,
        failures: [fail(404, "account_not_found", "Unknown guest_id")],
      },
    ],
  },
  {
    id: "offers",
    name: "Offers",
    domain: "money",
    description: "Redeemable rewards. Filter with guest_id= to hide ineligible and expired offers.",
    dependsOn: ["rewards", "catalog"],
    operations: [
      {
        id: "listOffers",
        method: "GET",
        path: "/v1/offers",
        summary: "List offers",
        description: "With guest_id, only currently eligible offers. off_expired is omitted.",
        successStatus: 200,
        failures: [],
      },
      {
        id: "getOffer",
        method: "GET",
        path: "/v1/offers/{offer_id}",
        summary: "Get an offer",
        description: "Even expired offers are fetchable by id.",
        successStatus: 200,
        failures: [fail(404, "offer_not_found", "Unknown offer_id")],
      },
    ],
  },
  {
    id: "redemptions",
    name: "Redemptions",
    domain: "money",
    description:
      "Apply an offer to an open check. Changes due_cents and bumps version — re-fetch before paying.",
    dependsOn: ["offers", "checks"],
    operations: [
      {
        id: "createRedemption",
        method: "POST",
        path: "/v1/redemptions",
        summary: "Redeem an offer",
        description:
          "Body: check_id, offer_id, guest_id. One per check. Writes reward_discount_cents.",
        successStatus: 201,
        failures: [
          fail(409, "already_redeemed", "Second offer on one check"),
          fail(409, "insufficient_points", "Guest balance below offer cost"),
          fail(403, "tier_required", "Offer requires a higher tier"),
          fail(410, "offer_expired", "off_expired or past expires_at"),
        ],
      },
      {
        id: "getRedemption",
        method: "GET",
        path: "/v1/redemptions/{redemption_id}",
        summary: "Get a redemption",
        description: "Applied offer on a check.",
        successStatus: 200,
        failures: [fail(404, "redemption_not_found", "Unknown redemption_id")],
      },
      {
        id: "deleteRedemption",
        method: "DELETE",
        path: "/v1/redemptions/{redemption_id}",
        summary: "Un-apply a redemption",
        description: "Refunds points on the ledger and restores due.",
        successStatus: 200,
        failures: [fail(404, "redemption_not_found", "Unknown redemption_id")],
      },
    ],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    domain: "ops",
    description:
      "Subscriptions for payment, order, refund, delivery, reward, and fulfillment events.",
    dependsOn: ["payments", "orders", "refunds", "delivery", "redemptions"],
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
        failures: [fail(400, "invalid_url", "url is not http(s)")],
      },
    ],
  },
  {
    id: "settlements",
    name: "Settlements",
    domain: "ops",
    description: "End-of-day batches. Server tips and courier tips are separate lines.",
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
          fail(404, "settlement_not_found", "Unknown settlement_id"),
          fail(409, "already_closed", "Batch already closed"),
        ],
      },
    ],
  },
  {
    id: "reports",
    name: "Reports",
    domain: "ops",
    description: "Sales rollup. group_by=fulfillment_type splits dine-in / pickup / delivery.",
    dependsOn: ["settlements", "checks", "payments", "delivery"],
    operations: [
      {
        id: "salesReport",
        method: "GET",
        path: "/v1/reports/sales",
        summary: "Sales report",
        description: "Net sales, tips, refunds, check counts. Optional group_by=fulfillment_type.",
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
  delivery: "Delivery",
  money: "Money",
  ops: "Ops",
}

export function getApi(id: ApiId) {
  return API_CATALOG.find((api) => api.id === id)!
}

export function dependentsOf(id: ApiId): ApiId[] {
  const found = new Set<ApiId>()
  const walk = (current: ApiId) => {
    for (const api of API_CATALOG) {
      if (api.dependsOn.includes(current) && !found.has(api.id)) {
        found.add(api.id)
        walk(api.id)
      }
    }
  }
  walk(id)
  return [...found]
}

export function apiLinks(id: ApiId) {
  return {
    api: id,
    dependsOn: getApi(id).dependsOn,
    dependents: dependentsOf(id),
  }
}

export type GraphNode = {
  id: ApiId
  name: string
  domain: ApiDef["domain"]
  layer: number
  column: number
  dependsOn: ApiId[]
  dependents: ApiId[]
}

export function apiGraph() {
  const layers: ApiId[][] = []
  const remaining = new Set(API_IDS)
  const placed = new Set<ApiId>()

  while (remaining.size > 0) {
    const layer = [...remaining].filter((id) =>
      getApi(id).dependsOn.every((dep) => placed.has(dep))
    )
    const next = layer.length > 0 ? layer : [[...remaining][0]]
    layers.push(next)
    for (const id of next) {
      remaining.delete(id)
      placed.add(id)
    }
  }

  const nodes: GraphNode[] = layers.flatMap((layer, layerIndex) =>
    layer.map((id, column) => {
      const api = getApi(id)
      return {
        id,
        name: api.name,
        domain: api.domain,
        layer: layerIndex,
        column,
        dependsOn: api.dependsOn,
        dependents: dependentsOf(id),
      }
    })
  )

  const edges = API_CATALOG.flatMap((api) =>
    api.dependsOn.map((from) => ({ from, to: api.id }))
  )

  return { nodes, edges, layers: layers.length }
}
