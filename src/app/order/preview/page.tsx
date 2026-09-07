import { OrderCheckDisplay } from "@/components/order-check"
import { createSeed } from "@/server/seed"
import { presentCheck } from "@/server/store"

export const metadata = { title: "Check preview" }
export const dynamic = "force-dynamic"

export default function CheckPreviewPage() {
  const check = presentCheck(createSeed().checks.find((row) => row.id === "chk_ok")!)
  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"><OrderCheckDisplay checks={[{ check }]} preview /></div>
}
