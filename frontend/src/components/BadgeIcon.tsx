/** Ikon lencana sederhana (orisinal). Tingkat 0,1,2,... memberi warna berbeda. */
const TIERS = [
  { fill: '#dcebe2', ring: '#8bb9a0', star: '#146b68' },
  { fill: '#f8e9c4', ring: '#e8b64c', star: '#a8761a' },
  { fill: '#146b68', ring: '#e8b64c', star: '#f8e9c4' },
]

export default function BadgeIcon({ tier, earned, className }: { tier: number; earned: boolean; className?: string }) {
  const c = TIERS[Math.min(tier, TIERS.length - 1)]
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true" style={earned ? undefined : { filter: 'grayscale(1)', opacity: 0.45 }}>
      <path d="M14 34 8 54l8-4 6 6 4-18Z" fill={c.ring} />
      <path d="M34 34l6 20-8-4-6 6-4-18Z" fill={c.ring} />
      <circle cx="24" cy="22" r="19" fill={c.fill} stroke={c.ring} strokeWidth="4" />
      <path
        d="m24 11 3.4 7 7.6 1.1-5.5 5.3 1.3 7.6L24 28.4 17.2 32l1.3-7.6-5.5-5.3 7.6-1.1Z"
        fill={c.star}
      />
    </svg>
  )
}
