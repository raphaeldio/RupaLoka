import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SpotlightCard from '../reactbits/SpotlightCard'
import { useReveal } from '../../lib/useReveal'

const IconBuku = (
  <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
    <path
      d="M6 18c10-4 18-3 26 3v34c-8-6-16-7-26-3z"
      fill="#f5f1e8"
      stroke="#146b68"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M58 18c-10-4-18-3-26 3v34c8-6 16-7 26-3z"
      fill="#fff"
      stroke="#146b68"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M12 27c6-1 10 0 14 2m-14 6c6-1 10 0 14 2m12-8c4-2 8-3 14-2m-14 8c4-2 8-3 14-2"
      stroke="#8bb9a0"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M44 6v14l4-3 4 3V6" fill="#e8b64c" />
  </svg>
)
const IconGim = (
  <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
    <path
      d="M14 20h36a10 10 0 0 1 10 10l2 14a7 7 0 0 1-12 5l-6-7H20l-6 7a7 7 0 0 1-12-5l2-14a10 10 0 0 1 10-10z"
      fill="#146b68"
    />
    <path d="M18 28v10m-5-5h10" stroke="#f5f1e8" strokeWidth="3" strokeLinecap="round" />
    <circle cx="44" cy="29" r="3" fill="#e8b64c" />
    <circle cx="50" cy="35" r="3" fill="#8bb9a0" />
    <path d="M30 10l2-4 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3z" fill="#e8b64c" />
  </svg>
)
const IconPiala = (
  <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
    <path d="M20 8h24v14a12 12 0 0 1-24 0z" fill="#e8b64c" />
    <path d="M20 12h-7v4a8 8 0 0 0 8 8m23-12h7v4a8 8 0 0 1-8 8" fill="none" stroke="#e8b64c" strokeWidth="3" />
    <path d="M28 34h8v8h-8z" fill="#c99a33" />
    <rect x="20" y="42" width="24" height="8" rx="2" fill="#146b68" />
    <path
      d="M27 14l3 6 5-8"
      fill="none"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity=".8"
    />
    <path
      d="M10 56c4-10 4-16 0-22m44 22c-4-10-4-16 0-22"
      fill="none"
      stroke="#8bb9a0"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
)

const FEATURES: {
  title: string
  text: string
  to: string
  icon: ReactNode
  tone: string
}[] = [
  {
    title: 'Belajar Budaya',
    text: 'Kartu materi singkat tentang kesenian dan tradisi, lengkap dengan sumbernya.',
    to: '/kota/bandung',
    icon: IconBuku,
    tone: 'bg-teal-50',
  },
  {
    title: 'Tantangan Seru',
    text: 'Uji pengetahuanmu lewat kuis, lalu berlari keliling kota dalam game.',
    to: '/kota/bandung',
    icon: IconGim,
    tone: 'bg-daun-100',
  },
  {
    title: 'Koleksi Budaya',
    text: 'Buka item budaya tiap kelipatan 1.000 poin dan lengkapi koleksimu.',
    to: '/koleksi',
    icon: IconPiala,
    tone: 'bg-emas-100',
  },
]

export default function FeatureCards() {
  const [ref, shown] = useReveal<HTMLUListElement>()
  return (
    <ul ref={ref} className="grid gap-4 md:grid-cols-3" aria-label="Yang bisa kamu lakukan">
      {FEATURES.map((f, i) => (
        <li key={f.title} className="reveal" data-shown={shown} style={{ transitionDelay: `${i * 110}ms` }}>
          <SpotlightCard
            theme="light"
            spotlightColor="#e8b64c"
            intensity={0.25}
            borderGlow={0.9}
            className="h-full !p-0 shadow-kartu transition duration-300 hover:-translate-y-1 hover:shadow-melayang"
          >
          <Link
            to={f.to}
            className="group relative z-[2] flex h-full items-center gap-4 rounded-3xl p-4 sm:p-5"
          >
            <span
              className={`grid size-20 shrink-0 place-items-center rounded-2xl p-3 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 ${f.tone}`}
            >
              {f.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold text-teal">{f.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-redup">{f.text}</span>
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal text-white transition duration-300 group-hover:bg-emas group-hover:text-teal-800">
              <svg
                viewBox="0 0 16 16"
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
          </SpotlightCard>
        </li>
      ))}
    </ul>
  )
}
