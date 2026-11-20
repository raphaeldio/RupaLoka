import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import CityFlowPage from './pages/CityFlowPage'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kota/:cityId" element={<CityFlowPage />} />
        <Route path="/koleksi" element={<PlaceholderPage title="Koleksi" task="T-045" />} />
        <Route path="/tentang" element={<PlaceholderPage title="Tentang Rupaloka" task="T-045" />} />
        <Route path="/sumber" element={<PlaceholderPage title="Sumber dan atribusi" task="T-045" />} />
        <Route path="*" element={<PlaceholderPage title="Halaman tidak ditemukan" task="404" />} />
      </Routes>
    </BrowserRouter>
  )
}
