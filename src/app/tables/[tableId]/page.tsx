import { TableVisit } from "@/components/restaurant"

export default async function TablePage({
  params,
}: {
  params: Promise<{ tableId: string }>
}) {
  const { tableId } = await params
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <TableVisit key={tableId} tableId={tableId} />
    </div>
  )
}
