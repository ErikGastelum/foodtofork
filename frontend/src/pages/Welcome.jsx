import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/account.css'

// First screen for new visitors: sign in, create an account, or continue as a guest.
// >>> MAIKA: skeleton only (Jonathan). Restyle freely; keep the three actions.
export default function Welcome() {
  const { status, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'

  if (status === 'user') return <Navigate to={from} replace />

  return (
    <>
      <PageHeader title="Welcome to FoodToFork" subtitle="Cook with what you already have" />
      <div className="page account-page">
        <div className="card account-card">
          <p>Make an account to keep your pantry and saved recipes on any device, and share them with family.</p>
          <Link className="btn btn--primary btn--block" to="/signup" state={{ from }}>
            Create an account
          </Link>
          <Link className="btn btn--outline btn--block" to="/login" state={{ from }}>
            Sign in
          </Link>
          <button
            type="button"
            className="btn btn--sun btn--block"
            onClick={() => {
              continueAsGuest()
              navigate(from, { replace: true })
            }}
          >
            Continue as guest
          </button>
          <p className="account-note">As a guest, your kitchen is saved in this browser only.</p>
        </div>
      </div>
    </>
  )
}
