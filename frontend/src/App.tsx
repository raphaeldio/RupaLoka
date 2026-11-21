import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SiteFooter from './components/SiteFooter'
import SiteHeader from './components/SiteHeader'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'

// Halaman kota (path, titik, game) dimuat terpisah agar beranda lebih ringan.
const CityLayout = lazy(() => import('./pages/city/CityLayout'))
const PathPage = lazy(() => import('./pages/city/PathPage'))
const NodePage = lazy(() => import('./pages/city/NodePage'))
const GamePage = lazy(() => import('./pages/city/GamePage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'))

const loading = (
  <main id="konten" className="mx-auto max-w-2xl px-4 py-20 text-center" aria-busy="true">
    <p className="text-lg font-bold text-teal motion-safe:animate-pulse">Memuat…</p>
  </main>
)

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <Suspense fallback={loading}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/kota/:cityId" element={<CityLayout />}>
              <Route index element={<PathPage />} />
              <Route path="titik/:lessonId" element={<NodePage />} />
              <Route path="game" element={<GamePage />} />
            </Route>
            <Route path="/koleksi" element={<CollectionPage />} />
            <Route path="/tentang" element={<AboutPage />} />
            <Route path="/sumber" element={<SourcesPage />} />
            <Route path="/langganan" element={<SubscriptionPage />} />
            <Route path="*" element={<PlaceholderPage title="Halaman tidak ditemukan" task="404" />} />
          </Routes>
        </Suspense>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}
