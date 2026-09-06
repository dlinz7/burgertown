import { readFileSync } from "fs"
import { parse } from "yaml"
import { buildOpenApi } from "@/server/openapi"

type Step = {
  stepId?: string
  operationId?: string
  operationPath?: string
  workflowId?: string
  successCriteria?: unknown[]
}

type Workflow = {
  workflowId?: string
  steps?: Step[]
}

type ArazzoDoc = {
  arazzo?: string
  info?: { title?: string; version?: string }
  sourceDescriptions?: { name?: string; url?: string; type?: string }[]
  workflows?: Workflow[]
}

const REQUIRED_WORKFLOWS = [
  "payAtTable",
  "refundThenVoid",
  "orderThenKitchen",
  "localDiscountThenPay",
  "deliveryEndToEnd",
  "buildABurger",
  "rewardsRedeemThenPay",
  "deliveryFailedThenRefund",
  "guestDietaryFilter",
]

const PRESERVED_OPERATION_IDS = [
  "createFulfillment",
  "createCheck",
  "addItem",
  "sendOrder",
]

function fail(message: string): never {
  console.error(`validate:arazzo: ${message}`)
  process.exit(1)
}

const raw = readFileSync("arazzo.yaml", "utf8")
const doc = parse(raw) as ArazzoDoc

if (doc.arazzo !== "1.0.1") {
  fail(`expected arazzo: "1.0.1", got ${JSON.stringify(doc.arazzo)}`)
}
if (!doc.info?.title || !doc.info.version) {
  fail("info.title and info.version are required")
}
if (!Array.isArray(doc.sourceDescriptions) || doc.sourceDescriptions.length < 1) {
  fail("sourceDescriptions must have at least one entry")
}
const source = doc.sourceDescriptions[0]
if (!source.name || !source.url) {
  fail("sourceDescriptions[0] needs name and url")
}
if (source.type && source.type !== "openapi") {
  fail(`sourceDescriptions[0].type must be openapi, got ${source.type}`)
}
if (!Array.isArray(doc.workflows) || doc.workflows.length < 1) {
  fail("workflows must be a non-empty array")
}

const spec = buildOpenApi("http://127.0.0.1:43123") as {
  paths: Record<string, Record<string, { operationId?: string }>>
}
const operationIds = new Set<string>()
for (const methods of Object.values(spec.paths)) {
  for (const operation of Object.values(methods)) {
    if (operation?.operationId) operationIds.add(operation.operationId)
  }
}

const workflowIds = new Set<string>()
const usedOps = new Set<string>()

for (const workflow of doc.workflows) {
  if (!workflow.workflowId) fail("every workflow needs workflowId")
  if (workflowIds.has(workflow.workflowId)) {
    fail(`duplicate workflowId ${workflow.workflowId}`)
  }
  workflowIds.add(workflow.workflowId)
  if (!Array.isArray(workflow.steps) || workflow.steps.length < 1) {
    fail(`${workflow.workflowId} needs at least one step`)
  }
  const stepIds = new Set<string>()
  for (const step of workflow.steps) {
    if (!step.stepId) fail(`${workflow.workflowId} has a step without stepId`)
    if (stepIds.has(step.stepId)) {
      fail(`${workflow.workflowId} duplicate stepId ${step.stepId}`)
    }
    stepIds.add(step.stepId)
    const refs = [step.operationId, step.operationPath, step.workflowId].filter(Boolean)
    if (refs.length !== 1) {
      fail(`${workflow.workflowId}.${step.stepId} must set exactly one of operationId, operationPath, workflowId`)
    }
    if (step.operationId) {
      if (!operationIds.has(step.operationId)) {
        fail(`${workflow.workflowId}.${step.stepId} operationId ${step.operationId} is not in openapi.json`)
      }
      usedOps.add(step.operationId)
    }
    if (!Array.isArray(step.successCriteria) || step.successCriteria.length < 1) {
      fail(`${workflow.workflowId}.${step.stepId} needs successCriteria`)
    }
  }
  if (workflow.steps[0].operationId !== "resetSandbox") {
    fail(`${workflow.workflowId} must start with resetSandbox`)
  }
}

for (const id of REQUIRED_WORKFLOWS) {
  if (!workflowIds.has(id)) fail(`missing workflow ${id}`)
}

for (const id of PRESERVED_OPERATION_IDS) {
  if (!usedOps.has(id)) fail(`preserved operationId ${id} is not used in arazzo.yaml`)
}

if (!operationIds.has("createFulfillment") || !usedOps.has("addItem")) {
  fail("live pickup ids must stay createFulfillment / createCheck / addItem / sendOrder")
}

console.log(
  `validate:arazzo: ok (${doc.workflows.length} workflows, ${usedOps.size} operations, OpenAPI ${operationIds.size} operationIds)`
)
