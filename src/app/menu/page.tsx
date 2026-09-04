import { DinnerMenu } from "@/components/customer"

export const metadata = {
  title: "Menu",
  description: "Smash burgers, fries, and shakes at Burgertown on Oak Street.",
}

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Dinner board
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Menu</h1>
      <p className="mt-3 text-muted-foreground">
        Add to your bag, then pay for pickup at the window. Build the smash —
        patty, temperature, bun, bacon. Avocado is 86’d.
      </p>
      <div className="mt-8">
        <DinnerMenu />
      </div>
    </div>
  )
}
