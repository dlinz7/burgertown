export const runtime = "nodejs"

export async function POST(request: Request) {
  const input = await request.json().catch(() => null)
  if (typeof input?.item_id !== "string" || !input.item_id.trim()) {
    return Response.json(
      { error: { code: "invalid_item_id", message: "An order item_id is required." } },
      { status: 400 }
    )
  }
  if (typeof input.order_id !== "string" || !input.order_id.trim() || input.order_id.length > 255) {
    return Response.json(
      { error: { code: "invalid_order_id", message: "An order_id is required." } },
      { status: 400 }
    )
  }
  let response: Response
  try {
    response = await fetch(process.env.ATLAS_INGEST_URL ?? "http://localhost:4300/ingest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ATLAS_INGEST_TOKEN ?? "local-ingest-caller-token"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflowName: "demo",
        idempotencyKey: input.order_id,
        payload: {
          order_id: input.order_id,
          item_id: input.item_id.trim(),
          server_id: "emp_jon",
          location_id: "loc_oak",
        },
      }),
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
      redirect: "error",
    })
  } catch {
    return Response.json(
      { error: { code: "atlas_unreachable", message: "Could not reach Atlas. Check that it is running. If the request timed out, check Atlas before submitting again." } },
      { status: 502 }
    )
  }

  const body = await response.json().catch(() => null)
  const headers = new Headers({ "Cache-Control": "no-store" })
  for (const name of ["x-atlas-command-id", "x-atlas-idempotency-key"]) {
    const value = response.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!response.ok) {
    const reason = typeof body?.error === "string" ? `: ${body.error}` : ""
    const message = body?.error === "ambiguous-workflow-name"
      ? 'More than one Atlas workflow is named "demo". Give the workflows unique names before submitting again.'
      : `Atlas could not complete the request (${response.status})${reason}.`
    return Response.json(
      { error: { code: "atlas_rejected", message, details: body } },
      { status: response.status, headers }
    )
  }
  if (response.status !== 200 || !body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: { code: "atlas_invalid_response", message: "Atlas returned an unexpected response. Check Atlas before submitting again." } },
      { status: 502, headers }
    )
  }
  return Response.json(body, { headers })
}
