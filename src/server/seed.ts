export type Money = number

export type Location = {
  id: string
  name: string
  address: { street: string; city: string; region: string; postal_code: string }
  phone: string
  hours: { label: string; value: string }[]
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
  allergen_ids: string[]
  is_active: boolean
}

export type ModifierOption = {
  id: string
  name: string
  price_delta_cents: Money
  max_qty: number
  default: boolean
  is_86: boolean
  allergen_ids: string[]
}

export type ModifierGroup = {
  id: string
  name: string
  selection_type: "single" | "multi"
  required: boolean
  min_select: number
  max_select: number
  options: ModifierOption[]
  incompatible_with: [string, string][]
}

export type Modifier = {
  id: string
  name: string
  price: Money
  group_id: string
  group_name: string
}

export type Allergen = {
  id: string
  name: string
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
  dietary_profile: { avoid: string[]; strict: boolean }
}

export type Address = {
  id: string
  guest_id: string
  line1: string
  city: string
  region: string
  postal_code: string
  location: { type: "Point"; coordinates: [number, number] }
}

export type Zone = {
  id: string
  location_id: string
  name: string
  fee_cents: Money
  eta_minutes: number
  requires_proof: boolean
  postal_codes: string[]
}

export type Employee = {
  id: string
  name: string
  role: "server" | "manager"
  location_id: string
  clocked_in: boolean
}

export type Selection = {
  group_id: string
  option_id: string
  qty: number
  name: string
  price_delta_cents: Money
}

export type LineItem = {
  id: string
  item_id: string
  name: string
  quantity: number
  price: Money
  sent: boolean
  modifier_ids: string[]
  selections: Selection[]
  removed_defaults: string[]
  notes: string
  warnings: string[]
}

export type FulfillmentStatus =
  | "open"
  | "sent"
  | "ready"
  | "closing"
  | "closed"
  | "canceled"

export type Fulfillment = {
  id: string
  location_id: string
  type: "dine_in" | "pickup" | "delivery"
  status: FulfillmentStatus
  table_id: string | null
  guest_id: string | null
  address_id: string | null
  pickup_at: string | null
  handoff_code: string | null
  check_id: string | null
  delivery_fee_cents: Money
  created_at: string
}

