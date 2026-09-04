import { HttpError } from "@/server/errors"
import type {
  CatalogItem,
  Guest,
  ModifierGroup,
  Selection,
} from "@/server/seed"

export type SelectionInput = {
  group_id: string
  option_id: string
  qty?: number
}

export type ResolvedLine = {
  selections: Selection[]
  modifier_ids: string[]
  extra_cents: number
  removed_defaults: string[]
  warnings: string[]
}

function optionOf(groups: ModifierGroup[], optionId: string) {
  for (const group of groups) {
    const option = group.options.find((row) => row.id === optionId)
    if (option) return { group, option }
  }
  return null
}

export function resolveSelections(input: {
  item: CatalogItem
  groups: ModifierGroup[]
  selections?: SelectionInput[]
  modifier_ids?: string[]
  removed_defaults?: string[]
  guest?: Guest | null
}): ResolvedLine {
  const itemGroups = input.groups.filter((group) =>
    input.item.modifier_group_ids.includes(group.id)
  )
  const removed = input.removed_defaults ?? []

  for (const id of removed) {
    const found = optionOf(input.groups, id)
    if (!found || !found.option.default) {
      throw new HttpError(422, "not_a_default", "removed_defaults names a non-default option", {
        option_id: id,
      })
    }
  }

  let raw: SelectionInput[]
  if (input.selections !== undefined) {
    raw = input.selections
  } else {
    raw = (input.modifier_ids ?? []).map((optionId) => {
      const found = optionOf(input.groups, optionId)
      if (!found) throw new HttpError(404, "modifier_not_found", "Modifier not found")
      return { group_id: found.group.id, option_id: optionId, qty: 1 }
    })
    for (const group of itemGroups) {
      const defaults = group.options.filter(
        (option) => option.default && !removed.includes(option.id)
      )
      const already = raw.some((row) => row.group_id === group.id)
      if (!already) {
        for (const option of defaults) {
          raw.push({ group_id: group.id, option_id: option.id, qty: 1 })
        }
      }
    }
  }

  const byGroup = new Map<string, SelectionInput[]>()
  for (const row of raw) {
    const list = byGroup.get(row.group_id) ?? []
    list.push(row)
    byGroup.set(row.group_id, list)
  }

  const selections: Selection[] = []

  for (const group of itemGroups) {
    const picked = byGroup.get(group.id) ?? []
    const distinct = new Set(picked.map((row) => row.option_id))

    if (group.required && distinct.size === 0) {
      throw new HttpError(
        422,
        "modifier_group_required",
        `Modifier group ${group.id} is required`,
        { group_id: group.id }
      )
    }
    if (distinct.size > group.max_select) {
      throw new HttpError(
        422,
        "modifier_max_exceeded",
        `Too many options in ${group.id}`,
        { group_id: group.id, max_select: group.max_select }
      )
    }
    if (distinct.size < group.min_select) {
      throw new HttpError(
        422,
        "modifier_group_required",
        `Modifier group ${group.id} needs at least ${group.min_select}`,
        { group_id: group.id }
      )
    }

    for (const row of picked) {
      const option = group.options.find((item) => item.id === row.option_id)
      if (!option) throw new HttpError(404, "modifier_not_found", "Modifier not found")
      if (option.is_86) {
        throw new HttpError(409, "modifier_86", "Modifier is 86'd", {
          option_id: option.id,
        })
      }
      const qty = row.qty ?? 1
      if (qty > option.max_qty) {
        throw new HttpError(
          422,
          "modifier_qty_exceeded",
          `${option.name} max qty is ${option.max_qty}`,
          { option_id: option.id, max_qty: option.max_qty }
        )
      }
      if (removed.includes(option.id)) continue
      selections.push({
        group_id: group.id,
        option_id: option.id,
        qty,
        name: option.name,
        price_delta_cents: option.price_delta_cents,
      })
    }
  }

  const selectedIds = new Set(selections.map((row) => row.option_id))
  for (const group of itemGroups) {
    for (const [a, b] of group.incompatible_with) {
      if (selectedIds.has(a) && selectedIds.has(b)) {
        throw new HttpError(
          409,
          "modifier_incompatible",
          `${a} cannot be combined with ${b}`,
          { pair: [a, b] }
        )
      }
    }
  }

  const extra_cents = selections.reduce(
    (sum, row) => sum + row.price_delta_cents * row.qty,
    0
  )

  const warnings: string[] = []
  const guest = input.guest
  if (guest) {
    const allergens = new Set([
      ...input.item.allergen_ids,
      ...selections.flatMap((row) => {
        const found = optionOf(input.groups, row.option_id)
        return found?.option.allergen_ids ?? []
      }),
    ])
    const hits = guest.dietary_profile.avoid.filter((id) => allergens.has(id))
    if (hits.length > 0) {
      if (guest.dietary_profile.strict) {
        throw new HttpError(
          409,
          "allergen_conflict",
          "Item conflicts with the guest dietary profile",
          { allergen_ids: hits }
        )
      }
      warnings.push(`Contains ${hits.join(", ")}`)
    }
  }

  return {
    selections,
    modifier_ids: selections.map((row) => row.option_id),
    extra_cents,
    removed_defaults: removed,
    warnings,
  }
}
