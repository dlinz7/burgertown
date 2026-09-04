import { ApiExplorer } from "@/components/api-explorer"

export const metadata = {
  title: "APIs",
  description: "Thirty-five Burgertown APIs and how they connect.",
}

export default function ApisPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Specifications
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">35 APIs</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Floor, menu, fulfillment, kitchen, delivery, rewards, payments, and
        back-office. Import the OpenAPI document into Atlas from{" "}
        <a className="underline" href="/openapi.json">
          /openapi.json
        </a>
        . Each operation carries request schemas, seeded examples,{" "}
        <code className="text-xs">x-depends-on</code>, and typed error codes.
      </p>
      <p className="mt-3">
        <a
          href="/openapi.json"
          download="burgertown.openapi.json"
          className="text-sm underline"
        >
          Download burgertown.openapi.json
        </a>
      </p>
      <div className="mt-8">
        <ApiExplorer />
      </div>
    </div>
  )
}
