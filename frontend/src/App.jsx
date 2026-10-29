import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ComingSoon from './components/ComingSoon.jsx'
import Recipes from './pages/Recipes.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ComingSoon title="Pantry" message="This page is coming soon." />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/:id" element={<ComingSoon title="Recipe" message="This page is coming soon." />} />
        <Route path="missing" element={<ComingSoon title="Missing supplies" message="This page is coming soon." />} />
        <Route path="scan" element={<ComingSoon title="Scan a barcode" message="This page is coming soon." />} />
        <Route path="add" element={<ComingSoon title="Add an item" message="This page is coming soon." />} />
        <Route path="discover" element={<ComingSoon title="Discover" message="This page is coming soon." />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}
