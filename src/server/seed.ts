export type Money = number

export type Location = {
  id: string
  name: string
  address: { street: string; city: string; region: string; postal_code: string }
  timezone: string
  currency: "USD"
}

export type Table = {
  id: string
  location_id: string
  label: string
  seats: number
  status: "open" | "occupied"
  check_id: string | null
}

export type Menu = {
  id: string
  location_id: string
  name: string
  categories: { id: string; name: string; item_ids: string[] }[]
}

export type CatalogItem = {
  id: string
  name: string
  description: string
  category_id: string
  price: Money
  tax_ids: string[]
  modifier_group_ids: string[]
  is_active: boolean
}

export type Modifier = {
  id: string
  name: string
  price: Money
  group_id: string
  group_name: string
}

export type Tax = {
  id: string
  location_id: string
  name: string
  rate: number
}

export type Discount = {
  id: string
  name: string
  percent: number
  code: string
}

export type InventoryRow = {
  item_id: string
  on_hand: number
  is_86: boolean
}

export type Guest = {
  id: string
  name: string
  email: string
  phone: string
  location_id: string
}

export type Employee = {
  id: string
  name: string
  role: "server" | "manager"
  location_id: string
  clocked_in: boolean
}

export type LineItem = {
  id: string
  item_id: string
  name: string
  quantity: number
  price: Money
  sent: boolean
  modifier_ids: string[]
}

export type Check = {
  id: string
  location_id: string
  table_id: string
  guest_id: string | null
  server_id: string
  status: "open" | "paid" | "voided"
  items: LineItem[]
  discount_ids: string[]
  payment_ids: string[]
  invoice_id: string | null
  receipt_id: string | null
  opened_at: string
}

export type KitchenTicket = {
  id: string
  check_id: string
  item_ids: string[]
  status: "queued" | "fired" | "done"
}

export type Payment = {
  id: string
  check_id: string
  method: "card" | "gift_card"
  amount_cents: Money
  tip_cents: Money
  status: "pending" | "captured" | "declined" | "refunded"
  processor_charge_id: string | null
  gift_card_id: string | null
}

export type Charge = {
  id: string
  payment_id: string
  amount_cents: Money
  status: "succeeded" | "declined" | "refunded"
  payment_method: string
}

export type Invoice = {
  id: string
  check_id: string
  payment_id: string
  amount_cents: Money
  posted_at: string
}

export type Receipt = {
  id: string
  check_id: string
  invoice_id: string
  payment_id: string
  lines: { name: string; quantity: number; amount_cents: Money }[]
  subtotal_cents: Money
  tax_cents: Money
  discount_cents: Money
  tip_cents: Money
  total_cents: Money
  tip_eligible: boolean
}

export type Refund = {
  id: string
  payment_id: string
  check_id: string
  amount_cents: Money
  status: "accepted" | "reversed" | "void_complete"
  processor_refund_id: string | null
}

export type ProcessorRefund = {
  id: string
  charge_id: string
  refund_id: string
  amount_cents: Money
  status: "succeeded"
}

export type LoyaltyAccount = {
  guest_id: string
  points: number
  punches: number
}

export type GiftCard = {
  id: string
  balance_cents: Money
  last4: string
}

export type Webhook = {
  id: string
  url: string
  events: string[]
}

export type Settlement = {
  id: string
  status: "open" | "closed"
  payment_ids: string[]
  opened_at: string
  closed_at: string | null
}

export type Store = {
  locations: Location[]
  tables: Table[]
  menus: Menu[]
  items: CatalogItem[]
  modifiers: Modifier[]
  taxes: Tax[]
  discounts: Discount[]
  inventory: InventoryRow[]
  guests: Guest[]
  employees: Employee[]
  checks: Check[]
  tickets: KitchenTicket[]
  payments: Payment[]
  charges: Charge[]
  invoices: Invoice[]
  receipts: Receipt[]
  refunds: Refund[]
  processorRefunds: ProcessorRefund[]
  loyalty: LoyaltyAccount[]
  giftCards: GiftCard[]
  webhooks: Webhook[]
  settlements: Settlement[]
}

