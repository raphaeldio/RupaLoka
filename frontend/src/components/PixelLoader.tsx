/**
 * Pemuat bergaya piksel: adegan kecil (matahari, awan, rumah, tunas) dan empat blok warna
 * Rupaloka yang "bernapas" bergantian. Gerak blok mati bila `prefers-reduced-motion`.
 */
export default function PixelLoader({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`} aria-busy="true">
      <div className="pemuat-dunia" aria-hidden="true">
        <span className="pemuat-matahari" />
        <span className="pemuat-awan" />
        <span className="pemuat-rumah" />
        <span className="pemuat-tunas" />
        <span className="pemuat-tanah" />
      </div>
      <div className="pemuat-blok" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <p role="status" className="text-sm font-bold text-teal">
        {label}
      </p>
    </div>
  )
}
