import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  FeaturedMenu,
  FloorPlan,
  LocationBanner,
  LocationHours,
} from "@/components/restaurant"
import { cn } from "@/lib/utils"

export default function Home() {
  return (
    <div>
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Smash burgers · Oak Street
          </p>
          <h1 className="mt-3 max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Burgertown
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
            A walk-up window, picnic tables, and smash burgers on a toasted
            potato bun. No reservations. Sit down, order off the board, pay when
            you are done.
          </p>
          <div className="mt-4">
            <LocationBanner />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}
            >
              See the menu
              <ArrowRight />
            </Link>
            <Link
              href="/tables/tbl_4"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Maya’s table
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section>
          <h2 className="text-xl font-semibold">On the board tonight</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live from the kitchen catalog.
          </p>
          <div className="mt-6">
            <FeaturedMenu />
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Out front</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Eight picnic tables. Seated ones already have a ticket.
              </p>
            </div>
            <Link href="/tables" className="text-sm underline">
              All tables
            </Link>
          </div>
          <div className="mt-6">
            <FloorPlan compact />
          </div>
        </section>

        <section className="mt-16 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Hours</h2>
            <div className="mt-3">
              <LocationHours />
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">The window</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Cash or card. We 86 the malt when we run out. Ask about the punch
              card if you have been here before. Kitchen tickets fire as soon as
              you send the order.
            </p>
            <Link
              href="/kitchen"
              className="mt-4 inline-block text-sm underline"
            >
              Peek at the rail
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
