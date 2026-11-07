import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  const container = document.getElementById('root')
  if (container) {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
} catch (err) {
  console.error('Error inicializando React:', err)
  const container = document.getElementById('root')
  if (container) {
    container.innerHTML = `
      <div style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 20px; background: #fefcf5; color: #2d2d2d;">
        <h1 style="font-size: 3rem; color: #e85d75; margin-bottom: 1rem;">💕 Nuestra Historia</h1>
        <p style="font-size: 1.2rem; margin-bottom: 2rem;">La página está cargando...</p>
        <button onclick="location.reload()" style="padding: 12px 24px; font-size: 1rem; background: #e85d75; color: white; border: none; border-radius: 50px; cursor: pointer;">
          Recargar página
        </button>
      </div>
    `
  }
}