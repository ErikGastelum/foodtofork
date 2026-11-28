import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ComingSoon from './components/ComingSoon.jsx'
import Pantry from './pages/Pantry.jsx'
import Recipes from './pages/Recipes.jsx'
import RecipeDetail from './pages/RecipeDetail.jsx'
import Missing from './pages/Missing.jsx'
import Scan from './pages/Scan.jsx'
import AddItem from './pages/AddItem.jsx'
import Welcome from './pages/Welcome.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Account from './pages/Account.jsx'
import Admin from './pages/Admin.jsx'
import Shared from './pages/Shared.jsx'
import { RequireAdmin, RequireChoice } from './components/RequireAccess.jsx'

// Routes. Each page lives in src/pages/. Pages not built yet show a "coming soon" placeholder.
// To add a page: create it in src/pages/, swap its <ComingSoon> route below for the real page,
// and add a link in components/TopNav.jsx (desktop) and/or components/BottomNav.jsx (phone).
//
// Accounts (Jonathan): pages inside <RequireChoice> send first-time visitors to /welcome
// (sign in, sign up, or continue as guest). Welcome/sign-in pages, share links and recipe
// details stay open to everyone, so a family member opening a share link goes straight in.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Open to everyone */}
        <Route path="welcome" element={<Welcome />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="share/:shareId" element={<Shared />} />
        <Route path="recipes/:id" element={<RecipeDetail />} />

        {/* Signed in or guest */}
        <Route element={<RequireChoice />}>
          <Route index element={<Pantry />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="missing" element={<Missing />} />
          <Route path="scan" element={<Scan />} />
          <Route path="add" element={<AddItem />} />
          <Route path="account" element={<Account />} />
          <Route path="discover" element={<ComingSoon title="Discover" message="This page is coming soon." />} />

          {/* Admins only */}
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>

        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}
