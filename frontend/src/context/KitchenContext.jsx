// Shared state: the user's inventory and grocery list.
// Guest-only for v1, so both live in the browser's localStorage (see README "Decisions").
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SAMPLE_INVENTORY } from '../data/mockData.js'

const KitchenContext = createContext(null)

const INVENTORY_KEY = 'foodtofork.inventory'
const GROCERY_KEY = 'foodtofork.grocery'

function load(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] // storage blocked or corrupted: start empty
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore: the app still works for this session */
  }
}

export const itemKey = (item) => item.barcode || item.name.toLowerCase()
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()

export function KitchenProvider({ children }) {
  const [inventory, setInventory] = useState(() => load(INVENTORY_KEY))
  const [groceryList, setGroceryList] = useState(() => load(GROCERY_KEY))

  useEffect(() => save(INVENTORY_KEY, inventory), [inventory])
  useEffect(() => save(GROCERY_KEY, groceryList), [groceryList])

  /** product: { barcode, name, brand, image, category } as returned by the API. */
  const addItem = useCallback((product) => {
    setInventory((prev) => (prev.some((i) => itemKey(i) === itemKey(product)) ? prev : [...prev, product]))
  }, [])

  const removeItem = useCallback((key) => {
    setInventory((prev) => prev.filter((i) => itemKey(i) !== key))
  }, [])

  const loadSample = useCallback(() => setInventory(SAMPLE_INVENTORY), [])

  const addToGrocery = useCallback((names) => {
    const list = Array.isArray(names) ? names : [names]
    setGroceryList((prev) => {
      const next = [...prev]
      list.forEach((n) => next.some((g) => sameName(g, n)) || next.push(n))
      return next
    })
  }, [])

  const removeFromGrocery = useCallback((name) => {
    setGroceryList((prev) => prev.filter((g) => !sameName(g, name)))
  }, [])

  const value = useMemo(
    () => ({
      inventory,
      inventoryNames: inventory.map((i) => i.name),
      groceryList,
      addItem,
      removeItem,
      loadSample,
      addToGrocery,
      removeFromGrocery,
    }),
    [inventory, groceryList, addItem, removeItem, loadSample, addToGrocery, removeFromGrocery],
  )

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
}

export function useKitchen() {
  const ctx = useContext(KitchenContext)
  if (!ctx) throw new Error('useKitchen must be used inside <KitchenProvider>')
  return ctx
}
