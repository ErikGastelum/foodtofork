import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/account.css'
import '../styles/accountUi.css'

// First screen for new visitors: create an account, sign in, or continue as a guest.
// Phone: green header + one card. Desktop (768px+): two columns, a short intro on the left
// and the "Get started" card on the right.
export default function Welcome() {
  const { status, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'

  if (status === 'user') return <Navigate to={from} replace />

  return (
    <>
      <PageHeader title="Welcome to FoodToFork" subtitle="Cook with what you already have" desktop="hide" />
      <div className="page account-page welcome">
        <div className="welcome__intro desktop-only">
          <span className="welcome__pill">Cook with what you already have</span>
          <h1>Welcome to FoodToFork</h1>
          <ul className="welcome__list">
            <li>
              <span aria-hidden="true">🥫</span> Scan or add what's in your pantry
            </li>
            <li>
              <span aria-hidden="true">🍳</span> See recipes you can make right now
            </li>
            <li>
              <span aria-hidden="true">🛒</span> Share a grocery list with family
            </li>
          </ul>
        </div>

        <div className="card account-card welcome__card">
          <h2>Get started</h2>
          <p className="account-note">Keep your pantry and saved recipes on any device.</p>
          <Link className="btn btn--primary btn--block" to="/signup" state={{ from }}>
            Create an account
          </Link>
          <Link className="btn btn--outline btn--block" to="/login" state={{ from }}>
            Sign in
          </Link>
          <p className="welcome__or">
            or{' '}
            <button
              type="button"
              className="welcome__guest"
              onClick={() => {
                continueAsGuest()
                navigate(from, { replace: true })
              }}
            >
              continue as guest
            </button>
          </p>
          <p className="account-note welcome__note">Guests are saved in this browser only.</p>
        </div>
      </div>
    </>
  )
}
