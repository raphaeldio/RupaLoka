import { motion } from 'motion/react'
import type { City } from '../lib/cities'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

/**
 * Dialog "Yakin ke kota ini?" sebelum terbang ke kota (shadcn/ui AlertDialog: fokus terkunci,
 * Escape/Batal menutup, fokus awal di tombol Batal sesuai pola alert dialog).
 */
export default function TravelConfirm({ city, onYes, onNo }: { city: City; onYes: () => void; onNo: () => void }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onNo()}>
      <AlertDialogContent className="z-[1001] max-w-xs rounded-3xl border-garis p-6 text-center sm:max-w-sm">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <motion.svg
            viewBox="0 0 48 48"
            className="size-14"
            aria-hidden="true"
            initial={{ y: -14, scale: 0.6, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.05 }}
          >
            <circle cx="24" cy="24" r="22" fill="#e3efec" />
            <path d="M24 37s9-8.3 9-15.3a9 9 0 1 0-18 0C15 28.7 24 37 24 37Z" fill="#146b68" />
            <circle cx="24" cy="21.5" r="3.4" fill="#e8b64c" />
          </motion.svg>
          <AlertDialogTitle className="text-xl font-black text-teal-800">Yakin ke {city.name}?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-redup">
            Kita akan terbang ke {city.name}
            {city.province ? `, ${city.province}` : ''} dan memulai path belajarnya.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onYes}>Ya, berangkat!</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
