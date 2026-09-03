import { KitchenBoard } from "@/components/restaurant"

export const metadata = {
  title: "Kitchen",
  description: "Tickets on the rail at Burgertown Oak Street.",
}

export default function KitchenPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Back of house
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Kitchen</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        Tickets land here when a table sends an order. Fire it, then bump it to
        the window.
      </p>
      <div className="mt-8">
        <KitchenBoard />
      </div>
    </div>
  )
}
