import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/google-sans-flex'
import '@fontsource-variable/google-sans-code'
import '@studiolxd/brand/brand.css'
import { ScormProvider } from '@studiolxd/scorm/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScormProvider version="1.2" options={{ noLmsBehavior: 'mock' }}>
      <App />
    </ScormProvider>
  </StrictMode>,
)
