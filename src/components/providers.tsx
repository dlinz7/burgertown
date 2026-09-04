"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { ShopProvider } from "@/components/shop-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ShopProvider>
        {children}
        <Toaster />
      </ShopProvider>
    </ThemeProvider>
  )
}
