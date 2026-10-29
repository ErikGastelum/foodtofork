import { Outlet } from 'react-router-dom'
import TopNav from './TopNav.jsx'
import BottomNav from './BottomNav.jsx'
import '../styles/layout.css'

// The app shell. One codebase, two navigations:
//   - under 768px: bottom tab bar (BottomNav)
//   - 768px and up: top bar (TopNav)
// CSS decides which one shows (see styles/layout.css), so there is no JS resize logic.
export default function Layout() {
  return (
    <div className="app">
      <TopNav />
      <main className="app__main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
