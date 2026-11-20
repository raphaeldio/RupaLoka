import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import './index.css'
import { demoEnabled } from './lib/demo'

// Simpan flag mode uji (?demo=1 / ?demo=0) dari URL awal, di halaman mana pun.
demoEnabled(window.location.search)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": animasi motion mengikuti prefers-reduced-motion */}
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={200}>
        <App />
        <Toaster position="top-center" richColors closeButton />
      </TooltipProvider>
    </MotionConfig>
  </StrictMode>,
)
