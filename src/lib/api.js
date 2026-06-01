// Mock API layer
// GET: fetch from /mock/{resource}.json, cached in memory
// POST / PUT / remove / mutate: in-memory only (simulates backend)

const BASE = import.meta.env.BASE_URL
const store = {}

async function ensure(resource) {
  if (resource in store) return
  const res = await fetch(`${BASE}mock/${resource}.json`)
  if (!res.ok) throw new Error(`[api] Cannot load /mock/${resource}.json (${res.status})`)
  store[resource] = await res.json()
}

function clone(v) { return JSON.parse(JSON.stringify(v)) }

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export const api = {
  // Read — returns deep clone so callers can't mutate the store
  async get(resource, filter = {}) {
    await ensure(resource)
    const data = store[resource]
    if (!Array.isArray(data)) return clone(data)
    const keys = Object.keys(filter)
    if (!keys.length) return clone(data)
    return clone(data.filter(item => keys.every(k => item[k] === filter[k])))
  },

  // Create — auto-generates id if not supplied
  async post(resource, body) {
    await ensure(resource)
    const item = { ...body, id: body.id ?? uid() }
    store[resource].push(item)
    return clone(item)
  },

  // Update — merges body into existing item
  async put(resource, id, body) {
    await ensure(resource)
    const idx = store[resource].findIndex(i => i.id === id)
    if (idx === -1) throw new Error(`[api] ${resource}/${id} not found`)
    store[resource][idx] = { ...store[resource][idx], ...body }
    return clone(store[resource][idx])
  },

  // Delete — returns the removed item
  async remove(resource, id) {
    await ensure(resource)
    const item = store[resource].find(i => i.id === id)
    store[resource] = store[resource].filter(i => i.id !== id)
    return item ? clone(item) : null
  },

  // Mutate — direct access to store for complex operations
  // updater receives the raw store value and can modify it in-place
  async mutate(resource, updater) {
    await ensure(resource)
    updater(store[resource])
    return clone(store[resource])
  }
}