const now = "2026-09-03T18:00:00.000Z"

export function createSeed(): Store {
  const items: CatalogItem[] = [
    {
      id: "itm_townie",
      name: "The Townie",
      description: "Smash patty, American, pickles, onion, Town Sauce.",
      category_id: "cat_burgers",
      price: 1100,
      tax_ids: ["tax_or"],
      modifier_group_ids: ["modg_add"],
      is_active: true,
    },
    {
      id: "itm_double",
      name: "Double Townie",
      description: "Two smash patties, extra Town Sauce.",
      category_id: "cat_burgers",
      price: 1500,
      tax_ids: ["tax_or"],
      modifier_group_ids: ["modg_add"],
      is_active: true,
    },
    {
      id: "itm_jalapeno",
      name: "Jalapeño Smash",
      description: "Pepper jack, pickled jalapeños, chipotle mayo.",
      category_id: "cat_burgers",
      price: 1300,
      tax_ids: ["tax_or"],
      modifier_group_ids: ["modg_add"],
      is_active: true,
    },
    {
      id: "itm_fries",
      name: "Shoestring fries",
      description: "Salted, hot.",
      category_id: "cat_sides",
      price: 500,
      tax_ids: ["tax_or"],
      modifier_group_ids: [],
      is_active: true,
    },
    {
      id: "itm_shake",
      name: "Vanilla shake",
      description: "Hand-spun.",
      category_id: "cat_shakes",
      price: 600,
      tax_ids: ["tax_or"],
      modifier_group_ids: [],
      is_active: true,
    },
    {
      id: "itm_86",
      name: "Malt of the week",
      description: "86'd — salted caramel sold out.",
      category_id: "cat_shakes",
      price: 700,
      tax_ids: ["tax_or"],
      modifier_group_ids: [],
      is_active: true,
    },
  ]

  const tables: Table[] = Array.from({ length: 8 }, (_, index) => ({
    id: `tbl_${index + 1}`,
    location_id: "loc_oak",
    label: `Table ${index + 1}`,
    seats: index === 6 ? 6 : 4,
    status: index + 1 === 4 || index + 1 === 2 ? "occupied" : "open",
    check_id: index + 1 === 4 ? "chk_ok" : index + 1 === 2 ? "chk_12" : null,
  }))

  return {
    locations: [
      {
        id: "loc_oak",
        name: "Burgertown Oak Street",
        address: {
          street: "412 Oak Street",
          city: "Rivertown",
          region: "OR",
          postal_code: "97035",
        },
        timezone: "America/Los_Angeles",
        currency: "USD",
      },
    ],
    tables,
    menus: [
      {
        id: "menu_dinner",
        location_id: "loc_oak",
        name: "Dinner",
        categories: [
          {
            id: "cat_burgers",
            name: "Smash burgers",
            item_ids: ["itm_townie", "itm_double", "itm_jalapeno"],
          },
          { id: "cat_sides", name: "Sides", item_ids: ["itm_fries"] },
          { id: "cat_shakes", name: "Shakes", item_ids: ["itm_shake", "itm_86"] },
        ],
      },
    ],
    items,
    modifiers: [
      { id: "mod_bacon", name: "Bacon", price: 200, group_id: "modg_add", group_name: "Add-ons" },
      { id: "mod_egg", name: "Fried egg", price: 150, group_id: "modg_add", group_name: "Add-ons" },
    ],
    taxes: [{ id: "tax_or", location_id: "loc_oak", name: "OR sales tax", rate: 0.085 }],
    discounts: [{ id: "dsc_local10", name: "Local 10%", percent: 10, code: "LOCAL10" }],
    inventory: items.map((item) => ({
      item_id: item.id,
      on_hand: item.id === "itm_86" ? 0 : 40,
      is_86: item.id === "itm_86",
    })),
    guests: [
      {
        id: "gst_maya",
        name: "Maya Chen",
        email: "maya@example.com",
        phone: "5035550142",
        location_id: "loc_oak",
      },
    ],
    employees: [
      {
        id: "emp_jon",
        name: "Jon Alvarez",
        role: "server",
        location_id: "loc_oak",
        clocked_in: true,
      },
      {
        id: "emp_renee",
        name: "Renee Park",
        role: "manager",
        location_id: "loc_oak",
        clocked_in: true,
      },
    ],
    checks: [
      {
        id: "chk_ok",
        location_id: "loc_oak",
        table_id: "tbl_4",
        guest_id: "gst_maya",
        server_id: "emp_jon",
        status: "open",
        items: [
          {
            id: "li_1",
            item_id: "itm_townie",
            name: "The Townie",
            quantity: 1,
            price: 1100,
            sent: true,
            modifier_ids: [],
          },
          {
            id: "li_2",
            item_id: "itm_fries",
            name: "Shoestring fries",
            quantity: 1,
            price: 500,
            sent: true,
            modifier_ids: [],
          },
        ],
        discount_ids: [],
        payment_ids: [],
        invoice_id: null,
        receipt_id: null,
        opened_at: now,
      },
      {
        id: "chk_12",
        location_id: "loc_oak",
        table_id: "tbl_2",
        guest_id: null,
        server_id: "emp_jon",
        status: "open",
        items: [
          {
            id: "li_d1",
            item_id: "itm_double",
            name: "Double Townie",
            quantity: 1,
            price: 1500,
            sent: true,
            modifier_ids: ["mod_bacon"],
          },
        ],
        discount_ids: [],
        payment_ids: [],
        invoice_id: null,
        receipt_id: null,
        opened_at: now,
      },
      {
        id: "chk_paid",
        location_id: "loc_oak",
        table_id: "tbl_1",
        guest_id: "gst_maya",
        server_id: "emp_jon",
        status: "paid",
        items: [
          {
            id: "li_p1",
            item_id: "itm_shake",
            name: "Vanilla shake",
            quantity: 1,
            price: 600,
            sent: true,
            modifier_ids: [],
          },
        ],
        discount_ids: [],
        payment_ids: ["pay_paid"],
        invoice_id: "inv_paid",
        receipt_id: "rcp_paid",
        opened_at: now,
      },
    ],
    tickets: [
      {
        id: "kds_ok",
        check_id: "chk_ok",
        item_ids: ["li_1", "li_2"],
        status: "fired",
      },
    ],
    payments: [
      {
        id: "pay_paid",
        check_id: "chk_paid",
        method: "card",
        amount_cents: 651,
        tip_cents: 0,
        status: "captured",
        processor_charge_id: "ch_paid",
        gift_card_id: null,
      },
    ],
    charges: [
      {
        id: "ch_paid",
        payment_id: "pay_paid",
        amount_cents: 651,
        status: "succeeded",
        payment_method: "pm_ok",
      },
    ],
    invoices: [
      {
        id: "inv_paid",
        check_id: "chk_paid",
        payment_id: "pay_paid",
        amount_cents: 651,
        posted_at: now,
      },
    ],
    receipts: [
      {
        id: "rcp_paid",
        check_id: "chk_paid",
        invoice_id: "inv_paid",
        payment_id: "pay_paid",
        lines: [{ name: "Vanilla shake", quantity: 1, amount_cents: 600 }],
        subtotal_cents: 600,
        tax_cents: 51,
        discount_cents: 0,
        tip_cents: 0,
        total_cents: 651,
        tip_eligible: true,
      },
    ],
    refunds: [],
    processorRefunds: [],
    loyalty: [{ guest_id: "gst_maya", points: 120, punches: 4 }],
    giftCards: [{ id: "gf_25", balance_cents: 2500, last4: "4412" }],
    webhooks: [
      {
        id: "wh_partner",
        url: "https://partner.example/hooks/burgertown",
        events: ["payment.captured", "order.sent", "refund.accepted", "check.voided"],
      },
    ],
    settlements: [
      {
        id: "set_today",
        status: "open",
        payment_ids: ["pay_paid"],
        opened_at: now,
        closed_at: null,
      },
    ],
  }
}