export type Check = {
  id: string
  location_id: string
  table_id: string | null
  fulfillment_id: string
  guest_id: string | null
  server_id: string
  status: "open" | "paid" | "voided"
  version: number
  items: LineItem[]
  discount_ids: string[]
  reward_discount_cents: Money
  redemption_id: string | null
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

export type RewardAccount = {
  id: string
  guest_id: string
  points: number
  points_balance: number
  punches: number
  tier: "bronze" | "silver" | "gold"
  trailing_spend_cents: Money
}

export type LedgerEntry = {
  id: string
  guest_id: string
  delta: number
  reason: "earn" | "redeem" | "expire" | "refund"
  check_id: string | null
  offer_id: string | null
  payment_id: string | null
  balance_after: number
  created_at: string
}

export type Offer = {
  id: string
  name: string
  points_cost: number
  kind: "amount_off" | "percent_off" | "free_item"
  amount_cents: Money
  percent: number
  item_id: string | null
  min_tier: "bronze" | "silver" | "gold"
  expires_at: string | null
}

export type Redemption = {
  id: string
  check_id: string
  offer_id: string
  guest_id: string
  points_spent: number
  discount_cents: Money
  created_at: string
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
  courier_tips_cents: Money
  opened_at: string
  closed_at: string | null
}

export type Courier = {
  id: string
  name: string
  location_id: string
  status: "available" | "offline" | "busy"
  vehicle: "scooter" | "bike" | "car"
  rejects_on_accept: boolean
}

export type Quote = {
  id: string
  location_id: string
  address_id: string
  zone_id: string
  fee_cents: Money
  eta_minutes: number
  expires_at: string
}

export type DeliveryJob = {
  id: string
  fulfillment_id: string
  quote_id: string
  zone_id: string
  fee_cents: Money
  status:
    | "pending"
    | "assigned"
    | "accepted"
    | "picked_up"
    | "delivered"
    | "failed"
    | "canceled"
  courier_id: string | null
  proof_photo_url: string | null
  notes: string | null
  fail_reason: string | null
  courier_tip_cents: Money
}

export type TrackingPing = {
  at: string
  location: { type: "Point"; coordinates: [number, number] }
}

export type TrackingTrail = {
  delivery_id: string
  pings: TrackingPing[]
}

export type Store = {
  locations: Location[]
  tables: Table[]
  menus: Menu[]
  items: CatalogItem[]
  modifierGroups: ModifierGroup[]
  modifiers: Modifier[]
  allergens: Allergen[]
  taxes: Tax[]
  discounts: Discount[]
  inventory: InventoryRow[]
  guests: Guest[]
  addresses: Address[]
  zones: Zone[]
  employees: Employee[]
  fulfillments: Fulfillment[]
  checks: Check[]
  tickets: KitchenTicket[]
  payments: Payment[]
  charges: Charge[]
  invoices: Invoice[]
  receipts: Receipt[]
  refunds: Refund[]
  processorRefunds: ProcessorRefund[]
  rewards: RewardAccount[]
  ledger: LedgerEntry[]
  offers: Offer[]
  redemptions: Redemption[]
  giftCards: GiftCard[]
  webhooks: Webhook[]
  settlements: Settlement[]
  couriers: Courier[]
  quotes: Quote[]
  deliveries: DeliveryJob[]
  tracking: TrackingTrail[]
}

const now = "2026-09-03T18:00:00.000Z"
const BURGER_GROUPS = ["modg_patty", "modg_temp", "modg_bun", "modg_add", "modg_default"]

function flatModifiers(groups: ModifierGroup[]): Modifier[] {
  return groups.flatMap((group) =>
    group.options.map((option) => ({
      id: option.id,
      name: option.name,
      price: option.price_delta_cents,
      group_id: group.id,
      group_name: group.name,
    }))
  )
}

export function createSeed(): Store {
  const modifierGroups: ModifierGroup[] = [
    {
      id: "modg_patty",
      name: "Patty",
      selection_type: "single",
      required: true,
      min_select: 1,
      max_select: 1,
      incompatible_with: [["mod_egg", "mod_impossible"]],
      options: [
        {
          id: "mod_beef",
          name: "Beef smash",
          price_delta_cents: 0,
          max_qty: 1,
          default: true,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_black_bean",
          name: "Black bean",
          price_delta_cents: 0,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: ["alg_soy"],
        },
        {
          id: "mod_impossible",
          name: "Impossible",
          price_delta_cents: 250,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: ["alg_soy"],
        },
        {
          id: "mod_chicken",
          name: "Crispy chicken",
          price_delta_cents: 100,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: ["alg_gluten"],
        },
      ],
    },
    {
      id: "modg_temp",
      name: "Temperature",
      selection_type: "single",
      required: true,
      min_select: 1,
      max_select: 1,
      incompatible_with: [],
      options: [
        {
          id: "mod_medium",
          name: "Medium",
          price_delta_cents: 0,
          max_qty: 1,
          default: true,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_med_well",
          name: "Medium well",
          price_delta_cents: 0,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_well",
          name: "Well done",
          price_delta_cents: 0,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: [],
        },
      ],
    },
    {
      id: "modg_bun",
      name: "Bun",
      selection_type: "single",
      required: false,
      min_select: 0,
      max_select: 1,
      incompatible_with: [],
      options: [
        {
          id: "mod_potato_bun",
          name: "Potato bun",
          price_delta_cents: 0,
          max_qty: 1,
          default: true,
          is_86: false,
          allergen_ids: ["alg_gluten"],
        },
        {
          id: "mod_gf_bun",
          name: "Gluten-free bun",
          price_delta_cents: 150,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_lettuce_wrap",
          name: "Lettuce wrap",
          price_delta_cents: 0,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: [],
        },
      ],
    },
    {
      id: "modg_add",
      name: "Add-ons",
      selection_type: "multi",
      required: false,
      min_select: 0,
      max_select: 4,
      incompatible_with: [["mod_egg", "mod_impossible"]],
      options: [
        {
          id: "mod_bacon",
          name: "Bacon",
          price_delta_cents: 200,
          max_qty: 2,
          default: false,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_egg",
          name: "Fried egg",
          price_delta_cents: 150,
          max_qty: 1,
          default: false,
          is_86: false,
          allergen_ids: ["alg_egg"],
        },
        {
          id: "mod_avocado",
          name: "Avocado",
          price_delta_cents: 175,
          max_qty: 1,
          default: false,
          is_86: true,
          allergen_ids: [],
        },
      ],
    },
    {
      id: "modg_default",
      name: "On the burger",
      selection_type: "multi",
      required: false,
      min_select: 0,
      max_select: 3,
      incompatible_with: [],
      options: [
        {
          id: "mod_pickle",
          name: "Pickles",
          price_delta_cents: 0,
          max_qty: 1,
          default: true,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_onion",
          name: "Onion",
          price_delta_cents: 0,
          max_qty: 1,
          default: true,
          is_86: false,
          allergen_ids: [],
        },
        {
          id: "mod_sauce",
          name: "Town Sauce",
          price_delta_cents: 0,
          max_qty: 1,
          default: true,
          is_86: false,
          allergen_ids: ["alg_egg"],
        },
      ],
    },
  ]

  const items: CatalogItem[] = [
    {
      id: "itm_townie",
      name: "The Townie",
      description: "Smash patty, American, pickles, onion, Town Sauce.",
      category_id: "cat_burgers",
      price: 1100,
      tax_ids: ["tax_or"],
      modifier_group_ids: BURGER_GROUPS,
      allergen_ids: ["alg_gluten", "alg_dairy", "alg_egg"],
      is_active: true,
    },
    {
      id: "itm_double",
      name: "Double Townie",
      description: "Two smash patties, extra Town Sauce.",
      category_id: "cat_burgers",
      price: 1500,
      tax_ids: ["tax_or"],
      modifier_group_ids: BURGER_GROUPS,
      allergen_ids: ["alg_gluten", "alg_dairy", "alg_egg"],
      is_active: true,
    },
    {
      id: "itm_jalapeno",
      name: "Jalapeño Smash",
      description: "Pepper jack, pickled jalapeños, chipotle mayo.",
      category_id: "cat_burgers",
      price: 1300,
      tax_ids: ["tax_or"],
      modifier_group_ids: BURGER_GROUPS,
      allergen_ids: ["alg_gluten", "alg_dairy", "alg_egg"],
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
      allergen_ids: [],
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
      allergen_ids: ["alg_dairy"],
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
      allergen_ids: ["alg_dairy"],
      is_active: true,
    },
  ]

  const tables: Table[] = [
    ...Array.from({ length: 8 }, (_, index): Table => ({
      id: `tbl_${index + 1}`,
      location_id: "loc_oak",
      label: `Table ${index + 1}`,
      seats: index === 6 ? 6 : 4,
      status: index + 1 === 4 || index + 1 === 2 ? "occupied" : "open",
      check_id: index + 1 === 4 ? "chk_ok" : index + 1 === 2 ? "chk_12" : null,
    })),
    {
      id: "tbl_window",
      location_id: "loc_oak",
      label: "Window",
      seats: 1,
      status: "open",
      check_id: null,
    },
  ]

  const blankLine = (
    id: string,
    item_id: string,
    name: string,
    price: number,
    modifier_ids: string[] = []
  ): LineItem => ({
    id,
    item_id,
    name,
    quantity: 1,
    price,
    sent: true,
    modifier_ids,
    selections: modifier_ids.map((optionId) => {
      const group = modifierGroups.find((row) =>
        row.options.some((option) => option.id === optionId)
      )
      const option = group?.options.find((row) => row.id === optionId)
      return {
        group_id: group?.id ?? "",
        option_id: optionId,
        qty: 1,
        name: option?.name ?? optionId,
        price_delta_cents: option?.price_delta_cents ?? 0,
      }
    }),
    removed_defaults: [],
    notes: "",
    warnings: [],
  })

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
        phone: "(503) 555-0140",
        hours: [
          { label: "Tuesday – Thursday", value: "11:00 AM – 9:00 PM" },
          { label: "Friday – Saturday", value: "11:00 AM – 11:00 PM" },
          { label: "Sunday", value: "11:00 AM – 8:00 PM" },
          { label: "Monday", value: "Closed" },
        ],
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
    modifierGroups,
    modifiers: flatModifiers(modifierGroups),
    allergens: [
      { id: "alg_gluten", name: "Gluten" },
      { id: "alg_dairy", name: "Dairy" },
      { id: "alg_soy", name: "Soy" },
      { id: "alg_egg", name: "Egg" },
    ],
    taxes: [{ id: "tax_or", location_id: "loc_oak", name: "OR sales tax", rate: 0.085 }],
    discounts: [{ id: "dsc_local10", name: "Local 10%", percent: 10, code: "LOCAL10" }],
    inventory: [
      ...items.map((item) => ({
        item_id: item.id,
        on_hand: item.id === "itm_86" ? 0 : 40,
        is_86: item.id === "itm_86",
      })),
      { item_id: "mod_avocado", on_hand: 0, is_86: true },
      { item_id: "mod_bacon", on_hand: 30, is_86: false },
      { item_id: "mod_egg", on_hand: 20, is_86: false },
    ],
    guests: [
      {
        id: "gst_maya",
        name: "Maya Chen",
        email: "maya@example.com",
        phone: "5035550142",
        location_id: "loc_oak",
        dietary_profile: { avoid: ["alg_dairy"], strict: false },
      },
      {
        id: "gst_theo",
        name: "Theo Nash",
        email: "theo@example.com",
        phone: "5035550199",
        location_id: "loc_oak",
        dietary_profile: { avoid: [], strict: false },
      },
    ],
    addresses: [
      {
        id: "addr_maya",
        guest_id: "gst_maya",
        line1: "1100 SE Oak St",
        city: "Rivertown",
        region: "OR",
        postal_code: "97035",
        location: { type: "Point", coordinates: [-122.6201, 45.4284] },
      },
      {
        id: "addr_theo",
        guest_id: "gst_theo",
        line1: "88 Edgewater Ave",
        city: "Rivertown",
        region: "OR",
        postal_code: "97202",
        location: { type: "Point", coordinates: [-122.641, 45.411] },
      },
      {
        id: "addr_far",
        guest_id: "gst_theo",
        line1: "200 Main St",
        city: "Hillsboro",
        region: "OR",
        postal_code: "97123",
        location: { type: "Point", coordinates: [-122.989, 45.522] },
      },
    ],
    zones: [
      {
        id: "zone_oak_core",
        location_id: "loc_oak",
        name: "Oak core",
        fee_cents: 349,
        eta_minutes: 25,
        requires_proof: false,
        postal_codes: ["97035", "97214"],
      },
      {
        id: "zone_oak_edge",
        location_id: "loc_oak",
        name: "Oak edge",
        fee_cents: 599,
        eta_minutes: 45,
        requires_proof: true,
        postal_codes: ["97202"],
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
    fulfillments: [
      {
        id: "ful_dine_4",
        location_id: "loc_oak",
        type: "dine_in",
        status: "sent",
        table_id: "tbl_4",
        guest_id: "gst_maya",
        address_id: null,
        pickup_at: null,
        handoff_code: null,
        check_id: "chk_ok",
        delivery_fee_cents: 0,
        created_at: now,
      },
      {
        id: "ful_dine_2",
        location_id: "loc_oak",
        type: "dine_in",
        status: "sent",
        table_id: "tbl_2",
        guest_id: null,
        address_id: null,
        pickup_at: null,
        handoff_code: null,
        check_id: "chk_12",
        delivery_fee_cents: 0,
        created_at: now,
      },
      {
        id: "ful_paid",
        location_id: "loc_oak",
        type: "dine_in",
        status: "closed",
        table_id: "tbl_1",
        guest_id: "gst_maya",
        address_id: null,
        pickup_at: null,
        handoff_code: null,
        check_id: "chk_paid",
        delivery_fee_cents: 0,
        created_at: now,
      },
      {
        id: "ful_pickup_1",
        location_id: "loc_oak",
        type: "pickup",
        status: "ready",
        table_id: null,
        guest_id: "gst_maya",
        address_id: null,
        pickup_at: "2026-09-04T18:40:00.000Z",
        handoff_code: "4412",
        check_id: null,
        delivery_fee_cents: 0,
        created_at: now,
      },
      {
        id: "ful_dlv_1",
        location_id: "loc_oak",
        type: "delivery",
        status: "sent",
        table_id: null,
        guest_id: "gst_maya",
        address_id: "addr_maya",
        pickup_at: null,
        handoff_code: null,
        check_id: "chk_dlv",
        delivery_fee_cents: 349,
        created_at: now,
      },
      {
        id: "ful_enroute",
        location_id: "loc_oak",
        type: "delivery",
        status: "ready",
        table_id: null,
        guest_id: "gst_maya",
        address_id: "addr_maya",
        pickup_at: null,
        handoff_code: null,
        check_id: "chk_enroute",
        delivery_fee_cents: 349,
        created_at: now,
      },
    ],
    checks: [
      {
        id: "chk_ok",
        location_id: "loc_oak",
        table_id: "tbl_4",
        fulfillment_id: "ful_dine_4",
        guest_id: "gst_maya",
        server_id: "emp_jon",
        status: "open",
        version: 1,
        items: [
          blankLine("li_1", "itm_townie", "The Townie", 1100),
          blankLine("li_2", "itm_fries", "Shoestring fries", 500),
        ],
        discount_ids: [],
        reward_discount_cents: 0,
        redemption_id: null,
        payment_ids: [],
        invoice_id: null,
        receipt_id: null,
        opened_at: now,
      },
      {
        id: "chk_12",
        location_id: "loc_oak",
        table_id: "tbl_2",
        fulfillment_id: "ful_dine_2",
        guest_id: null,
        server_id: "emp_jon",
        status: "open",
        version: 1,
        items: [blankLine("li_d1", "itm_double", "Double Townie", 1700, ["mod_bacon"])],
        discount_ids: [],
        reward_discount_cents: 0,
        redemption_id: null,
        payment_ids: [],
        invoice_id: null,
        receipt_id: null,
        opened_at: now,
      },
      {
        id: "chk_paid",
        location_id: "loc_oak",
        table_id: "tbl_1",
        fulfillment_id: "ful_paid",
        guest_id: "gst_maya",
        server_id: "emp_jon",
        status: "paid",
        version: 1,
        items: [blankLine("li_p1", "itm_shake", "Vanilla shake", 600)],
        discount_ids: [],
        reward_discount_cents: 0,
        redemption_id: null,
        payment_ids: ["pay_paid"],
        invoice_id: "inv_paid",
        receipt_id: "rcp_paid",
        opened_at: now,
      },
      {
        id: "chk_dlv",
        location_id: "loc_oak",
        table_id: null,
        fulfillment_id: "ful_dlv_1",
        guest_id: "gst_maya",
        server_id: "emp_jon",
        status: "open",
        version: 1,
        items: [blankLine("li_dlv", "itm_townie", "The Townie", 1100)],
        discount_ids: [],
        reward_discount_cents: 0,
        redemption_id: null,
        payment_ids: [],
        invoice_id: null,
        receipt_id: null,
        opened_at: now,
      },
      {
        id: "chk_enroute",
        location_id: "loc_oak",
        table_id: null,
        fulfillment_id: "ful_enroute",
        guest_id: "gst_maya",
        server_id: "emp_jon",
        status: "open",
        version: 1,
        items: [blankLine("li_enr", "itm_double", "Double Townie", 1500)],
        discount_ids: [],
        reward_discount_cents: 0,
        redemption_id: null,
        payment_ids: [],
        invoice_id: null,
        receipt_id: null,
        opened_at: now,
      },
    ],
    tickets: [
      { id: "kds_ok", check_id: "chk_ok", item_ids: ["li_1", "li_2"], status: "fired" },
      { id: "kds_12", check_id: "chk_12", item_ids: ["li_d1"], status: "queued" },
      { id: "kds_dlv", check_id: "chk_dlv", item_ids: ["li_dlv"], status: "fired" },
      { id: "kds_enr", check_id: "chk_enroute", item_ids: ["li_enr"], status: "done" },
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
    rewards: [
      {
        id: "rwd_maya",
        guest_id: "gst_maya",
        points: 1240,
        points_balance: 1240,
        punches: 4,
        tier: "gold",
        trailing_spend_cents: 62000,
      },
      {
        id: "rwd_theo",
        guest_id: "gst_theo",
        points: 40,
        points_balance: 40,
        punches: 2,
        tier: "bronze",
        trailing_spend_cents: 2800,
      },
    ],
    ledger: [
      {
        id: "led_0001",
        guest_id: "gst_maya",
        delta: 400,
        reason: "earn",
        check_id: null,
        offer_id: null,
        payment_id: "pay_hist_1",
        balance_after: 400,
        created_at: "2026-08-01T18:00:00.000Z",
      },
      {
        id: "led_0002",
        guest_id: "gst_maya",
        delta: 280,
        reason: "earn",
        check_id: null,
        offer_id: null,
        payment_id: "pay_hist_2",
        balance_after: 680,
        created_at: "2026-08-08T18:00:00.000Z",
      },
      {
        id: "led_0003",
        guest_id: "gst_maya",
        delta: 220,
        reason: "earn",
        check_id: null,
        offer_id: null,
        payment_id: "pay_hist_3",
        balance_after: 900,
        created_at: "2026-08-15T18:00:00.000Z",
      },
      {
        id: "led_0004",
        guest_id: "gst_maya",
        delta: 180,
        reason: "earn",
        check_id: null,
        offer_id: null,
        payment_id: "pay_hist_4",
        balance_after: 1080,
        created_at: "2026-08-22T18:00:00.000Z",
      },
      {
        id: "led_0005",
        guest_id: "gst_maya",
        delta: 160,
        reason: "earn",
        check_id: "chk_paid",
        offer_id: null,
        payment_id: "pay_paid",
        balance_after: 1240,
        created_at: now,
      },
      {
        id: "led_0006",
        guest_id: "gst_theo",
        delta: 40,
        reason: "earn",
        check_id: null,
        offer_id: null,
        payment_id: null,
        balance_after: 40,
        created_at: now,
      },
    ],
    offers: [
      {
        id: "off_free_fries",
        name: "Free shoestring fries",
        points_cost: 500,
        kind: "free_item",
        amount_cents: 500,
        percent: 0,
        item_id: "itm_fries",
        min_tier: "bronze",
        expires_at: null,
      },
      {
        id: "off_5off",
        name: "$5 off",
        points_cost: 750,
        kind: "amount_off",
        amount_cents: 500,
        percent: 0,
        item_id: null,
        min_tier: "bronze",
        expires_at: null,
      },
      {
        id: "off_gold_shake",
        name: "Gold shake",
        points_cost: 400,
        kind: "free_item",
        amount_cents: 600,
        percent: 0,
        item_id: "itm_shake",
        min_tier: "gold",
        expires_at: null,
      },
      {
        id: "off_expired",
        name: "Expired townie night",
        points_cost: 100,
        kind: "amount_off",
        amount_cents: 300,
        percent: 0,
        item_id: null,
        min_tier: "bronze",
        expires_at: "2026-09-02T23:59:59.000Z",
      },
    ],
    redemptions: [],
    giftCards: [{ id: "gf_25", balance_cents: 2500, last4: "4412" }],
    webhooks: [
      {
        id: "wh_partner",
        url: "https://partner.example/hooks/burgertown",
        events: [
          "payment.captured",
          "order.sent",
          "refund.accepted",
          "check.voided",
          "delivery.assigned",
          "delivery.delivered",
          "delivery.failed",
          "reward.redeemed",
          "fulfillment.ready",
        ],
      },
    ],
    settlements: [
      {
        id: "set_today",
        status: "open",
        payment_ids: ["pay_paid"],
        courier_tips_cents: 0,
        opened_at: now,
        closed_at: null,
      },
    ],
    couriers: [
      {
        id: "crr_sam",
        name: "Sam Ortiz",
        location_id: "loc_oak",
        status: "available",
        vehicle: "scooter",
        rejects_on_accept: false,
      },
      {
        id: "crr_dee",
        name: "Dee Patel",
        location_id: "loc_oak",
        status: "offline",
        vehicle: "bike",
        rejects_on_accept: false,
      },
      {
        id: "crr_flake",
        name: "Riley Flake",
        location_id: "loc_oak",
        status: "available",
        vehicle: "car",
        rejects_on_accept: true,
      },
    ],
    quotes: [
      {
        id: "qte_pending",
        location_id: "loc_oak",
        address_id: "addr_maya",
        zone_id: "zone_oak_core",
        fee_cents: 349,
        eta_minutes: 25,
        expires_at: "2026-12-01T00:00:00.000Z",
      },
      {
        id: "qte_enroute",
        location_id: "loc_oak",
        address_id: "addr_maya",
        zone_id: "zone_oak_core",
        fee_cents: 349,
        eta_minutes: 25,
        expires_at: "2026-12-01T00:00:00.000Z",
      },
    ],
    deliveries: [
      {
        id: "dlv_pending",
        fulfillment_id: "ful_dlv_1",
        quote_id: "qte_pending",
        zone_id: "zone_oak_core",
        fee_cents: 349,
        status: "pending",
        courier_id: null,
        proof_photo_url: null,
        notes: null,
        fail_reason: null,
        courier_tip_cents: 0,
      },
      {
        id: "dlv_enroute",
        fulfillment_id: "ful_enroute",
        quote_id: "qte_enroute",
        zone_id: "zone_oak_core",
        fee_cents: 349,
        status: "picked_up",
        courier_id: "crr_sam",
        proof_photo_url: null,
        notes: null,
        fail_reason: null,
        courier_tip_cents: 0,
      },
    ],
    tracking: [
      {
        delivery_id: "dlv_enroute",
        pings: [
          {
            at: now,
            location: { type: "Point", coordinates: [-122.618, 45.427] },
          },
        ],
      },
    ],
  }
}
