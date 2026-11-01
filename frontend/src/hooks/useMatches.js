// inventory names -> ranked recipes (calls matchRecipes in api/recipes.js and tracks loading/error).
import { useEffect, useState } from 'react'
import { matchRecipes } from '../api/recipes.js'

export function useMatches(inventoryNames) {
  const [state, setState] = useState({ recipes: [], loading: true, error: null })
  const key = inventoryNames.join('|')

  useEffect(() => {
    if (inventoryNames.length === 0) {
      setState({ recipes: [], loading: false, error: null })
      return undefined
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    matchRecipes(inventoryNames)
      .then((recipes) => !cancelled && setState({ recipes, loading: false, error: null }))
      .catch((error) => !cancelled && setState({ recipes: [], loading: false, error }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
