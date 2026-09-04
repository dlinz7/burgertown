"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useShop } from "@/components/shop-provider"
import { cn } from "@/lib/utils"

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Order" },
  { href: "/rewards", label: "Rewards" },
  { href: "/apis", label: "APIs" },
]

export function SiteHeader() {
  const { cartCount } = useShop()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            BT
          </span>
          <span className="text-sm font-semibold tracking-tight">Burgertown</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {link.href === "/order" && cartCount > 0 ? (
                  <span className="ml-1 tabular-nums text-foreground">
                    ({cartCount})
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
