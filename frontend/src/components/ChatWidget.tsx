import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useAgent } from '../lib/agentStore'
import AgentPanel, { AGENT_NAME } from './AgentPanel'
import Mascot from './Mascot'
import Magnet from './reactbits/Magnet'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/**
 * Chatbot melayang: tombol maskot di pojok kanan bawah membuka panel chat. Panel tetap
 * terpasang saat ditutup agar riwayat percakapan tidak hilang. Skrip baru saat panel
 * tertutup tampil sebagai gelembung singkat di samping maskot.
 */
export default function ChatWidget({ cityId }: { cityId: string }) {
  const open = useAgent((s) => s.open)
  const unread = useAgent((s) => s.unread)
  const mood = useAgent((s) => s.mood)
  const scripts = useAgent((s) => s.scripts)
  const setOpen = useAgent((s) => s.setOpen)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [teaser, setTeaser] = useState<{ id: number; text: string } | null>(null)

  const latest = scripts.at(-1)
  useEffect(() => {
    if (!latest || open) return
    const show = window.setTimeout(() => setTeaser(latest), 0)
    const hide = window.setTimeout(() => setTeaser((t) => (t?.id === latest.id ? null : t)), 7000)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [latest, open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // close stabil secara perilaku; cukup dipasang ulang saat open berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <motion.div
        id="chat-pemandu"
        hidden={!open}
        initial={false}
        animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ transformOrigin: 'bottom right' }}
        className="fixed inset-x-3 bottom-24 z-[60] h-[min(560px,calc(100dvh-8rem))] sm:inset-x-auto sm:right-6 sm:w-[380px]"
      >
        <AgentPanel cityId={cityId} onClose={close} />
      </motion.div>

      <div className="fixed bottom-4 right-4 z-[60] flex items-end gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {teaser && !open && (
            <motion.button
              key={teaser.id}
              initial={{ opacity: 0, x: 16, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              type="button"
              onClick={() => {
                setTeaser(null)
                setOpen(true)
              }}
              className="mb-3 max-w-[240px] rounded-2xl rounded-br-md border border-garis bg-white px-3 py-2 text-left text-xs leading-snug shadow-kartu"
            >
              {teaser.text}
            </motion.button>
          )}
        </AnimatePresence>
        <Magnet padding={60} magnetStrength={4}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls="chat-pemandu"
                aria-label={open ? `Tutup chat ${AGENT_NAME}` : `Buka chat ${AGENT_NAME}${unread ? ` (${unread} pesan baru)` : ''}`}
                className="relative grid size-16 place-items-center rounded-full bg-white shadow-melayang ring-2 ring-teal/15 transition hover:scale-105 active:scale-95"
              >
                <Mascot mood={mood} className="size-14" />
                {unread > 0 && !open && (
                  <motion.span
                    key={unread}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                    className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-emas px-1 text-[11px] font-extrabold text-tinta"
                  >
                    {unread}
                  </motion.span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{open ? 'Tutup chat' : `Tanya ${AGENT_NAME}`}</TooltipContent>
          </Tooltip>
        </Magnet>
      </div>
    </>
  )
}
