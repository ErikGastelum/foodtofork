import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ComingSoon from './components/ComingSoon.jsx'
import Pantry from './pages/Pantry.jsx'
import Recipes from './pages/Recipes.jsx'
import Missing from './pages/Missing.jsx'
import Scan from './pages/Scan.jsx'
import AddItem from './pages/AddItem.jsx'

// Routes. Each page lives in src/pages/. Pages not built yet show a "coming soon" placeholder.
// To add a page: create it in src/pages/, swap its <ComingSoon> route below for the real page,
// and add a link in components/TopNav.jsx (desktop) and/or components/BottomNav.jsx (phone).
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Pantry />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/:id" element={<ComingSoon title="Recipe" message="This page is coming soon." />} />
        <Route path="missing" element={<Missing />} />
        <Route path="scan" element={<Scan />} />
        <Route path="add" element={<AddItem />} />
        <Route path="discover" element={<ComingSoon title="Discover" message="This page is coming soon." />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}
