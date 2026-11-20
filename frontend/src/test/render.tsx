import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { TooltipProvider } from '../components/ui/tooltip'

/** render() dengan provider global yang sama seperti main.tsx. */
export function renderApp(ui: ReactElement, options?: RenderOptions) {
  return render(<TooltipProvider>{ui}</TooltipProvider>, options)
}
