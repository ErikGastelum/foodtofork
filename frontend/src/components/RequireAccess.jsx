// Route guards (owner: Jonathan).
//
//   <RequireChoice>  first visit -> /welcome until they sign in, sign up or pick guest
//   <RequireAdmin>   admins only; everyone else is sent home
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function RequireChoice() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <p className="state-msg">Loading…</p>
  if (status === 'new') return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RequireAdmin() {
  const { status, isAdmin } = useAuth()
  if (status === 'loading') return <p className="state-msg">Loading…</p>
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
