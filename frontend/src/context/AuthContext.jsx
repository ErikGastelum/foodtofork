// Who is using the app: a signed-in account, a guest, or nobody yet (owner: Jonathan).
//
//   const { user, isGuest, isAdmin, login, signup, logout, continueAsGuest } = useAuth()
//
//   status: 'loading'  checking a saved session with the backend
//           'user'     signed in   (user = { id, username, first_name, last_name, role, created_at })
//           'guest'    picked "Continue as guest" (kitchen stays in this browser)
//           'new'      hasn't picked yet -> the app sends them to /welcome
//
// >>> MAIKA: everything here is plain functions + state; style the pages however you like.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError, setAuthToken } from '../api/client.js'
import { KEYS, readGuestKitchen, readJSON, writeJSON } from '../utils/storage.js'

const AuthContext = createContext(null)

function savedSession() {
  const token = readJSON(KEYS.token, null)
  const user = readJSON(KEYS.user, null)
  return token && user ? { token, user } : null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const s = savedSession()
    setAuthToken(s?.token) // before any child makes a request
    return s
  })
  const [guest, setGuest] = useState(() => readJSON(KEYS.guest, null) === '1')
  const [checking, setChecking] = useState(() => savedSession() !== null)
  const beforeSignOut = useRef(new Set()) // e.g. KitchenContext saving unsaved changes

  const startSession = useCallback(({ token, user }) => {
    setAuthToken(token)
    writeJSON(KEYS.token, token)
    writeJSON(KEYS.user, user)
    setSession({ token, user })
  }, [])

  const endSession = useCallback(() => {
    setAuthToken(null)
    writeJSON(KEYS.token, null)
    writeJSON(KEYS.user, null)
    setSession(null)
  }, [])

  // On load: is the saved session still good? (Expired, password reset by an admin,
  // or account deleted -> back to the welcome screen.)
  useEffect(() => {
    if (!checking) return undefined
    const controller = new AbortController()
    api
      .me({ signal: controller.signal })
      .then((user) => {
        writeJSON(KEYS.user, user)
        setSession((s) => (s ? { ...s, user } : s))
      })
      .catch((err) => {
        // Only a 401 means "signed out". If the server is just asleep/offline, stay signed in.
        if (err instanceof ApiError && err.status === 401) endSession()
      })
      .finally(() => !controller.signal.aborted && setChecking(false))
    return () => controller.abort()
  }, [checking, endSession])

  const login = useCallback(
    async (username, password) => {
      startSession(await api.login(username, password))
    },
    [startSession],
  )

  /** Creates the account and brings the guest's current kitchen along.
   *  form = { username, password, firstName, lastName } */
  const signup = useCallback(
    async (form) => {
      startSession(await api.signup({ ...form, kitchen: readGuestKitchen() }))
    },
    [startSession],
  )

  const logout = useCallback(async () => {
    for (const fn of beforeSignOut.current) {
      try {
        await fn()
      } catch {
        /* never block signing out */
      }
    }
    try {
      await api.logout()
    } catch {
      /* offline: still sign out on this device */
    }
    endSession()
  }, [endSession])

  const continueAsGuest = useCallback(() => {
    writeJSON(KEYS.guest, '1')
    setGuest(true)
  }, [])

  /** Update the stored user, e.g. after changing their name. */
  const updateUser = useCallback((user) => {
    writeJSON(KEYS.user, user)
    setSession((s) => (s ? { ...s, user } : s))
  }, [])

  /** For KitchenContext: run fn (and wait for it) before signing out. Returns an unregister function. */
  const onBeforeSignOut = useCallback((fn) => {
    beforeSignOut.current.add(fn)
    return () => beforeSignOut.current.delete(fn)
  }, [])

  const user = session?.user ?? null
  const status = checking ? 'loading' : user ? 'user' : guest ? 'guest' : 'new'

  const value = useMemo(
    () => ({
      status,
      user,
      isGuest: status === 'guest',
      isAdmin: user?.role === 'admin',
      login,
      signup,
      logout,
      continueAsGuest,
      updateUser,
      endSession, // sign out locally without calling the server (e.g. account was deleted)
      onBeforeSignOut,
    }),
    [status, user, login, signup, logout, continueAsGuest, updateUser, endSession, onBeforeSignOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
