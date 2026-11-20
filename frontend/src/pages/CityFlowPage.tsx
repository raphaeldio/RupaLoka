import { useParams } from 'react-router-dom'
import { bundledCities } from '../lib/cities'
import PlaceholderPage from './PlaceholderPage'

export default function CityFlowPage() {
  const { cityId } = useParams()
  const city = bundledCities.find((c) => c.id === cityId)
  if (!city) return <PlaceholderPage title="Kota tidak ditemukan" task="periksa content/cities.yaml" />
  if (city.status !== 'active') return <PlaceholderPage title={`${city.name}: segera hadir`} task="F-002" />
  return <PlaceholderPage title={`Jelajah ${city.name}`} task="alur kuis → materi → game, T-040" />
}
