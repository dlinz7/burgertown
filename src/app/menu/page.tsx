import { MenuBoard } from "@/components/restaurant"

export const metadata = {
  title: "Menu",
  description: "Smash burgers, fries, and shakes at Burgertown on Oak Street.",
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>
}) {
  const { table } = await searchParams
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Dinner board
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Menu</h1>
      <p className="mt-3 text-muted-foreground">
        Smash burgers, shoestring fries, and hand-spun shakes. Add-ons land on
        the ticket when you sit down.
      </p>
      <div className="mt-8">
        <MenuBoard tableId={table} />
      </div>
    </div>
  )
}
