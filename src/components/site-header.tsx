import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-sm text-primary-foreground">
            BT
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Burgertown</span>
            <span className="block text-[11px] text-muted-foreground">POS</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/apis" className="text-muted-foreground hover:text-foreground">
            APIs
          </Link>
          <a href="/openapi.json" className="text-muted-foreground hover:text-foreground">
            OpenAPI
          </a>
        </nav>
      </div>
    </header>
  )
}
