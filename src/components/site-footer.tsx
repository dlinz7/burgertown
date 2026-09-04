import Link from "next/link"
import { getStore } from "@/server/store"

export function SiteFooter() {
  const location = getStore().locations[0]
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p>
            {location.address.street}, {location.address.city},{" "}
            {location.address.region} {location.address.postal_code}
          </p>
          <p className="mt-1">
            {location.phone} · Closed Mondays · Cash or card at the window
          </p>
        </div>
        <p>
          <Link href="/rewards" className="hover:text-foreground">
            Townie Rewards
          </Link>
          <span className="mx-2">·</span>
          <Link href="/apis" className="hover:text-foreground">
            Partner APIs
          </Link>
        </p>
      </div>
    </footer>
  )
}
