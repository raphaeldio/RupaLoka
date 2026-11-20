import { toast } from 'sonner'
import type { Badge } from './api.types'

/** Umumkan lencana baru lewat toast (sekali per lencana). */
export function celebrateBadges(badges: Badge[]): void {
  for (const b of badges) {
    toast.success(`Lencana baru: ${b.name}`, { description: b.description, id: `lencana-${b.id}` })
  }
}
