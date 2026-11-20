import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import AboutPage from './pages/AboutPage'
import CityFlowPage from './pages/CityFlowPage'
import CollectionPage from './pages/CollectionPage'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import SourcesPage from './pages/SourcesPage'

export default function App() {
  return (
    <BrowserRouter>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kota/:cityId" element={<CityFlowPage />} />
        <Route path="/koleksi" element={<CollectionPage />} />
        <Route path="/tentang" element={<AboutPage />} />
        <Route path="/sumber" element={<SourcesPage />} />
        <Route path="*" element={<PlaceholderPage title="Halaman tidak ditemukan" task="404" />} />
      </Routes>
    </BrowserRouter>
  )
}
