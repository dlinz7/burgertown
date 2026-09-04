import { API_CATALOG, type ApiId, type Operation } from "@/server/catalog"

const cents = {
  type: "integer",
  description: "Integer cents. 1100 = $11.00.",
  examples: [1100],
}

const id = (example: string, description?: string) => ({
  type: "string",
  description,
  examples: [example],
})

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` }
}

function listOf(name: string) {
  return {
    type: "object",
    required: ["data"],
    properties: {
      data: { type: "array", items: ref(name) },
    },
  }
}

export const SCHEMAS: Record<string, Record<string, unknown>> = {
  Error: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string", examples: ["amount_mismatch"] },
          message: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
      },
    },
  },
  GeoPoint: {
    type: "object",
    required: ["type", "coordinates"],
    properties: {
      type: { type: "string", const: "Point" },
      coordinates: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: { type: "number" },
        description: "GeoJSON Point. Longitude first, then latitude.",
        examples: [[-122.6201, 45.4284]],
      },
    },
  },
  Totals: {
    type: "object",
    required: [
      "subtotal_cents",
      "discount_cents",
      "reward_discount_cents",
      "delivery_fee_cents",
      "tax_cents",
      "due_cents",
    ],
    properties: {
      subtotal_cents: cents,
      discount_cents: cents,
      reward_discount_cents: cents,
      delivery_fee_cents: {
        ...cents,
        description: "0 for dine-in and pickup. Not taxed.",
      },
      tax_cents: cents,
      due_cents: {
        ...cents,
        description:
          "subtotal − discount − reward_discount + tax + delivery_fee. POST /v1/payments amount_cents must equal this.",
      },
    },
    example: {
      subtotal_cents: 1600,
      discount_cents: 0,
      reward_discount_cents: 0,
      delivery_fee_cents: 0,
      tax_cents: 136,
      due_cents: 1736,
    },
  },
  Location: {
    type: "object",
    properties: {
      id: id("loc_oak"),
      name: { type: "string", examples: ["Burgertown Oak Street"] },
      address: {
        type: "object",
        properties: {
          street: { type: "string" },
          city: { type: "string" },
          region: { type: "string" },
          postal_code: { type: "string" },
        },
      },
      phone: { type: "string" },
      hours: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string" },
          },
        },
      },
      timezone: { type: "string" },
      currency: { type: "string", const: "USD" },
    },
  },
  Table: {
    type: "object",
    properties: {
      id: id("tbl_4"),
      location_id: id("loc_oak"),
      label: { type: "string" },
      seats: { type: "integer" },
      status: { type: "string", enum: ["open", "occupied"] },
      check_id: { type: ["string", "null"], examples: ["chk_ok"] },
    },
  },
  Zone: {
    type: "object",
    properties: {
      id: id("zone_oak_core"),
      location_id: id("loc_oak"),
      name: { type: "string" },
      fee_cents: cents,
      eta_minutes: { type: "integer", examples: [25] },
      requires_proof: { type: "boolean" },
      postal_codes: { type: "array", items: { type: "string" } },
    },
  },
  ZoneCheck: {
    type: "object",
    properties: {
      in_zone: { type: "boolean" },
      zone_id: { type: ["string", "null"], examples: ["zone_oak_core"] },
      fee_cents: { type: ["integer", "null"] },
      eta_minutes: { type: ["integer", "null"] },
    },
  },
  Menu: {
    type: "object",
    properties: {
      id: id("menu_dinner"),
      location_id: id("loc_oak"),
      name: { type: "string" },
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            item_ids: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
  CatalogItem: {
    type: "object",
    properties: {
      id: id("itm_townie"),
      name: { type: "string" },
      description: { type: "string" },
      category_id: { type: "string" },
      price: cents,
      tax_ids: { type: "array", items: { type: "string" } },
      modifier_group_ids: { type: "array", items: { type: "string" } },
      allergen_ids: { type: "array", items: { type: "string" } },
      is_active: { type: "boolean" },
    },
  },
  ModifierOption: {
    type: "object",
    properties: {
      id: id("mod_bacon"),
      name: { type: "string" },
      price_delta_cents: cents,
      max_qty: { type: "integer" },
      default: { type: "boolean" },
      is_86: { type: "boolean" },
      allergen_ids: { type: "array", items: { type: "string" } },
    },
  },
  ModifierGroup: {
    type: "object",
    properties: {
      id: id("modg_add"),
      name: { type: "string" },
      selection_type: { type: "string", enum: ["single", "multi"] },
      required: { type: "boolean" },
      min_select: { type: "integer" },
      max_select: { type: "integer" },
      options: { type: "array", items: ref("ModifierOption") },
      incompatible_with: {
        type: "array",
        items: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
        examples: [[["mod_egg", "mod_impossible"]]],
      },
    },
  },
  Modifier: {
    type: "object",
    properties: {
      id: id("mod_bacon"),
      name: { type: "string" },
      price: cents,
      group_id: { type: "string" },
      group_name: { type: "string" },
    },
  },
  Allergen: {
    type: "object",
    properties: {
      id: id("alg_dairy"),
      name: { type: "string" },
    },
  },
  Tax: {
    type: "object",
    properties: {
      id: id("tax_or"),
      location_id: id("loc_oak"),
      name: { type: "string" },
      rate: { type: "number", examples: [0.085] },
    },
  },
  Discount: {
    type: "object",
    properties: {
      id: id("dsc_local10"),
      name: { type: "string" },
      percent: { type: "number" },
      code: { type: "string", examples: ["LOCAL10"] },
    },
  },
  InventoryRow: {
    type: "object",
    properties: {
      item_id: id("itm_86"),
      on_hand: { type: "integer" },
      is_86: { type: "boolean" },
    },
  },
  Guest: {
    type: "object",
    properties: {
      id: id("gst_maya"),
      name: { type: "string" },
      email: { type: "string", examples: ["maya@example.com"] },
      phone: { type: "string" },
      location_id: id("loc_oak"),
      dietary_profile: {
        type: "object",
        properties: {
          avoid: { type: "array", items: { type: "string" }, examples: [["alg_dairy"]] },
          strict: {
            type: "boolean",
            description: "When true, conflicting items 409 allergen_conflict. Otherwise warnings[].",
          },
        },
      },
    },
  },
  Address: {
    type: "object",
    properties: {
      id: id("addr_maya"),
      guest_id: id("gst_maya"),
      line1: { type: "string" },
      city: { type: "string" },
      region: { type: "string" },
      postal_code: { type: "string" },
      location: ref("GeoPoint"),
    },
  },
  Employee: {
    type: "object",
    properties: {
      id: id("emp_jon"),
      name: { type: "string" },
      role: { type: "string", enum: ["server", "manager"] },
      location_id: id("loc_oak"),
      clocked_in: { type: "boolean" },
    },
  },
  Selection: {
    type: "object",
    required: ["group_id", "option_id"],
    properties: {
      group_id: id("modg_add"),
      option_id: id("mod_bacon"),
      qty: { type: "integer", default: 1 },
      name: { type: "string" },
      price_delta_cents: cents,
    },
  },
  LineItem: {
    type: "object",
    properties: {
      id: { type: "string" },
      item_id: id("itm_townie"),
      name: { type: "string" },
      quantity: { type: "integer" },
      price: cents,
      sent: { type: "boolean" },
      modifier_ids: { type: "array", items: { type: "string" } },
      selections: { type: "array", items: ref("Selection") },
      removed_defaults: { type: "array", items: { type: "string" } },
      notes: { type: "string" },
      warnings: { type: "array", items: { type: "string" } },
    },
  },
  Fulfillment: {
    type: "object",
    properties: {
      id: id("ful_dine_4"),
      location_id: id("loc_oak"),
      type: { type: "string", enum: ["dine_in", "pickup", "delivery"] },
      status: {
        type: "string",
        enum: ["open", "sent", "ready", "closing", "closed", "canceled"],
      },
      table_id: { type: ["string", "null"], examples: ["tbl_4"] },
      guest_id: { type: ["string", "null"] },
      address_id: { type: ["string", "null"] },
      pickup_at: { type: ["string", "null"], format: "date-time" },
      handoff_code: { type: ["string", "null"], examples: ["4412"] },
      check_id: { type: ["string", "null"] },
      delivery_fee_cents: cents,
      created_at: { type: "string", format: "date-time" },
    },
  },
  Check: {
    type: "object",
    properties: {
      id: id("chk_ok"),
      location_id: id("loc_oak"),
      table_id: { type: ["string", "null"] },
      fulfillment_id: id("ful_dine_4"),
      guest_id: { type: ["string", "null"], examples: ["gst_maya"] },
      server_id: id("emp_jon"),
      status: { type: "string", enum: ["open", "paid", "voided"] },
      version: {
        type: "integer",
        description: "Increments on add item, discount, redeem. Optional check_version on payment.",
      },
      items: { type: "array", items: ref("LineItem") },
      discount_ids: { type: "array", items: { type: "string" } },
      reward_discount_cents: cents,
      redemption_id: { type: ["string", "null"] },
      payment_ids: { type: "array", items: { type: "string" } },
      invoice_id: { type: ["string", "null"] },
      receipt_id: { type: ["string", "null"] },
      opened_at: { type: "string", format: "date-time" },
      totals: ref("Totals"),
    },
  },
  KitchenTicket: {
    type: "object",
    properties: {
      id: id("kds_ok"),
      check_id: id("chk_ok"),
      item_ids: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["queued", "fired", "done"] },
    },
  },
  Courier: {
    type: "object",
    properties: {
      id: id("crr_sam"),
      name: { type: "string" },
      location_id: id("loc_oak"),
      status: { type: "string", enum: ["available", "offline", "busy"] },
      vehicle: { type: "string", enum: ["scooter", "bike", "car"] },
      rejects_on_accept: {
        type: "boolean",
        description: "crr_flake is true. Accept then 409 courier_rejected.",
      },
    },
  },
  Quote: {
    type: "object",
    properties: {
      id: id("qte_1"),
      location_id: id("loc_oak"),
      address_id: id("addr_maya"),
      zone_id: id("zone_oak_core"),
      fee_cents: cents,
      eta_minutes: { type: "integer" },
      expires_at: {
        type: "string",
        format: "date-time",
        description: "Five minutes from creation. Expired quote → 410 quote_expired.",
      },
    },
  },
  Delivery: {
    type: "object",
    properties: {
      id: id("dlv_pending"),
      fulfillment_id: id("ful_dlv_1"),
      quote_id: { type: "string" },
      zone_id: id("zone_oak_core"),
      fee_cents: cents,
      status: {
        type: "string",
        enum: [
          "pending",
          "assigned",
          "accepted",
          "picked_up",
          "delivered",
          "failed",
          "canceled",
        ],
      },
      courier_id: { type: ["string", "null"] },
      proof_photo_url: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
      fail_reason: { type: ["string", "null"] },
      courier_tip_cents: cents,
    },
  },
  TrackingPing: {
    type: "object",
    properties: {
      at: { type: "string", format: "date-time" },
      location: ref("GeoPoint"),
    },
  },
  TrackingTrail: {
    type: "object",
    properties: {
      delivery_id: id("dlv_enroute"),
      pings: { type: "array", items: ref("TrackingPing") },
    },
  },
  Payment: {
    type: "object",
    properties: {
      id: id("pay_paid"),
      check_id: id("chk_ok"),
      method: { type: "string", enum: ["card", "gift_card"] },
      amount_cents: cents,
      tip_cents: cents,
      status: { type: "string", enum: ["pending", "captured", "declined", "refunded"] },
      processor_charge_id: { type: ["string", "null"] },
      gift_card_id: { type: ["string", "null"] },
    },
  },
  Charge: {
    type: "object",
    properties: {
      id: id("ch_paid"),
      payment_id: id("pay_paid"),
      amount_cents: cents,
      status: { type: "string", enum: ["succeeded", "declined", "refunded"] },
      payment_method: {
        type: "string",
        enum: ["pm_ok", "pm_decline", "pm_timeout"],
        description: "pm_ok succeeds. pm_decline → 402. pm_timeout → 504.",
      },
    },
  },
  Invoice: {
    type: "object",
    properties: {
      id: id("inv_paid"),
      check_id: { type: "string" },
      payment_id: { type: "string" },
      amount_cents: cents,
      posted_at: { type: "string", format: "date-time" },
    },
  },
  Receipt: {
    type: "object",
    properties: {
      id: { type: "string" },
      check_id: { type: "string" },
      invoice_id: { type: "string" },
      payment_id: { type: "string" },
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "integer" },
            amount_cents: cents,
          },
        },
      },
      subtotal_cents: cents,
      tax_cents: cents,
      discount_cents: cents,
      tip_cents: cents,
      total_cents: cents,
      tip_eligible: { type: "boolean" },
    },
  },
  Refund: {
    type: "object",
    properties: {
      id: { type: "string" },
      payment_id: id("pay_paid"),
      check_id: id("chk_paid"),
      amount_cents: cents,
      status: { type: "string", enum: ["accepted", "reversed", "void_complete"] },
      processor_refund_id: { type: ["string", "null"] },
    },
  },
  ProcessorRefund: {
    type: "object",
    properties: {
      id: { type: "string" },
      charge_id: id("ch_paid"),
      refund_id: { type: "string" },
      amount_cents: cents,
      status: { type: "string", const: "succeeded" },
    },
  },
  VoidConfirmation: {
    type: "object",
    properties: {
      check_id: { type: "string" },
      status: { type: "string", const: "voided" },
      refund_id: { type: "string" },
      confirmation: { type: "string" },
      voided_at: { type: "string", format: "date-time" },
    },
  },
  GiftCard: {
    type: "object",
    properties: {
      id: id("gf_25"),
      balance_cents: cents,
      last4: { type: "string", examples: ["4412"] },
    },
  },
  RewardAccount: {
    type: "object",
    properties: {
      id: id("rwd_maya"),
      guest_id: id("gst_maya"),
      points: { type: "integer", examples: [1240] },
      points_balance: { type: "integer", examples: [1240] },
      punches: { type: "integer" },
      tier: { type: "string", enum: ["bronze", "silver", "gold"] },
      trailing_spend_cents: cents,
      earned: { type: "integer", description: "Present on POST /earn." },
      ledger_id: { type: "string" },
    },
  },
  LedgerEntry: {
    type: "object",
    properties: {
      id: { type: "string" },
      guest_id: id("gst_maya"),
      delta: { type: "integer" },
      reason: { type: "string", enum: ["earn", "redeem", "expire", "refund"] },
      check_id: { type: ["string", "null"] },
      offer_id: { type: ["string", "null"] },
      payment_id: { type: ["string", "null"] },
      balance_after: { type: "integer" },
      created_at: { type: "string", format: "date-time" },
    },
  },
  Offer: {
    type: "object",
    properties: {
      id: id("off_free_fries"),
      name: { type: "string" },
      points_cost: { type: "integer" },
      kind: { type: "string", enum: ["amount_off", "percent_off", "free_item"] },
      amount_cents: cents,
      percent: { type: "number" },
      item_id: { type: ["string", "null"] },
      min_tier: { type: "string", enum: ["bronze", "silver", "gold"] },
      expires_at: { type: ["string", "null"], format: "date-time" },
    },
  },
  Redemption: {
    type: "object",
    properties: {
      id: { type: "string" },
      check_id: id("chk_ok"),
      offer_id: id("off_free_fries"),
      guest_id: id("gst_maya"),
      points_spent: { type: "integer" },
      discount_cents: cents,
      created_at: { type: "string", format: "date-time" },
    },
  },
  Webhook: {
    type: "object",
    properties: {
      id: { type: "string" },
      url: { type: "string" },
      events: { type: "array", items: { type: "string" } },
    },
  },
  Settlement: {
    type: "object",
    properties: {
      id: id("set_today"),
      status: { type: "string", enum: ["open", "closed"] },
      payment_ids: { type: "array", items: { type: "string" } },
      courier_tips_cents: cents,
      opened_at: { type: "string", format: "date-time" },
      closed_at: { type: ["string", "null"], format: "date-time" },
    },
  },
  SalesReport: {
    type: "object",
    properties: {
      location_id: id("loc_oak"),
      checks_paid: { type: "integer" },
      checks_voided: { type: "integer" },
      net_sales_cents: cents,
      tips_cents: cents,
      courier_tips_cents: cents,
      refunds_cents: cents,
      currency: { type: "string", const: "USD" },
      by_fulfillment_type: {
        type: "array",
        description: "Present when group_by=fulfillment_type.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["dine_in", "pickup", "delivery"] },
            checks_paid: { type: "integer" },
            net_sales_cents: cents,
          },
        },
      },
    },
  },
  ApiIndex: {
    type: "object",
    properties: {
      company: { type: "string" },
      count: { type: "integer", examples: [35] },
      apis: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            domain: { type: "string" },
            description: { type: "string" },
            depends_on: { type: "array", items: { type: "string" } },
            operations: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  },
  SandboxReset: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      apis: { type: "integer" },
    },
  },
  LineAndCheck: {
    type: "object",
    properties: {
      line: ref("LineItem"),
      check: ref("Check"),
    },
  },
  SendResult: {
    type: "object",
    properties: {
      check: ref("Check"),
      ticket: ref("KitchenTicket"),
    },
  },
  RedemptionResult: {
    type: "object",
    properties: {
      redemption: ref("Redemption"),
      check: ref("Check"),
    },
  },
  GiftRedeemResult: {
    type: "object",
    properties: {
      gift_card: ref("GiftCard"),
      payment: ref("Payment"),
    },
  },
  TipResult: {
    type: "object",
    properties: {
      payment: ref("Payment"),
      receipt: { oneOf: [ref("Receipt"), { type: "null" }] },
    },
  },
}

type QueryParam = {
  name: string
  description: string
  example?: string
  required?: boolean
  schema?: Record<string, unknown>
}

type OpSpec = {
  query?: QueryParam[]
  body?: { schema: Record<string, unknown>; example?: unknown; required?: boolean }
  success?: { schema: Record<string, unknown>; example?: unknown }
  noBody?: boolean
}

const body = (schema: Record<string, unknown>, example?: unknown): OpSpec["body"] => ({
  schema,
  example,
  required: true,
})

const OP: Record<string, OpSpec> = {
  listLocations: { success: { schema: listOf("Location") } },
  getLocation: { success: { schema: ref("Location") } },
  listTables: { success: { schema: listOf("Table") } },
  getTable: { success: { schema: ref("Table"), example: { id: "tbl_4", check_id: "chk_ok", status: "occupied" } } },
  listZones: { success: { schema: listOf("Zone") } },
  checkZone: {
    body: body(
      {
        type: "object",
        required: ["location_id", "address_id"],
        properties: {
          location_id: id("loc_oak"),
          address_id: id("addr_maya"),
        },
      },
      { location_id: "loc_oak", address_id: "addr_maya" }
    ),
    success: { schema: ref("ZoneCheck") },
  },
  listMenus: {
    query: [{ name: "location_id", description: "Filter by location.", example: "loc_oak" }],
    success: { schema: listOf("Menu") },
  },
  getMenu: { success: { schema: ref("Menu") } },
  listItems: {
    query: [
      {
        name: "exclude_allergens",
        description: "Comma-separated allergen ids to hide. Example: alg_dairy.",
        example: "alg_dairy",
      },
    ],
    success: { schema: listOf("CatalogItem") },
  },
  getItem: { success: { schema: ref("CatalogItem") } },
  patchItem: {
    body: body({
      type: "object",
      properties: {
        price: cents,
        name: { type: "string" },
        is_active: { type: "boolean" },
      },
    }),
    success: { schema: ref("CatalogItem") },
  },
  listModifierGroups: {
    query: [{ name: "item_id", description: "Groups attached to one item.", example: "itm_townie" }],
    success: { schema: listOf("ModifierGroup") },
  },
  getModifierGroup: { success: { schema: ref("ModifierGroup") } },
  listModifiers: { success: { schema: listOf("Modifier") } },
  listAllergens: { success: { schema: listOf("Allergen") } },
  getItemAllergens: {
    success: {
      schema: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          data: { type: "array", items: ref("Allergen") },
        },
      },
    },
  },
  listTaxes: { success: { schema: listOf("Tax") } },
  listDiscounts: { success: { schema: listOf("Discount") } },
  applyDiscount: {
    body: body(
      {
        type: "object",
        required: ["code"],
        properties: { code: { type: "string", examples: ["LOCAL10"] } },
      },
      { code: "LOCAL10" }
    ),
    success: { schema: ref("Check") },
  },
  listInventory: { success: { schema: listOf("InventoryRow") } },
  getInventoryItem: { success: { schema: ref("InventoryRow") } },
  listGuests: {
    query: [{ name: "email", description: "Lookup a punch card.", example: "maya@example.com" }],
    success: { schema: listOf("Guest") },
  },
  getGuest: { success: { schema: ref("Guest") } },
  createGuest: {
    body: body(
      {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          location_id: id("loc_oak"),
        },
      },
      { name: "Maya Chen", email: "maya@example.com", phone: "5035550142", location_id: "loc_oak" }
    ),
    success: { schema: ref("Guest") },
  },
  listGuestAddresses: { success: { schema: listOf("Address") } },
  getAddress: { success: { schema: ref("Address") } },
  createAddress: {
    body: body({
      type: "object",
      required: ["line1", "city", "postal_code"],
      properties: {
        line1: { type: "string" },
        city: { type: "string" },
        postal_code: { type: "string" },
        region: { type: "string" },
      },
    }),
    success: { schema: ref("Address") },
  },
  listEmployees: { success: { schema: listOf("Employee") } },
  createFulfillment: {
    body: body(
      {
        type: "object",
        required: ["location_id", "type"],
        properties: {
          location_id: id("loc_oak"),
          type: { type: "string", enum: ["dine_in", "pickup", "delivery"] },
          table_id: { type: "string", description: "Required for dine_in." },
          guest_id: { type: "string" },
          address_id: { type: "string", description: "Required for delivery. addr_far is out of zone." },
          pickup_at: { type: "string", format: "date-time" },
        },
      },
      { location_id: "loc_oak", type: "pickup", guest_id: "gst_maya" }
    ),
    success: { schema: ref("Fulfillment") },
  },
  listFulfillments: {
    query: [
      { name: "status", description: "open|sent|ready|closing|closed|canceled" },
      { name: "type", description: "dine_in|pickup|delivery" },
    ],
    success: { schema: listOf("Fulfillment") },
  },
  getFulfillment: { success: { schema: ref("Fulfillment") } },
  handoffFulfillment: {
    body: body(
      {
        type: "object",
        required: ["code"],
        properties: { code: { type: "string", examples: ["4412"] } },
      },
      { code: "4412" }
    ),
    success: { schema: ref("Fulfillment") },
  },
  cancelFulfillment: { noBody: true, success: { schema: ref("Fulfillment") } },
  listChecks: {
    query: [{ name: "status", description: "open|paid|voided", example: "open" }],
    success: { schema: listOf("Check") },
  },
  getCheck: { success: { schema: ref("Check") } },
  createCheck: {
    body: body(
      {
        type: "object",
        required: ["server_id"],
        properties: {
          fulfillment_id: {
            type: "string",
            description: "Preferred. Open against an existing fulfillment.",
          },
          location_id: id("loc_oak"),
          table_id: {
            type: "string",
            description: "Compat: auto-creates a dine-in fulfillment.",
            examples: ["tbl_1"],
          },
          server_id: id("emp_jon"),
          guest_id: id("gst_maya"),
        },
      },
      { location_id: "loc_oak", table_id: "tbl_1", server_id: "emp_jon" }
    ),
    success: { schema: ref("Check") },
  },
  addItem: {
    body: body(
      {
        type: "object",
        required: ["item_id"],
        properties: {
          item_id: id("itm_townie"),
          quantity: { type: "integer", default: 1 },
          selections: {
            type: "array",
            items: ref("Selection"),
            description: "When present, required groups must be included. Empty array 422s on burgers.",
          },
          modifier_ids: {
            type: "array",
            items: { type: "string" },
            description: "Legacy. Infers groups and fills required defaults.",
          },
          removed_defaults: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
      },
      {
        item_id: "itm_townie",
        quantity: 1,
        modifier_ids: ["mod_bacon"],
      }
    ),
    success: { schema: ref("LineAndCheck") },
  },
  sendOrder: { noBody: true, success: { schema: ref("SendResult") } },
  listTickets: { success: { schema: listOf("KitchenTicket") } },
  completeTicket: {
    body: body(
      {
        type: "object",
        properties: {
          status: { type: "string", enum: ["queued", "fired", "done"] },
        },
      },
      { status: "done" }
    ),
    success: { schema: ref("KitchenTicket") },
  },
  listCouriers: {
    query: [
      { name: "location_id", example: "loc_oak", description: "Filter by location." },
      { name: "status", example: "available", description: "available|offline|busy" },
    ],
    success: { schema: listOf("Courier") },
  },
  getCourier: { success: { schema: ref("Courier") } },
  quoteDelivery: {
    body: body(
      {
        type: "object",
        required: ["location_id", "address_id"],
        properties: {
          location_id: id("loc_oak"),
          address_id: id("addr_maya"),
        },
      },
      { location_id: "loc_oak", address_id: "addr_maya" }
    ),
    success: { schema: ref("Quote") },
  },
  createDelivery: {
    body: body({
      type: "object",
      required: ["fulfillment_id", "quote_id"],
      properties: {
        fulfillment_id: { type: "string" },
        quote_id: { type: "string" },
      },
    }),
    success: { schema: ref("Delivery") },
  },
  getDelivery: { success: { schema: ref("Delivery") } },
  pickupDelivery: { noBody: true, success: { schema: ref("Delivery") } },
  deliverDelivery: {
    body: body({
      type: "object",
      properties: {
        proof_photo_url: {
          type: "string",
          description: "Required for zone_oak_edge.",
        },
        notes: { type: "string" },
      },
    }),
    success: { schema: ref("Delivery") },
  },
  failDelivery: {
    body: body(
      {
        type: "object",
        properties: { reason: { type: "string" } },
      },
      { reason: "customer_unreachable" }
    ),
    success: { schema: ref("Delivery") },
  },
  cancelDelivery: { noBody: true, success: { schema: ref("Delivery") } },
  dispatchDelivery: {
    body: body(
      {
        type: "object",
        required: ["delivery_id"],
        properties: {
          delivery_id: id("dlv_pending"),
          courier_id: {
            type: "string",
            description: "Optional. crr_sam happy path. crr_dee offline. crr_flake rejects on accept.",
          },
        },
      },
      { delivery_id: "dlv_pending" }
    ),
    success: { schema: ref("Delivery") },
  },
  acceptDispatch: {
    body: body(
      {
        type: "object",
        required: ["courier_id"],
        properties: { courier_id: id("crr_sam") },
      },
      { courier_id: "crr_sam" }
    ),
    success: { schema: ref("Delivery") },
  },
  rejectDispatch: {
    body: body({
      type: "object",
      required: ["courier_id"],
      properties: {
        courier_id: { type: "string" },
        reason: { type: "string" },
      },
    }),
    success: { schema: ref("Delivery") },
  },
  pingTracking: {
    body: body(
      {
        type: "object",
        required: ["lng", "lat"],
        properties: {
          lng: { type: "number", description: "Longitude first." },
          lat: { type: "number" },
        },
      },
      { lng: -122.618, lat: 45.427 }
    ),
    success: { schema: ref("TrackingTrail") },
  },
  getTracking: { success: { schema: ref("TrackingTrail") } },
  createPayment: {
    body: body(
      {
        type: "object",
        required: ["check_id", "amount_cents"],
        properties: {
          check_id: id("chk_ok"),
          method: { type: "string", enum: ["card", "gift_card"], default: "card" },
          amount_cents: {
            ...cents,
            description: "Must equal check.totals.due_cents. Re-fetch after a redemption.",
          },
          check_version: {
            type: "integer",
            description: "Optional. If supplied and stale → 409 check_version_stale.",
          },
          gift_card_id: { type: "string" },
        },
      },
      { check_id: "chk_ok", method: "card", amount_cents: 1736 }
    ),
    success: { schema: ref("Payment") },
  },
  getPayment: { success: { schema: ref("Payment") } },
  createCharge: {
    body: body(
      {
        type: "object",
        required: ["payment_id", "payment_method"],
        properties: {
          payment_id: { type: "string" },
          payment_method: {
            type: "string",
            enum: ["pm_ok", "pm_decline", "pm_timeout"],
          },
        },
      },
      { payment_id: "pay_paid", payment_method: "pm_ok" }
    ),
    success: { schema: ref("Charge") },
  },
  createProcessorRefund: {
    body: body(
      {
        type: "object",
        required: ["charge_id"],
        properties: {
          charge_id: id("ch_paid"),
          refund_id: { type: "string" },
        },
      },
      { charge_id: "ch_paid" }
    ),
    success: { schema: ref("ProcessorRefund") },
  },
  createInvoice: {
    body: body(
      {
        type: "object",
        required: ["payment_id"],
        properties: { payment_id: { type: "string" } },
      },
      { payment_id: "pay_paid" }
    ),
    success: { schema: ref("Invoice") },
  },
  getInvoice: { success: { schema: ref("Invoice") } },
  getReceipt: { success: { schema: ref("Receipt") } },
  getReceiptByCheck: { success: { schema: ref("Receipt") } },
  addTip: {
    body: body({
      type: "object",
      required: ["amount_cents"],
      properties: {
        amount_cents: { ...cents, description: "Tip on subtotal, not due. Once only." },
      },
    }),
    success: { schema: ref("TipResult") },
  },
  addCourierTip: {
    body: body({
      type: "object",
      required: ["delivery_id", "amount_cents"],
      properties: {
        delivery_id: id("dlv_enroute"),
        amount_cents: cents,
      },
    }),
    success: { schema: ref("Delivery") },
  },
  createRefund: {
    body: body(
      {
        type: "object",
        required: ["payment_id"],
        properties: {
          payment_id: id("pay_paid"),
          amount_cents: cents,
        },
      },
      { payment_id: "pay_paid" }
    ),
    success: { schema: ref("Refund") },
  },
  getRefund: { success: { schema: ref("Refund") } },
  voidCheck: { noBody: true, success: { schema: ref("VoidConfirmation") } },
  getGiftCard: { success: { schema: ref("GiftCard") } },
  redeemGiftCard: {
    body: body({
      type: "object",
      required: ["payment_id", "amount_cents"],
      properties: {
        payment_id: { type: "string" },
        amount_cents: cents,
      },
    }),
    success: { schema: ref("GiftRedeemResult") },
  },
  getRewards: { success: { schema: ref("RewardAccount") } },
  getLedger: { success: { schema: listOf("LedgerEntry") } },
  earnRewards: {
    body: body(
      {
        type: "object",
        required: ["payment_id"],
        properties: { payment_id: { type: "string" } },
      },
      { payment_id: "pay_paid" }
    ),
    success: { schema: ref("RewardAccount") },
  },
  listOffers: {
    query: [
      {
        name: "guest_id",
        description: "When set, only currently eligible offers. off_expired is omitted.",
        example: "gst_maya",
      },
    ],
    success: { schema: listOf("Offer") },
  },
  getOffer: { success: { schema: ref("Offer") } },
  createRedemption: {
    body: body(
      {
        type: "object",
        required: ["check_id", "offer_id", "guest_id"],
        properties: {
          check_id: id("chk_ok"),
          offer_id: id("off_free_fries"),
          guest_id: id("gst_maya"),
        },
      },
      { check_id: "chk_ok", offer_id: "off_free_fries", guest_id: "gst_maya" }
    ),
    success: { schema: ref("RedemptionResult") },
  },
  getRedemption: { success: { schema: ref("Redemption") } },
  deleteRedemption: {
    noBody: true,
    success: {
      schema: {
        type: "object",
        properties: { ok: { type: "boolean" }, check: ref("Check") },
      },
    },
  },
  listWebhooks: { success: { schema: listOf("Webhook") } },
  createWebhook: {
    body: body({
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string" },
        events: { type: "array", items: { type: "string" } },
      },
    }),
    success: { schema: ref("Webhook") },
  },
  listSettlements: { success: { schema: listOf("Settlement") } },
  closeSettlement: { noBody: true, success: { schema: ref("Settlement") } },
  salesReport: {
    query: [
      {
        name: "group_by",
        description: "Pass fulfillment_type to split dine-in / pickup / delivery.",
        example: "fulfillment_type",
      },
    ],
    success: { schema: ref("SalesReport") },
  },
}

function jsonContent(schema: Record<string, unknown>, example?: unknown) {
  return {
    "application/json": {
      schema,
      ...(example !== undefined ? { example } : {}),
    },
  }
}

function pathParams(path: string) {
  return [...path.matchAll(/{([^}]+)}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }))
}

function failureResponses(op: Operation) {
  const byStatus = new Map<number, Operation["failures"]>()
  for (const failure of op.failures) {
    const list = byStatus.get(failure.status) ?? []
    list.push(failure)
    byStatus.set(failure.status, list)
  }
  const responses: Record<string, unknown> = {}
  for (const [status, failures] of byStatus) {
    const retryable = failures.some((row) => row.retryable)
    responses[String(status)] = {
      description: failures.map((row) => `${row.code}: ${row.when}`).join(" · "),
      content: jsonContent(ref("Error"), {
        error: {
          code: failures[0].code,
          message: failures[0].when,
          details: failures[0].retryable ? { retryable: true } : {},
        },
      }),
      "x-error-codes": failures.map((row) => ({
        code: row.code,
        when: row.when,
        retryable: Boolean(row.retryable),
      })),
      ...(retryable ? { "x-retryable": true } : {}),
    }
  }
  return responses
}

function buildOperation(api: (typeof API_CATALOG)[number], op: Operation) {
  const extra = OP[op.id] ?? {}
  const query = (extra.query ?? []).map((param) => ({
    name: param.name,
    in: "query",
    required: Boolean(param.required),
    description: param.description,
    schema: param.schema ?? { type: "string" },
    ...(param.example ? { example: param.example } : {}),
  }))
  const successSchema = extra.success?.schema ?? { type: "object", additionalProperties: true }
  const operation: Record<string, unknown> = {
    operationId: op.id,
    tags: [api.name],
    summary: op.summary,
    description: op.description,
    parameters: [...pathParams(op.path), ...query],
    responses: {
      [String(op.successStatus)]: {
        description: "Success",
        content: jsonContent(successSchema, extra.success?.example),
      },
      ...failureResponses(op),
    },
    "x-burgertown-api": api.id,
    "x-depends-on": api.dependsOn,
  }
  const writes = op.method !== "GET" && op.method !== "DELETE"
  if (writes && !extra.noBody) {
    operation.requestBody = {
      required: extra.body?.required !== false,
      content: jsonContent(
        extra.body?.schema ?? { type: "object", additionalProperties: true },
        extra.body?.example
      ),
    }
  }
  return operation
}

export function buildOpenApi(origin = "http://127.0.0.1:43123") {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const api of API_CATALOG) {
    for (const op of api.operations) {
      const path = op.path.replace(/{([^}]+)}/g, "{$1}")
      paths[path] ??= {}
      paths[path][op.method.toLowerCase()] = buildOperation(api, op)
    }
  }

  paths["/v1/meta/apis"] = {
    get: {
      operationId: "listApis",
      tags: ["Meta"],
      summary: `List the ${API_CATALOG.length} Burgertown APIs and which APIs they depend on`,
      description:
        "Atlas import companion. Each API includes depends_on and operations. Prefer /openapi.json for the full contract.",
      responses: {
        "200": { description: "API catalog", content: jsonContent(ref("ApiIndex")) },
      },
    },
  }
  paths["/v1/sandbox"] = {
    post: {
      operationId: "resetSandbox",
      tags: ["Sandbox"],
      summary: "Reset in-memory store to the seeded Oak Street location",
      requestBody: {
        required: true,
        content: jsonContent(
          {
            type: "object",
            properties: {
              reset: { type: "boolean", default: true },
              scope: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["all", "checks", "delivery", "rewards", "inventory", "settlements"],
                },
                description: "Optional. Omit or include all for a full reset.",
              },
            },
          },
          { reset: true }
        ),
      },
      responses: {
        "200": { description: "Reset", content: jsonContent(ref("SandboxReset")) },
      },
    },
  }
  paths["/v1/loyalty/accounts/{guest_id}"] = {
    get: {
      operationId: "getLoyaltyDeprecated",
      tags: ["Rewards"],
      deprecated: true,
      summary: "Redirects to rewards",
      description: "308 to /v1/rewards/accounts/{guest_id}. Kept for one release.",
      parameters: pathParams("/v1/loyalty/accounts/{guest_id}"),
      responses: {
        "308": {
          description: "Permanent redirect to /v1/rewards/accounts/{guest_id}",
          headers: {
            Location: { schema: { type: "string" } },
          },
        },
      },
    },
  }
  paths["/v1/loyalty/accounts/{guest_id}/earn"] = {
    post: {
      operationId: "earnLoyaltyDeprecated",
      tags: ["Rewards"],
      deprecated: true,
      summary: "Redirects to rewards earn",
      description: "308 to /v1/rewards/accounts/{guest_id}/earn.",
      parameters: pathParams("/v1/loyalty/accounts/{guest_id}/earn"),
      responses: {
        "308": {
          description: "Permanent redirect to /v1/rewards/accounts/{guest_id}/earn",
          headers: {
            Location: { schema: { type: "string" } },
          },
        },
      },
    },
  }
  paths["/health"] = {
    get: {
      operationId: "health",
      tags: ["Meta"],
      summary: "Health",
      responses: {
        "200": {
          description: "ok",
          content: jsonContent({
            type: "object",
            properties: {
              ok: { type: "boolean" },
              company: { type: "string" },
              product: { type: "string" },
              apis: { type: "integer" },
            },
          }),
        },
      },
    },
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Burgertown",
      version: "1.1.0",
      description: [
        "HTTP APIs for Burgertown on Oak Street, a fictional smash-burger restaurant.",
        "Import this document into Atlas (or any workflow generator). Burgertown is the dummy merchant; Atlas owns blast radius and workflow generation.",
        "",
        "Money is integer cents. Tax is 8.5% of (subtotal − discount − reward_discount). Delivery fee is not taxed.",
        "POST /v1/payments requires amount_cents equal to check.totals.due_cents. Redeeming an offer changes due — re-fetch the check or you get 422 amount_mismatch.",
        "The only retryable error is 503 no_courier_available (x-retryable on that response).",
        "Processor payment_method: pm_ok | pm_decline (402) | pm_timeout (504).",
        "Reset fixtures with POST /v1/sandbox { \"reset\": true } before scripted flows.",
        "",
        "Seeded happy-path ids: loc_oak, tbl_4 / chk_ok (due 1736), gst_maya (1240 gold), emp_jon, itm_townie, pm_ok, off_free_fries, dlv_pending, crr_sam.",
      ].join("\n"),
      contact: { name: "Burgertown", email: "hello@burgertown.dev" },
    },
    servers: [{ url: origin, description: "Burgertown Oak Street sandbox" }],
    tags: [
      ...API_CATALOG.map((api) => ({
        name: api.name,
        description: api.description,
        "x-api-id": api.id,
        "x-depends-on": api.dependsOn,
        "x-domain": api.domain,
      })),
      { name: "Meta", description: "API index and health" },
      { name: "Sandbox", description: "Reset seeded store data" },
    ],
    "x-burgertown": {
      company: "Burgertown",
      kind: "restaurant",
      api_count: API_CATALOG.length,
      retryable_error_codes: ["no_courier_available"],
      import: "Atlas",
    },
    paths,
    components: {
      schemas: SCHEMAS,
      securitySchemes: {
        SandboxKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Optional. Any string is accepted in this sandbox.",
        },
      },
    },
    security: [{ SandboxKey: [] }],
  }
}

export function isApiId(value: string): value is ApiId {
  return API_CATALOG.some((api) => api.id === value)
}
