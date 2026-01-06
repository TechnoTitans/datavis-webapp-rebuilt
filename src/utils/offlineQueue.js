const DB_NAME = 'dataviswa'
const DB_VERSION = 1
const STORE_NAME = 'offline_ops'

const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('dedupeKey', 'dedupeKey', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

const withStore = async (mode, fn) => {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const result = await fn(store)
    await txDone(tx)
    return result
  } finally {
    db.close()
  }
}

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const nowIso = () => new Date().toISOString()

const notifyQueueChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('offline-queue-changed'))
}

export const getPendingOpsCount = async () => {
  return await withStore('readonly', async (store) => {
    const index = store.index('status')
    const keyRange = IDBKeyRange.only('pending')
    const request = index.count(keyRange)
    return await requestToPromise(request)
  })
}

export const listPendingOps = async () => {
  return await withStore('readonly', async (store) => {
    const index = store.index('status')
    const keyRange = IDBKeyRange.only('pending')
    const request = index.getAll(keyRange)
    const ops = await requestToPromise(request)
    ops.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    return ops
  })
}

export const enqueueOp = async ({ type, payload, dedupeKey }) => {
  const op = {
    type,
    payload,
    dedupeKey: dedupeKey || null,
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  const id = await withStore('readwrite', async (store) => {
    if (op.dedupeKey) {
      const index = store.index('dedupeKey')
      const existing = await requestToPromise(index.getAll(op.dedupeKey))
      for (const row of existing) {
        if (row?.status === 'pending') {
          store.delete(row.id)
        }
      }
    }

    const request = store.add(op)
    return await requestToPromise(request)
  })

  notifyQueueChanged()
  return id
}

export const updateOp = async (id, patch) => {
  const updated = await withStore('readwrite', async (store) => {
    const current = await requestToPromise(store.get(id))
    if (!current) return null
    const next = { ...current, ...patch, updatedAt: nowIso() }
    await requestToPromise(store.put(next))
    return next
  })

  notifyQueueChanged()
  return updated
}

export const deleteOp = async (id) => {
  await withStore('readwrite', async (store) => {
    store.delete(id)
  })
  notifyQueueChanged()
}

export const clearOfflineQueue = async () => {
  await withStore('readwrite', async (store) => {
    store.clear()
  })
  notifyQueueChanged()
}
