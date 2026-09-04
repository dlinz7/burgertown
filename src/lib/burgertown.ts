export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error?: { code?: string; message?: string } }
  ) {
    super(body.error?.message ?? `Request failed (${status})`)
    this.name = "ApiError"
  }

  get code() {
    return this.body.error?.code ?? "unknown"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(res.status, json ?? {})
  return json as T
}

export type Location = {
  id: string
  name: string
  address: { street: string; city: string; region: string; postal_code: string }
  phone: string
  hours: { label: string; value: string }[]
}

export type Table = {
  id: string
  location_id: string
  label: string
  seats: number
  status: "open" | "occupied"
  check_id: string | null
}

export type CatalogItem = {
  id: string
  name: string
  description: string
  category_id: string
  price: number
  is_active: boolean
  modifier_group_ids: string[]
  allergen_ids: string[]
}

export type ModifierOption = {
  id: string
  name: string
  price_delta_cents: number
  max_qty: number
  default: boolean
  is_86: boolean
}

export type ModifierGroup = {
  id: string
  name: string
  selection_type: "single" | "multi"
  required: boolean
  min_select: number
  max_select: number
  options: ModifierOption[]
}

export type Modifier = {
  id: string
  name: string
  price: number
  group_id: string
  group_name: string
}

export type Menu = {
  id: string
  name: string
  categories: { id: string; name: string; item_ids: string[] }[]
}

export type InventoryRow = {
  item_id: string
  on_hand: number
  is_86: boolean
}

export type Selection = {
  group_id: string
  option_id: string
  qty: number
  name?: string
  price_delta_cents?: number
}

export type LineItem = {
  id: string
  item_id: string
  name: string
  quantity: number
  price: number
  sent: boolean
  modifier_ids: string[]
  selections: Selection[]
}

export type Check = {
  id: string
  table_id: string | null
  fulfillment_id: string
  guest_id: string | null
  server_id: string
  status: "open" | "paid" | "voided"
  version: number
  items: LineItem[]
  discount_ids: string[]
  totals: {
    subtotal_cents: number
    discount_cents: number
    reward_discount_cents: number
    delivery_fee_cents: number
    tax_cents: number
    due_cents: number
  }
  receipt_id: string | null
  payment_ids: string[]
}

export type Fulfillment = {
  id: string
  type: "dine_in" | "pickup" | "delivery"
  status: string
  handoff_code: string | null
  address_id: string | null
}

export type Receipt = {
  id: string
  lines: { name: string; quantity: number; amount_cents: number }[]
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  tip_cents: number
  total_cents: number
  tip_eligible: boolean
  payment_id: string
}

export type Loyalty = {
  guest_id: string
  points: number
  points_balance: number
  punches: number
  tier: "bronze" | "silver" | "gold"
}

export type Offer = {
  id: string
  name: string
  points_cost: number
  kind: "amount_off" | "percent_off" | "free_item"
  amount_cents: number
  item_id: string | null
  min_tier: "bronze" | "silver" | "gold"
}

export type Guest = {
  id: string
  name: string
  email: string
  phone: string
  dietary_profile?: { avoid: string[]; strict: boolean }
}

export type Address = {
  id: string
  guest_id: string
  line1: string
  city: string
  postal_code: string
}

export type Quote = {
  id: string
  fee_cents: number
  eta_minutes: number
  zone_id: string
  expires_at: string
}

export type Employee = {
  id: string
  name: string
  role: "server" | "manager"
}

export type KitchenTicket = {
  id: string
  check_id: string
  item_ids: string[]
  status: "queued" | "fired" | "done"
}

export type Discount = {
  id: string
  name: string
  percent: number
  code: string
}

export const LOCATION_ID = "loc_oak"
export const SERVER_ID = "emp_jon"
export const WINDOW_TABLE_ID = "tbl_window"
export const PUNCHES_FOR_FREE = 10

