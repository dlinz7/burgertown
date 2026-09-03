import { app } from "@/server/app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function handler(request: Request) {
  return app.fetch(request)
}
