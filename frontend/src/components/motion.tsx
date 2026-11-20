/** Pembungkus animasi kecil berbasis `motion` (mengikuti prefers-reduced-motion via MotionConfig). */
import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

/** Muncul naik + memudar saat terlihat di layar. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Muncul dengan pantulan kecil (untuk hasil, lencana, item). */
export function Pop({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
