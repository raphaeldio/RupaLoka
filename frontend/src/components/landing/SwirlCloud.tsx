/** Ornamen awan berpilin (motif dekoratif bebas, digambar sendiri). */
export default function SwirlCloud({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <path d="M20 100c-12 0-16-16-4-21 2-18 26-22 34-8 6-20 38-22 44 0 8-26 52-24 54 4 18-6 34 8 26 25" />
        <path d="M44 79c0-10 12-14 18-7s-2 15-8 11" />
        <path d="M100 74c0-12 15-17 22-8s-2 18-10 13" />
        <path d="M160 92c0-8 10-11 14-5s-1 12-6 9" />
        <path d="M30 112h160" opacity=".5" />
      </g>
    </svg>
  )
}
