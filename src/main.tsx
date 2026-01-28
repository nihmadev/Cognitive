import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { setupMonacoEnvironment } from './lib/monaco-env'

// Setup Monaco Environment before rendering
try {
  setupMonacoEnvironment();
} catch (e) {
  // Failed to setup Monaco environment
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  // Root element not found
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}