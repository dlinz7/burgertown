export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Burgertown POS · 412 Oak Street, Rivertown, OR</p>
        <p>In-memory sandbox. Reset with POST /v1/sandbox.</p>
      </div>
    </footer>
  )
}
