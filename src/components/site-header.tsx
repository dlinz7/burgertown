import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-sm text-primary-foreground">
            BT
          </span>
          <span className="leading-tight">
            <span className="block font-heading text-sm tracking-wide uppercase">
              Burgertown
            </span>
            <span className="block text-[11px] text-muted-foreground">
              POS sandbox
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/openapi.json" className="text-muted-foreground hover:text-foreground">
            OpenAPI
          </a>
          <a href="/health" className="text-muted-foreground hover:text-foreground">
            Health
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON API, not a page */}
          <a
            href="/v1/meta/apis"
            className="text-muted-foreground hover:text-foreground"
          >
            25 APIs
          </a>
        </nav>
      </div>
    </header>
  )
}
