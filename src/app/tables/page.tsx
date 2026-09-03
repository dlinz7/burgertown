import { FloorPlan } from "@/components/restaurant"

export const metadata = {
  title: "Tables",
  description: "Picnic tables out front of Burgertown.",
}

export default function TablesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Out front
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Tables</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        Eight picnic tables. Open one to order, send food to the kitchen, and
        pay when you are finished.
      </p>
      <div className="mt-8">
        <FloorPlan />
      </div>
    </div>
  )
}
