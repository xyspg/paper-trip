// Client for the admin receipt scanner. Downscales the photo in-browser (camera
// shots are multi-MB; Gemini bills by pixels and the upload is faster small),
// posts it to the admin-gated worker, and exposes the pure split math the modal
// uses to turn per-dish assignments into per-traveler amounts.

export type ReceiptItem = {
  name: string
  quantity: number
  price: number
}

export type ParsedReceipt = {
  merchant: string
  currency: string
  items: ReceiptItem[]
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
}

// Longest edge we send upstream. Receipts stay legible well below the original
// camera resolution, so this trims tokens and upload time without hurting OCR.
const MAX_EDGE = 1600

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error("read failed"))
    r.readAsDataURL(file)
  })

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("decode failed"))
    img.src = src
  })

// Returns { data, mimeType } where data is raw base64 (no data: prefix), ready
// for Gemini's inline_data. Falls back to the original bytes if the canvas path
// fails (e.g. a format the browser can't draw).
async function prepareImage(file: File): Promise<{ data: string; mimeType: string }> {
  const dataUrl = await readAsDataUrl(file)
  try {
    const img = await loadImage(dataUrl)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no 2d context")
    ctx.drawImage(img, 0, 0, w, h)
    const out = canvas.toDataURL("image/jpeg", 0.82)
    return { data: out.split(",")[1] ?? "", mimeType: "image/jpeg" }
  } catch {
    return { data: dataUrl.split(",")[1] ?? "", mimeType: file.type || "image/jpeg" }
  }
}

export async function parseReceipt(file: File): Promise<ParsedReceipt> {
  const { data, mimeType } = await prepareImage(file)
  const res = await fetch("/api/receipt/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: data, mimeType }),
  })
  if (!res.ok) {
    if (res.status === 403) throw new Error("请先登录管理后台")
    throw new Error(`识别失败 (${res.status})`)
  }
  const json = (await res.json()) as ParsedReceipt
  if (!json.items?.length) throw new Error("没有从收据中识别到商品，请换一张更清晰的照片")
  return json
}

// ---- Split math (pure, unit-testable) ----

// Per-traveler amount derived from how each dish is assigned. Each item's price
// is divided equally among the travelers it is assigned to (an empty assignment
// falls back to everyone, so money is never silently dropped). Extras (tax + tip
// + any rounding gap to the receipt total) are spread proportionally to each
// traveler's item subtotal, or evenly when there are no items yet.
export function deriveShares(
  items: ReceiptItem[],
  assignments: string[][],
  travelerIds: string[],
  extra: number,
): Record<string, number> {
  const base: Record<string, number> = Object.fromEntries(travelerIds.map((id) => [id, 0]))
  items.forEach((it, i) => {
    const picked = assignments[i]?.filter((id) => travelerIds.includes(id)) ?? []
    const who = picked.length ? picked : travelerIds
    const each = it.price / who.length
    for (const id of who) base[id] += each
  })

  const baseSum = travelerIds.reduce((s, id) => s + base[id], 0)
  const out: Record<string, number> = {}
  for (const id of travelerIds) {
    const extraShare =
      baseSum > 0 ? (extra * base[id]) / baseSum : extra / (travelerIds.length || 1)
    out[id] = Math.round((base[id] + extraShare) * 100) / 100
  }
  return out
}
