import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { API_CATALOG, DOMAIN_LABELS } from "@/server/catalog"
import { cn } from "@/lib/utils"

const domains = ["venue", "menu", "service", "money", "ops"] as const

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Restaurant point of sale
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Burgertown POS
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        Oak Street runs on Burgertown: floor, menu, checks, card capture, receipts,
        refunds, and end-of-day. Twenty-five HTTP APIs. Resource IDs are how they
        connect — a check belongs to a table, a payment belongs to a check, an
        invoice posts that payment back onto the ticket.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/apis" className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}>
          Browse the APIs
          <ArrowRight />
        </Link>
        <a
          href="/openapi.json"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          OpenAPI spec
        </a>
      </div>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {domains.map((domain) => {
          const apis = API_CATALOG.filter((api) => api.domain === domain)
          return (
            <div key={domain} className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {DOMAIN_LABELS[domain]}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {apis.map((api) => (
                  <li key={api.id}>
                    <Link href={`/apis#${api.id}`} className="hover:underline">
                      {api.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="mt-16 rounded-2xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Seeded store</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Location <code className="text-foreground">loc_oak</code>, dinner menu, eight
          tables. Table 4 has open check <code className="text-foreground">chk_ok</code>.
          Check <code className="text-foreground">chk_paid</code> is already closed.
          Amounts are integer cents.
        </p>
      </section>
    </div>
  )
}
