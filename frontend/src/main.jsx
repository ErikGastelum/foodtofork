import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { KitchenProvider } from './context/KitchenContext.jsx'
import './styles/theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KitchenProvider>
      <App />
    </KitchenProvider>
  </StrictMode>,
)
