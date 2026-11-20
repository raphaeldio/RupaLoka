import { useOutletContext } from 'react-router-dom'
import type { CityDetail } from '../../lib/api.types'

/** Konten kota untuk halaman anak CityLayout (path, titik, game). */
export const useCity = () => useOutletContext<CityDetail>()
