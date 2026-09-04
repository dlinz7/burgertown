import { RewardsClub } from "@/components/customer"

export const metadata = {
  title: "Townie Rewards",
  description: "Punch card and points at Burgertown Oak Street.",
}

export default function RewardsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <RewardsClub />
    </div>
  )
}
