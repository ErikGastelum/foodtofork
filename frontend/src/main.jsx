import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { KitchenProvider } from './context/KitchenContext.jsx'
import './styles/theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <KitchenProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </KitchenProvider>
    </AuthProvider>
  </StrictMode>,
)
