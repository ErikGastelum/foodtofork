import { NavLink } from 'react-router-dom'

// Desktop navigation. "Account" (Jonathan) shows sign in / sign up for guests.
// >>> To add a page later, add one entry here (and one in BottomNav if it belongs on mobile).
const LINKS = [
  { to: '/', label: 'My Kitchen', end: true },
  { to: '/recipes', label: 'Recipes' },
  { to: '/missing', label: 'Missing' },
  { to: '/account', label: 'Account' },
]

export default function TopNav() {
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
    </header>
  )
}
