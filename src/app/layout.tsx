import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-source-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Burgertown POS",
    template: "%s · Burgertown POS",
  },
  description:
    "Fake POS company sandbox with 25 interconnected APIs for Atlas workflow generation.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
