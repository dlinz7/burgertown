import { getStore } from "@/server/store"

export function SiteFooter() {
  const location = getStore().locations[0]
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {location.address.street}, {location.address.city},{" "}
          {location.address.region} {location.address.postal_code}
        </p>
        <p>
          {location.phone} · Closed Mondays · Cash or card at the window
        </p>
      </div>
    </footer>
  )
}
