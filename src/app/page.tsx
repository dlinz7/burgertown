import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  FeaturedMenu,
  LocationBanner,
  LocationHours,
} from "@/components/customer"
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
            potato bun. Order on your phone, pick up at the window, eat outside.
          </p>
          <div className="mt-4">
            <LocationBanner />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}
            >
              Order pickup
              <ArrowRight />
            </Link>
            <Link
              href="/rewards"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Join Townie Rewards
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section>
          <h2 className="text-xl font-semibold">On the board tonight</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Smash burgers, shoestring fries, hand-spun shakes.
          </p>
          <div className="mt-6">
            <FeaturedMenu />
          </div>
          <Link href="/menu" className="mt-4 inline-block text-sm underline">
            Full menu
          </Link>
        </section>

        <section className="mt-16 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Hours</h2>
            <div className="mt-3">
              <LocationHours />
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">How it works</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Order here, pay by card, we call your name at the window. Picnic
              tables out front — no reservations. Townie Rewards: ten punches
              gets you fries.
            </p>
            <Link href="/rewards" className="mt-4 inline-block text-sm underline">
              Get a punch card
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
