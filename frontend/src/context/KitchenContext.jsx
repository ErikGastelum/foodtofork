// Shared state: the user's inventory, grocery list and saved recipes.
//
// Where it's kept depends on who is using the app (see AuthContext):
//   - guest:     this browser's localStorage, exactly like v1
//   - signed in: the backend (GET/PUT /me/kitchen), so it follows the account to any device
// Pages don't need to care: they call addItem(), toggleSaved() etc. the same way either way.
//
// syncStatus (for a small "Saved ✓" indicator, if Maika wants one):
//   'local' guest | 'loading' fetching the account's kitchen | 'saving' | 'saved' | 'error'
// kitchenLoading: true while a signed-in user's kitchen is still on its way.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { SAMPLE_INVENTORY } from '../data/mockData.js'
import { KEYS, readList, writeJSON } from '../utils/storage.js'
import { useAuth } from './AuthContext.jsx'

const KitchenContext = createContext(null)
const SAVE_DELAY = 500 // ms after the last change before saving to the account

export const itemKey = (item) => item.barcode || item.name.toLowerCase()
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()

export function KitchenProvider({ children }) {
  const { user, onBeforeSignOut } = useAuth()
  const owner = user?.id ?? 'guest' // whose kitchen should be on screen

  const [inventory, setInventory] = useState(() => (owner === 'guest' ? readList(KEYS.inventory) : []))
  const [groceryList, setGroceryList] = useState(() => (owner === 'guest' ? readList(KEYS.grocery) : []))
  const [savedRecipes, setSavedRecipes] = useState(() => (owner === 'guest' ? readList(KEYS.saved) : []))
  // Whose data is in the three states above right now. Saving only happens when this matches
  // `owner`, so one person's kitchen can never be written into someone else's storage.
  const [dataOwner, setDataOwner] = useState(owner === 'guest' ? 'guest' : 'loading')
  const [syncStatus, setSyncStatus] = useState(owner === 'guest' ? 'local' : 'loading')

  const lastOwnerSeen = useRef(dataOwner) // to skip saving straight back what we just loaded
  const pending = useRef(null) // { timer, run } for the next account save

  const flush = useCallback(async () => {
    const p = pending.current
    if (!p) return
    clearTimeout(p.timer)
    pending.current = null
    await p.run()
  }, [])

  // 1. Whenever the owner changes (sign in, sign out, switch account), load their kitchen.
  useEffect(() => {
    if (owner === 'guest') {
      setInventory(readList(KEYS.inventory))
      setGroceryList(readList(KEYS.grocery))
      setSavedRecipes(readList(KEYS.saved))
      setDataOwner('guest')
      setSyncStatus('local')
      return undefined
    }
    let cancelled = false
    setInventory([])
    setGroceryList([])
    setSavedRecipes([])
    setDataOwner('loading')
    setSyncStatus('loading')
    api
      .getKitchen()
      .then((k) => {
        if (cancelled) return
        setInventory(k.inventory)
        setGroceryList(k.grocery_list)
        setSavedRecipes(k.saved_recipes)
        setDataOwner(owner)
        setSyncStatus('saved')
      })
      .catch(() => !cancelled && setSyncStatus('error'))
    return () => {
      cancelled = true
      clearTimeout(pending.current?.timer) // signing out already flushed (see 3.)
      pending.current = null
    }
  }, [owner])

  // 2. Whenever the kitchen changes, save it to the right place.
  useEffect(() => {
    if (dataOwner !== owner) return // still loading, or mid-switch
    if (lastOwnerSeen.current !== dataOwner) {
      lastOwnerSeen.current = dataOwner // just loaded: nothing new to save
      return
    }
    if (owner === 'guest') {
      writeJSON(KEYS.inventory, inventory)
      writeJSON(KEYS.grocery, groceryList)
      writeJSON(KEYS.saved, savedRecipes)
      return
    }
    const kitchen = { inventory, grocery_list: groceryList, saved_recipes: savedRecipes }
    const run = (opts) => {
      setSyncStatus('saving')
      return api
        .saveKitchen(kitchen, opts)
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('error'))
    }
    clearTimeout(pending.current?.timer)
    pending.current = { run, timer: setTimeout(() => flush(), SAVE_DELAY) }
  }, [inventory, groceryList, savedRecipes, dataOwner, owner, flush])

  // 3. Don't lose the last change: save before signing out, and when the tab closes.
  useEffect(() => onBeforeSignOut(flush), [onBeforeSignOut, flush])
  useEffect(() => {
    const onHide = () => {
      const p = pending.current
      if (!p) return
      clearTimeout(p.timer)
      pending.current = null
      p.run({ keepalive: true })
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

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

  /** recipe: anything with { id, name, thumbnail } (a match result or a full recipe). */
  const toggleSaved = useCallback((recipe) => {
    setSavedRecipes((prev) =>
      prev.some((r) => r.id === recipe.id)
        ? prev.filter((r) => r.id !== recipe.id)
        : [...prev, { id: recipe.id, name: recipe.name, thumbnail: recipe.thumbnail ?? null }],
    )
  }, [])

  const isSaved = useCallback((id) => savedRecipes.some((r) => r.id === id), [savedRecipes])

  const value = useMemo(
    () => ({
      inventory,
      inventoryNames: inventory.map((i) => i.name),
      groceryList,
      savedRecipes,
      syncStatus,
      kitchenLoading: dataOwner !== owner,
      addItem,
      removeItem,
      loadSample,
      addToGrocery,
      removeFromGrocery,
      toggleSaved,
      isSaved,
    }),
    [inventory, groceryList, savedRecipes, syncStatus, addItem, removeItem, loadSample, addToGrocery, removeFromGrocery, toggleSaved, isSaved],
  )

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
}

export function useKitchen() {
  const ctx = useContext(KitchenContext)
  if (!ctx) throw new Error('useKitchen must be used inside <KitchenProvider>')
  return ctx
}
