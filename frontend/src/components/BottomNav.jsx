import { NavLink } from 'react-router-dom'

// Phone navigation: Pantry, Recipes, Missing. (No Settings tab.)
// Scan and Add manually live at the top of the Pantry page.
const tab = ({ isActive }) => 'bottom-nav__link' + (isActive ? ' is-active' : '')

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <NavLink to="/" end className={tab}>
        <span aria-hidden="true">🥫</span>
        Pantry
      </NavLink>
      <NavLink to="/recipes" className={tab}>
        <span aria-hidden="true">📖</span>
        Recipes
      </NavLink>
      <NavLink to="/missing" className={tab}>
        <span aria-hidden="true">🛒</span>
        Missing
      </NavLink>
    </nav>
  )
}
