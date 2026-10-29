import { NavLink } from 'react-router-dom'

// Phone navigation: Pantry, Recipes, a big scan button, Missing. (No Settings tab.)
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
      <NavLink to="/scan" className="bottom-nav__fab" aria-label="Scan barcode">
        <span aria-hidden="true">▣</span>
      </NavLink>
      <NavLink to="/missing" className={tab}>
        <span aria-hidden="true">🛒</span>
        Missing
      </NavLink>
    </nav>
  )
}
