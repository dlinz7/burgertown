import { ApiExplorer } from "@/components/api-explorer"

export const metadata = {
  title: "APIs",
  description: "Twenty-five Burgertown APIs and how they connect.",
}

export default function ApisPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Specifications
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">25 APIs</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Floor, menu, tickets, kitchen, payments, and back-office. Each API names
        the others it reads or writes. Machine-readable copy is at{" "}
        <a className="underline" href="/openapi.json">
          /openapi.json
        </a>
        .
      </p>
      <div className="mt-8">
        <ApiExplorer />
      </div>
    </div>
  )
}
