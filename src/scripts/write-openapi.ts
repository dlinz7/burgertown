import { writeFileSync } from "fs"
import { buildOpenApi } from "@/server/openapi"
import { atlasDemoOpenApi } from "@/server/atlas-demo"

const spec = atlasDemoOpenApi(buildOpenApi("http://127.0.0.1:43123"))
const json = `${JSON.stringify(spec, null, 2)}\n`
writeFileSync("openapi.json", json)
const pathCount = Object.keys(spec.paths as object).length
console.log(`Wrote openapi.json (${pathCount} paths, ${Object.keys((spec.components as { schemas: object }).schemas).length} schemas)`)
