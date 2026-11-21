import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { initialsOf } from '../utils/initials.js'
import '../styles/accountUi.css'

// Desktop navigation. Account lives at the top right (like the mockup):
//   signed out / guest -> yellow "Sign in" pill
//   signed in          -> avatar + first name, links to /account
// >>> To add a page later, add one entry here (and one in BottomNav if it belongs on mobile).
const LINKS = [
  { to: '/', label: 'My Kitchen', end: true },
  { to: '/recipes', label: 'Recipes' },
  { to: '/missing', label: 'Missing' },
]

export default function TopNav() {
  const { user } = useAuth()

  return (
    <header className="top-nav">
      <NavLink to="/" className="top-nav__brand" aria-label="FoodToFork home">
        <span aria-hidden="true">🍴</span> FoodToFork
      </NavLink>
      <nav aria-label="Main" className="top-nav__links">
        {LINKS.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => 'top-nav__link' + (isActive ? ' is-active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      {user ? (
        <NavLink to="/account" className={({ isActive }) => 'top-nav__me' + (isActive ? ' is-active' : '')} aria-label="Your account">
          <span className="top-nav__avatar" aria-hidden="true">
            {initialsOf(user)}
          </span>
          <span>{user.first_name || user.username}</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className="top-nav__signin">
          Sign in
        </NavLink>
      )}
    </header>
  )
}
