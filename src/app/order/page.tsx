import { BagAndCheckout } from "@/components/customer"

export const metadata = {
  title: "Order",
  description: "Pickup at the Burgertown window on Oak Street.",
}

export default function OrderPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <BagAndCheckout />
    </div>
  )
}