export const api = {
  location: () => request<Location>(`/v1/locations/${LOCATION_ID}`),
  tables: () =>
    request<{ data: Table[] }>(`/v1/locations/${LOCATION_ID}/tables`),
  table: (id: string) => request<Table>(`/v1/tables/${id}`),
  menu: () => request<Menu>("/v1/menus/menu_dinner"),
  items: (exclude?: string) =>
    request<{ data: CatalogItem[] }>(
      exclude
        ? `/v1/catalog/items?exclude_allergens=${encodeURIComponent(exclude)}`
        : "/v1/catalog/items"
    ),
  modifierGroups: (itemId?: string) =>
    request<{ data: ModifierGroup[] }>(
      itemId
        ? `/v1/catalog/modifier-groups?item_id=${encodeURIComponent(itemId)}`
        : "/v1/catalog/modifier-groups"
    ),
  modifiers: () => request<{ data: Modifier[] }>("/v1/catalog/modifiers"),
  inventory: () => request<{ data: InventoryRow[] }>("/v1/inventory"),
  discounts: () => request<{ data: Discount[] }>("/v1/discounts"),
  guests: (email?: string) =>
    request<{ data: Guest[] }>(
      email ? `/v1/guests?email=${encodeURIComponent(email)}` : "/v1/guests"
    ),
  guest: (id: string) => request<Guest>(`/v1/guests/${id}`),
  createGuest: (input: { name: string; email: string; phone?: string }) =>
    request<Guest>("/v1/guests", {
      method: "POST",
      body: JSON.stringify({
        location_id: LOCATION_ID,
        name: input.name,
        email: input.email,
        phone: input.phone ?? "",
      }),
    }),
  guestAddresses: (guestId: string) =>
    request<{ data: Address[] }>(`/v1/guests/${guestId}/addresses`),
  employees: () => request<{ data: Employee[] }>("/v1/employees"),
  checks: (status?: string) =>
    request<{ data: Check[] }>(
      status ? `/v1/checks?status=${status}` : "/v1/checks"
    ),
  check: (id: string) => request<Check>(`/v1/checks/${id}`),
  tickets: () => request<{ data: KitchenTicket[] }>("/v1/kds/tickets"),
  bumpTicket: (id: string, status: KitchenTicket["status"]) =>
    request<KitchenTicket>(`/v1/kds/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  openCheck: (tableId: string, guestId?: string | null) =>
    request<Check>("/v1/checks", {
      method: "POST",
      body: JSON.stringify({
        location_id: LOCATION_ID,
        table_id: tableId,
        server_id: SERVER_ID,
        ...(guestId ? { guest_id: guestId } : {}),
      }),
    }),
  openPickup: async (guestId?: string | null) => {
    const fulfillment = await request<Fulfillment>("/v1/fulfillments", {
      method: "POST",
      body: JSON.stringify({
        location_id: LOCATION_ID,
        type: "pickup",
        ...(guestId ? { guest_id: guestId } : {}),
      }),
    })
    return request<Check>("/v1/checks", {
      method: "POST",
      body: JSON.stringify({
        fulfillment_id: fulfillment.id,
        server_id: SERVER_ID,
        ...(guestId ? { guest_id: guestId } : {}),
      }),
    })
  },
  addItem: (
    checkId: string,
    itemId: string,
    modifierIds: string[] = [],
    selections?: Selection[]
  ) =>
    request<{ check: Check }>(`/v1/checks/${checkId}/items`, {
      method: "POST",
      body: JSON.stringify({
        item_id: itemId,
        quantity: 1,
        ...(selections && selections.length > 0
          ? { selections }
          : { modifier_ids: modifierIds }),
      }),
    }),
  send: (checkId: string) =>
    request<{ check: Check; ticket: KitchenTicket }>(
      `/v1/checks/${checkId}/send`,
      { method: "POST" }
    ),
  applyDiscount: (checkId: string, code: string) =>
    request<Check>(`/v1/checks/${checkId}/discounts`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  offers: (guestId?: string) =>
    request<{ data: Offer[] }>(
      guestId ? `/v1/offers?guest_id=${encodeURIComponent(guestId)}` : "/v1/offers"
    ),
  redeem: (checkId: string, offerId: string, guestId: string) =>
    request<{ check: Check }>("/v1/redemptions", {
      method: "POST",
      body: JSON.stringify({
        check_id: checkId,
        offer_id: offerId,
        guest_id: guestId,
      }),
    }),
  pay: async (check: Check) => {
    const payment = await request<{ id: string }>("/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        check_id: check.id,
        method: "card",
        amount_cents: check.totals.due_cents,
        check_version: check.version,
      }),
    })
    await request("/v1/processor/charges", {
      method: "POST",
      body: JSON.stringify({
        payment_id: payment.id,
        payment_method: "pm_ok",
      }),
    })
    await request("/v1/invoices", {
      method: "POST",
      body: JSON.stringify({ payment_id: payment.id }),
    })
    return payment.id
  },
  receiptForCheck: (checkId: string) =>
    request<Receipt>(`/v1/checks/${checkId}/receipt`),
  tip: (paymentId: string, amountCents: number) =>
    request(`/v1/payments/${paymentId}/tip`, {
      method: "POST",
      body: JSON.stringify({ amount_cents: amountCents }),
    }),
  loyalty: (guestId: string) =>
    request<Loyalty>(`/v1/rewards/accounts/${guestId}`),
  earnLoyalty: (guestId: string, paymentId: string) =>
    request(`/v1/rewards/accounts/${guestId}/earn`, {
      method: "POST",
      body: JSON.stringify({ payment_id: paymentId }),
    }),
}

export function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function failMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong"
}
